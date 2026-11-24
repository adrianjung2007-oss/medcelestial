export async function POST(request: Request) {
  const { previousPrompts = [] } = await request.json().catch(() => ({ previousPrompts: [] }));
  const apiKey = process.env.DEEPSEEK_API_KEY;

  const fallback = [
    "Explain how a Gs-coupled receptor activates adenylyl cyclase.",
    "Describe the role of cAMP in activating PKA.",
    "Explain how PKA can regulate cellular transcription.",
  ];
  if (!apiKey) {
    const prompt = fallback.find((item) => !previousPrompts.includes(item)) || fallback[0];
    return Response.json({ id: crypto.randomUUID(), topic: "cell signaling", prompt });
  }

  const topics = ["Gs protein", "adenylyl cyclase", "cAMP", "PKA", "MLCK"];
  const topic = topics[previousPrompts.length % topics.length];
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
            "Generate one open-ended medical/biology question about the Gs protein to adenylyl cyclase to cAMP to PKA signaling pathway. It should have room for answers at different depths. Avoid multiple choice. Return exactly JSON with prompt (string) and topic (string).",
        },
        {
          role: "user",
          content: `Make the question especially about ${topic}. Avoid these previous prompts: ${JSON.stringify(previousPrompts)}.`,
        },
      ],
    }),
  });
  if (!response.ok) return Response.json({ error: "Question generation failed" }, { status: 502 });
  const data = await response.json();
  try {
    const question = JSON.parse(data.choices[0].message.content);
    return Response.json({ id: crypto.randomUUID(), topic: question.topic || topic, prompt: question.prompt });
  } catch {
    return Response.json({ error: "Question generation failed" }, { status: 502 });
  }
}
