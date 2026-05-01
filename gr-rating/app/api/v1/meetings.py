"""
POST /api/v1/meetings/create
Creates a Google Calendar event with a real Meet link via user OAuth refresh token.
POST /api/v1/meetings/send-email
Sends booking confirmation email via Resend.
"""
import os
import logging
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/meetings", tags=["meetings"])


# ---------------------------------------------------------------------------
# Meet link creation via Google Calendar API
# ---------------------------------------------------------------------------

class CreateMeetingRequest(BaseModel):
    booking_id: str
    expert_name: str
    seeker_name: str
    expert_email: str = ""
    seeker_email: str = ""
    date: str   # e.g. "Fri, May 2, 2025"
    time: str   # e.g. "09:00 AM"
    note: str = ""


def _parse_datetime(date_str: str, time_str: str) -> datetime:
    """Parse 'Fri, May 2, 2025' + '09:00 AM' into a UTC datetime."""
    combined = f"{date_str} {time_str}"
    for fmt in ["%a, %b %d, %Y %I:%M %p", "%a, %B %d, %Y %I:%M %p"]:
        try:
            dt = datetime.strptime(combined, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return datetime.now(timezone.utc) + timedelta(hours=1)


@router.post("/create")
async def create_meeting(body: CreateMeetingRequest):
    """Create a Google Calendar event with Meet link using OAuth refresh token."""
    client_id = os.environ.get("GOOGLE_OAUTH_CLIENT_ID")
    client_secret = os.environ.get("GOOGLE_OAUTH_CLIENT_SECRET")
    refresh_token = os.environ.get("GOOGLE_OAUTH_REFRESH_TOKEN")
    calendar_email = os.environ.get("GOOGLE_CALENDAR_EMAIL", "primary")

    if not all([client_id, client_secret, refresh_token]):
        raise HTTPException(status_code=503, detail="Google Calendar OAuth not configured")

    try:
        import httpx

        # Step 1: Exchange refresh token for access token
        async with httpx.AsyncClient(timeout=10) as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
        if not token_resp.is_success:
            raise Exception(f"Token refresh failed: {token_resp.text}")
        access_token = token_resp.json()["access_token"]

        async with httpx.AsyncClient(timeout=15) as client:
            headers = {"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"}

            # Step 2: Create Meet space
            space_resp = await client.post("https://meet.googleapis.com/v2/spaces", headers=headers, json={})
            if not space_resp.is_success:
                raise Exception(f"Meet API error {space_resp.status_code}: {space_resp.text}")

            space_data = space_resp.json()
            meet_link = space_data.get("meetingUri", "")
            space_name = space_data.get("name", "")
            if not meet_link:
                raise Exception("No meetingUri in Meet API response")

            # Step 3: Set accessType=OPEN so everyone joins directly without "ask to join"
            patch_resp = await client.patch(
                f"https://meet.googleapis.com/v2/{space_name}",
                params={"updateMask": "config.accessType"},
                headers=headers,
                json={"config": {"accessType": "OPEN"}},
            )
            if patch_resp.is_success:
                logger.info(f"Meet space set to OPEN: {space_name}")
            else:
                logger.warning(f"Could not set accessType: {patch_resp.text}")

            # Step 4: Create Calendar event with the Meet link for email invites
            start_dt = _parse_datetime(body.date, body.time)
            end_dt = start_dt + timedelta(minutes=30)
            attendees = []
            if body.expert_email:
                attendees.append({"email": body.expert_email})
            if body.seeker_email:
                attendees.append({"email": body.seeker_email})

            event = {
                "summary": f"GR Connect: {body.expert_name} × {body.seeker_name}",
                "description": body.note or f"Consultation booked via GR Connect (booking #{body.booking_id})",
                "start": {"dateTime": start_dt.isoformat(), "timeZone": "UTC"},
                "end": {"dateTime": end_dt.isoformat(), "timeZone": "UTC"},
                "attendees": attendees,
                "conferenceData": {
                    "conferenceSolution": {"key": {"type": "hangoutsMeet"}},
                    "entryPoints": [{"entryPointType": "video", "uri": meet_link}],
                    "conferenceId": space_name.split("/")[-1],
                },
            }
            cal_resp = await client.post(
                f"https://www.googleapis.com/calendar/v3/calendars/{calendar_email}/events",
                params={"conferenceDataVersion": "1"},
                headers=headers,
                json=event,
            )
            if not cal_resp.is_success:
                logger.warning(f"Calendar event creation failed: {cal_resp.text}")

        return {"meet_link": meet_link, "event_id": space_name}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Calendar API error: {e}")
        raise HTTPException(status_code=500, detail=f"Calendar error: {str(e)}")


# ---------------------------------------------------------------------------
# Email notifications
# ---------------------------------------------------------------------------

class SendEmailRequest(BaseModel):
    to: list[str]
    subject: str
    html: str


@router.post("/send-email")
async def send_email(body: SendEmailRequest):
    """Send email via Resend."""
    resend_key = os.environ.get("RESEND_API_KEY")
    if not resend_key:
        logger.warning("RESEND_API_KEY not set — skipping email")
        return {"ok": True, "skipped": True}

    import httpx
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
            json={
                "from": os.environ.get("RESEND_FROM_EMAIL", "GR Connect <onboarding@resend.dev>"),
                "to": body.to,
                "subject": body.subject,
                "html": body.html,
            },
        )
    if not resp.is_success:
        logger.error(f"Resend error {resp.status_code}: {resp.text}")
        raise HTTPException(status_code=502, detail="Email delivery failed")
    return {"ok": True}
