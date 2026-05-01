import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { question, expertName, expertise, publications } = await req.json();

    if (!question?.trim()) {
      return NextResponse.json({ error: "Question required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const prompt = `You are an AI assistant helping users understand the research of ${expertName}, an expert in ${expertise?.join(", ")}. They have ${publications} publications.

Answer the following question concisely and accurately based on their research domain. Keep the response under 120 words, conversational, and helpful.

Question: ${question}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.7 },
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Gemini API error: ${res.status}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response generated.";

    return NextResponse.json({ answer: text });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 });
  }
}
