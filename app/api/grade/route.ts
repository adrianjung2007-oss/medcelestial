export async function POST(request: Request) {
  const { prompt, answer, timedOut } = await request.json();
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return Response.json({
      correct: false,
      depth: "Gs protein",
      points: 0,
      feedback: "Add DEEPSEEK_API_KEY to enable answer grading.",
      idealAnswer: "DeepSeek grading is unavailable.",
    });
  }
  if (timedOut || !answer?.trim()) {
    return Response.json({
      correct: false,
      depth: "Gs protein",
      points: 0,
      feedback: "Time expired before an answer was submitted.",
      idealAnswer: "No answer was submitted.",
    });
  }

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Grade a single medical trivia answer. First verify it is a genuine, medically valid answer to the question. Then grade rarity by real-world familiarity, not difficulty of spelling: Gs protein = 10 points for a very common answer, Adenylyl cyclase = 25 for an above-common answer, cAMP = 50 for an uncommon answer, PKA = 75 for a rare answer, MLCK = 100 for an exceptionally rare or highly specialized answer. Return exactly JSON with correct (boolean), depth (one of Gs protein, Adenylyl cyclase, cAMP, PKA, MLCK), points (10,25,50,75,or100), feedback (string), idealAnswer (string). If invalid or irrelevant, return correct=false, depth=Gs protein, and points=0. Never award rarity points for a made-up or non-medical answer.",
        },
        { role: "user", content: JSON.stringify({ prompt, answer }) },
      ],
    }),
  });
  if (!response.ok) return Response.json({ error: "Grading failed" }, { status: 502 });
  const data = await response.json();
  try {
    const grade = JSON.parse(data.choices[0].message.content);
    const allowedDepths = ["Gs protein", "Adenylyl cyclase", "cAMP", "PKA", "MLCK"];
    const pointsByDepth: Record<string, number> = {
      "Gs protein": 10,
      "Adenylyl cyclase": 25,
      "cAMP": 50,
      "PKA": 75,
      "MLCK": 100,
    };
    if (!allowedDepths.includes(grade.depth)) throw new Error();
    grade.points = grade.correct ? pointsByDepth[grade.depth] : 0;
    return Response.json(grade);
  } catch {
    return Response.json({ error: "Grading failed" }, { status: 502 });
  }
}
