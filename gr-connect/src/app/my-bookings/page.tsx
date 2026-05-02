"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";

interface Booking {
  id: string;
  seekerId: string;
  expertId: string;
  expertName: string;
  expertPhoto: string;
  seekerName: string;
  seekerPhoto: string;
  seekerEmail?: string;
  expertEmail?: string;
  date: string;
  time: string;
  note: string;
  meetLink: string;
  status: "pending" | "confirmed" | "upcoming" | "completed" | "cancelled";
  createdAt: { seconds: number } | null;
}

type Tab = "pending" | "upcoming" | "all";

function statusBadge(status: Booking["status"]) {
  if (status === "pending") return "bg-amber-100 text-amber-700";
  if (status === "confirmed" || status === "upcoming") return "bg-green-100 text-green-700";
  if (status === "completed") return "bg-clay-muted/40 text-charcoal/60";
  return "bg-red-100 text-red-600";
}

function statusLabel(status: Booking["status"]) {
  if (status === "pending") return "Pending";
  if (status === "confirmed" || status === "upcoming") return "Confirmed";
  if (status === "completed") return "Completed";
  return "Cancelled";
}

async function createRealMeetLink(booking: Booking): Promise<string> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // If emails missing from booking doc, fetch them from users collection
  let expertEmail = booking.expertEmail || "";
  let seekerEmail = booking.seekerEmail || "";
  if (!expertEmail || !seekerEmail) {
    const { getDoc, doc } = await import("firebase/firestore");
    const { db } = await import("@/lib/firebase");
    if (!expertEmail && booking.expertId) {
      const snap = await getDoc(doc(db, "users", booking.expertId));
      expertEmail = snap.data()?.email || "";
    }
    if (!seekerEmail && booking.seekerId) {
      const snap = await getDoc(doc(db, "users", booking.seekerId));
      seekerEmail = snap.data()?.email || "";
    }
  }
  console.log("[Meet] expertEmail:", expertEmail, "seekerEmail:", seekerEmail);

  const res = await fetch(`${apiUrl}/api/v1/meetings/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      booking_id: booking.id,
      expert_name: booking.expertName,
      seeker_name: booking.seekerName,
      expert_email: expertEmail,
      seeker_email: seekerEmail,
      date: booking.date,
      time: booking.time,
      note: booking.note || "",
    }),
  });
  if (!res.ok) throw new Error("Meet creation failed");
  const data = await res.json();
  return data.meet_link;
}

export default function MyBookingsPage() {
  const { user, profile, isLoggedIn, loading: authLoading } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isExpert = profile?.role === "expert";

  useEffect(() => {
    if (!authLoading && !isLoggedIn) router.replace("/login");
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    if (!user) return;

    const field = isExpert ? "expertId" : "seekerId";
    const q = query(
      collection(db, "bookings"),
      where(field, "==", user.uid),
      orderBy("createdAt", "desc"),
    );

    const unsub = onSnapshot(q, (snap) => {
      setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Booking)));
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [user, isExpert]);

  // Default tab for expert = pending (so they see requests first)
  useEffect(() => {
    if (isExpert) setTab("pending");
  }, [isExpert]);

  async function handleAccept(booking: Booking) {
    setActionLoading(booking.id);
    try {
      // 1. Create real Google Calendar event + Meet link
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const meetLink = await createRealMeetLink(booking);

      // 2. Save confirmed status + real Meet link to Firestore
      await updateDoc(doc(db, "bookings", booking.id), {
        status: "confirmed",
        meetLink,
        confirmedAt: serverTimestamp(),
      });

      // 3. Send email via backend (handles missing RESEND_API_KEY gracefully)
      const emailHtml = (name: string) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#3d2b1f">Session Confirmed!</h2>
          <p>Hi ${name},</p>
          <p>Your consultation has been <strong>confirmed</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #eee;border-radius:8px">
            <tr style="background:#faf8f5"><td style="padding:10px 16px;color:#666;font-size:14px">Expert</td><td style="padding:10px 16px;font-weight:600;font-size:14px">${booking.expertName}</td></tr>
            <tr><td style="padding:10px 16px;color:#666;font-size:14px">Date</td><td style="padding:10px 16px;font-weight:600;font-size:14px">${booking.date}</td></tr>
            <tr style="background:#faf8f5"><td style="padding:10px 16px;color:#666;font-size:14px">Time</td><td style="padding:10px 16px;font-weight:600;font-size:14px">${booking.time}</td></tr>
          </table>
          <a href="${meetLink}" style="display:inline-block;background:#8B5E3C;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin:8px 0">
            Join Google Meet →
          </a>
          <p style="margin-top:12px;color:#888;font-size:13px">Or copy the link: ${meetLink}</p>
          <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
          <p style="color:#aaa;font-size:12px">GR Connect — Research Consultation Platform</p>
        </div>
      `;

      const recipients: { to: string; name: string }[] = [];
      if (booking.seekerEmail) recipients.push({ to: booking.seekerEmail, name: booking.seekerName });
      if (booking.expertEmail) recipients.push({ to: booking.expertEmail, name: booking.expertName });

      for (const r of recipients) {
        fetch(`${apiUrl}/api/v1/meetings/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: [r.to],
            subject: `Session Confirmed — ${booking.date} at ${booking.time}`,
            html: emailHtml(r.name),
          }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Accept booking error:", err);
      // If Meet creation fails, still confirm the booking so expert can share link manually
      await updateDoc(doc(db, "bookings", booking.id), {
        status: "confirmed",
        meetLink: "",
        confirmedAt: serverTimestamp(),
      }).catch(() => {});
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(bookingId: string) {
    setActionLoading(bookingId);
    try {
      await updateDoc(doc(db, "bookings", bookingId), { status: "cancelled" });
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleGenerateMeetLink(booking: Booking) {
    setActionLoading(booking.id);
    try {
      const meetLink = await createRealMeetLink(booking);
      await updateDoc(doc(db, "bookings", booking.id), { meetLink });

      // Send email with meet link to both participants
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const emailHtml = (name: string) => `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#3d2b1f">Your Meeting Link is Ready</h2>
          <p>Hi ${name},</p>
          <p>Your consultation has been confirmed and the meeting link is ready.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;border:1px solid #eee;border-radius:8px">
            <tr style="background:#faf8f5"><td style="padding:10px 16px;color:#666;font-size:14px">Expert</td><td style="padding:10px 16px;font-weight:600;font-size:14px">${booking.expertName}</td></tr>
            <tr><td style="padding:10px 16px;color:#666;font-size:14px">Date</td><td style="padding:10px 16px;font-weight:600;font-size:14px">${booking.date}</td></tr>
            <tr style="background:#faf8f5"><td style="padding:10px 16px;color:#666;font-size:14px">Time</td><td style="padding:10px 16px;font-weight:600;font-size:14px">${booking.time}</td></tr>
          </table>
          <a href="${meetLink}" style="display:inline-block;background:#8B5E3C;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin:8px 0">
            Join Google Meet →
          </a>
          <p style="margin-top:12px;color:#888;font-size:13px">Or copy: ${meetLink}</p>
          <hr style="margin:24px 0;border:none;border-top:1px solid #eee"/>
          <p style="color:#aaa;font-size:12px">GR Connect — Research Consultation Platform</p>
        </div>
      `;

      const recipients: { to: string; name: string }[] = [];
      if (booking.seekerEmail) recipients.push({ to: booking.seekerEmail, name: booking.seekerName });
      if (booking.expertEmail) recipients.push({ to: booking.expertEmail, name: booking.expertName });

      for (const r of recipients) {
        fetch(`${apiUrl}/api/v1/meetings/send-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: [r.to],
            subject: `Meeting Link — ${booking.date} at ${booking.time}`,
            html: emailHtml(r.name),
          }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Meet link generation error:", err);
    } finally {
      setActionLoading(null);
    }
  }

  if (authLoading || !user) return null;

  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  const displayed = (() => {
    if (tab === "pending") return bookings.filter((b) => b.status === "pending");
    if (tab === "upcoming") return bookings.filter((b) => b.status === "confirmed" || b.status === "upcoming");
    return bookings;
  })();

  const tabs: { key: Tab; label: string; count?: number }[] = isExpert
    ? [
        { key: "pending", label: "Requests", count: pendingCount },
        { key: "upcoming", label: "Confirmed" },
        { key: "all", label: "All" },
      ]
    : [
        { key: "pending", label: "Pending" },
        { key: "upcoming", label: "Upcoming" },
        { key: "all", label: "All" },
      ];

  return (
    <div className="min-h-screen bg-cream-bg">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold text-charcoal">
            {isExpert ? "Booking Requests" : "My Bookings"}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {isExpert ? "Accept or decline session requests from seekers" : "Your scheduled consultations"}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-clay-muted/20 rounded-xl p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                tab === t.key ? "bg-white text-charcoal shadow-sm" : "text-text-muted hover:text-charcoal"
              }`}
            >
              {t.label}
              {t.count != null && t.count > 0 && (
                <span className="w-5 h-5 rounded-full bg-warm-brown text-white text-[10px] font-bold flex items-center justify-center">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-clay-muted/40 p-6 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-clay-muted/30" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-clay-muted/30 rounded w-40" />
                    <div className="h-3 bg-clay-muted/20 rounded w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && displayed.length === 0 && (
          <div className="text-center py-20">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-warm-brown/10 flex items-center justify-center text-warm-brown">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h2 className="font-serif text-xl font-semibold text-charcoal mb-2">
              {tab === "pending" ? (isExpert ? "No pending requests" : "No pending bookings") :
               tab === "upcoming" ? "No upcoming sessions" : "No bookings yet"}
            </h2>
            <p className="text-sm text-text-muted mb-6">
              {tab === "pending" && isExpert ? "Booking requests from seekers will appear here." :
               tab === "upcoming" ? "Your confirmed sessions will appear here." :
               "Book a session with an expert to get started."}
            </p>
            {!isExpert && (
              <Link
                href="/discover"
                className="px-6 py-2.5 bg-warm-brown text-white text-sm font-medium rounded-full hover:bg-warm-brown-dark transition-colors"
              >
                Find Experts
              </Link>
            )}
          </div>
        )}

        <div className="space-y-4">
          {displayed.map((booking, i) => {
            const otherName = isExpert ? booking.seekerName : booking.expertName;
            const otherPhoto = isExpert ? booking.seekerPhoto : booking.expertPhoto;
            const isPending = booking.status === "pending";
            const isConfirmed = booking.status === "confirmed" || booking.status === "upcoming";

            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-white rounded-xl border shadow-sm ${isPending ? "border-amber-200" : "border-clay-muted/40"}`}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    {otherPhoto ? (
                      <img src={otherPhoto} alt={otherName} className="w-12 h-12 rounded-full object-cover border border-warm-brown/20 shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-warm-brown/20 flex items-center justify-center text-warm-brown font-semibold shrink-0">
                        {otherName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <h3 className="font-medium text-charcoal">{otherName}</h3>
                          <p className="text-sm text-text-muted mt-0.5">
                            {booking.date} · {booking.time} · 30 min
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadge(booking.status)}`}>
                          {statusLabel(booking.status)}
                        </span>
                      </div>

                      {booking.note && (
                        <p className="text-sm text-charcoal/70 mt-2 italic bg-cream-bg px-3 py-2 rounded-lg">
                          &ldquo;{booking.note}&rdquo;
                        </p>
                      )}

                      {/* Expert actions for pending */}
                      {isExpert && isPending && (
                        <div className="flex items-center gap-3 mt-4">
                          <button
                            onClick={() => handleAccept(booking)}
                            disabled={actionLoading === booking.id}
                            className="flex-1 py-2.5 bg-warm-brown text-white text-sm font-semibold rounded-full hover:bg-warm-brown-dark transition-colors disabled:opacity-50"
                          >
                            {actionLoading === booking.id ? "Confirming..." : "Accept & Confirm"}
                          </button>
                          <button
                            onClick={() => handleReject(booking.id)}
                            disabled={actionLoading === booking.id}
                            className="flex-1 py-2.5 border border-red-200 text-red-600 text-sm font-semibold rounded-full hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </div>
                      )}

                      {/* Seeker pending notice */}
                      {!isExpert && isPending && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                          </svg>
                          Waiting for the expert to accept your request
                        </div>
                      )}

                      {/* Meet link + actions for confirmed */}
                      {isConfirmed && (
                        <div className="flex items-center gap-3 mt-4 flex-wrap">
                          {booking.meetLink ? (
                            <a
                              href={booking.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-warm-brown text-white text-xs font-semibold rounded-full hover:bg-warm-brown-dark transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
                              </svg>
                              Join Meet
                            </a>
                          ) : (
                            <span className="text-xs text-text-muted italic">Meet link being generated...</span>
                          )}
                          <Link
                            href={`/booking/confirm?id=${booking.id}`}
                            className="text-xs font-medium text-warm-brown hover:underline"
                          >
                            View Details
                          </Link>
                        </div>
                      )}

                      {/* Cancelled */}
                      {booking.status === "cancelled" && (
                        <p className="text-xs text-red-500 mt-3">This session was declined.</p>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
