import { NextRequest, NextResponse } from "next/server";

const GR_PLATFORM_CONTEXT = `
GR Connect is a research networking platform by GR (Global Research). Here is everything you need to know about it:

PLATFORM OVERVIEW:
- GR Connect lets knowledge seekers find and connect with verified researchers and experts
- Researchers get a GR Rating (0–100) based on 5 pillars: Publication Impact, Citation Velocity, Peer Review Activity, SDG Alignment, and Collaboration Index
- GR Tiers: GR-A (top, ~80+), GR-B (~60–79), GR-C (~40–59), GR-D (~20–39), GR-E (below 20)

HOW TO CONNECT WITH AN EXPERT ON GR CONNECT:
1. Visit their profile on GR Connect (you are already on it)
2. Click "Message Expert" on their profile — this opens a direct encrypted chat
3. Or go to grconnect.com → Find Experts → search by name, topic, or institution
4. You can also send a connection request from the Research Hub or their profile
5. Once connected, you can message them, book a session, or collaborate on the hub

HOW TO BOOK A SESSION:
1. On their profile, click "Book a Session"
2. Pick an available time slot from their calendar
3. A Google Meet link is auto-generated and sent to both parties on confirmation
4. Manage all bookings at grconnect.com/my-bookings

RESEARCH HUB:
- A feed where researchers post insights, collaboration calls, snippets, and announcements
- You can react with: Interested (Collab Call), I'll Review (Review Request), Attending (Announcement), Cite (Snippet)
- Bookmark posts, send posts to connections, search by topic or tag
- Access at grconnect.com/hub

GR RATING:
- Score from 0–100 calculated automatically from verified publication data
- Based on: citations, h-index, publication frequency, peer reviews, SDG alignment, collaborations
- Cannot be manually set — it updates as the researcher's work grows
- Claim your researcher profile at grconnect.com/onboarding (choose Researcher/Expert role)

ONBOARDING:
- Seekers: Sign in with Google, select "Knowledge Seeker", fill profile
- Experts/Researchers: Sign in with Google or ORCID, select "Researcher/Expert"
- After onboarding, your GR Rating is computed from your publication record

PRIVACY & MESSAGING:
- All messages on GR Connect are end-to-end encrypted
- You can only message people you are connected with or whose profile you visit
`;

export async function POST(req: NextRequest) {
  try {
    const { messages, expertName, expertise, publications } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const systemPrompt = `You are an AI assistant on GR Connect, helping users understand the research of ${expertName}, an expert in ${expertise?.join(", ") || "research"} with ${publications} publications.

RESPONSE RULES — follow these strictly:
- Be concise: 2–4 short sentences max, or a short numbered list (max 5 items)
- Never use markdown: no **, no ##, no bullet points with -, no headers
- No asterisks, no bold, no italics markers in your text
- When asked how to connect or reach the expert, always refer to GR Connect features only — never suggest ResearchGate, email search, LinkedIn, university websites, or external platforms
- Format lists as: "1. step one  2. step two" on separate lines
- Sound conversational, not like a document
- If you don't know something specific about the expert's research, say so briefly

ABOUT GR CONNECT PLATFORM:
${GR_PLATFORM_CONTEXT}`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_tokens: 250,
        temperature: 0.5,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Groq error:", errBody);
      throw new Error(`Groq API error: ${res.status}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "No response generated.";

    // Strip any remaining markdown formatting the model snuck in
    const clean = text
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/#{1,6}\s/g, "")
      .replace(/^\s*[-•]\s/gm, "")
      .trim();

    return NextResponse.json({ answer: clean });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 });
  }
}
