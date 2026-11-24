export async function POST(request: Request) {
  const { previousPrompts = [] } = await request.json().catch(() => ({ previousPrompts: [] }));
  const apiKey = process.env.DEEPSEEK_API_KEY;

  const fallback = [
    "Name a disease starting with P.",
    "Name a part of the heart.",
    "Name an antibiotic.",
  ];
  if (!apiKey) {
    const prompt = fallback.find((item) => !previousPrompts.includes(item)) || fallback[0];
    return Response.json({ id: crypto.randomUUID(), topic: "medicine", prompt });
  }
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Generate one short, open-ended medical trivia question that accepts many possible answers. Use formats such as: name a disease, drug, anatomy structure, bacterium, virus, parasite, syndrome, procedure, test, vitamin, or medical eponym. Keep the question to one sentence and avoid definitions, explanations, multiple choice, and the Gs-cAMP-PKA pathway. Each question must allow common and obscure valid answers. Return exactly JSON with prompt (string) and topic (string).",
        },
        {
          role: "user",
          content: `Avoid these previous prompts: ${JSON.stringify(previousPrompts)}.`,
        },
      ],
    }),
  });
  if (!response.ok) return Response.json({ error: "Question generation failed" }, { status: 502 });
  const data = await response.json();
  try {
    const question = JSON.parse(data.choices[0].message.content);
    return Response.json({ id: crypto.randomUUID(), topic: question.topic || "medicine", prompt: question.prompt });
  } catch {
    return Response.json({ error: "Question generation failed" }, { status: 502 });
  }
}
