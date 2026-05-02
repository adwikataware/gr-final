import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { question, expertName, expertise, publications } = await req.json();

    if (!question?.trim()) {
      return NextResponse.json({ error: "Question required" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI not configured" }, { status: 503 });
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant helping users understand the research of ${expertName}, an expert in ${expertise?.join(", ") || "research"}. They have ${publications} publications. Answer questions clearly and helpfully in under 150 words.`,
          },
          {
            role: "user",
            content: question,
          },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Groq error:", errBody);
      throw new Error(`Groq API error: ${res.status}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "No response generated.";

    return NextResponse.json({ answer: text });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json({ error: "Failed to get AI response" }, { status: 500 });
  }
}
