export async function POST(request: Request) {
  const { prompt, answer, timedOut } = await request.json();
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return Response.json({
      correct: false,
      depth: "Gs protein",
      points: 0,
      feedback: "Add DEEPSEEK_API_KEY to enable answer grading.",
      idealAnswer: "The Gs-cAMP-PKA pathway should be explained in sequence.",
    });
  }
  if (timedOut || !answer?.trim()) {
    return Response.json({
      correct: false,
      depth: "Gs protein",
      points: 0,
      feedback: "Time expired before an answer was submitted.",
      idealAnswer: "A complete answer would explain the relevant signaling mechanism.",
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
            "Grade a user's open-ended answer scientifically. Return exactly JSON: correct (boolean), depth (one of Gs protein, Adenylyl cyclase, cAMP, PKA, MLCK), points (10,25,50,75,or100), feedback (string), idealAnswer (string). 10 for a basic Gs/receptor answer. 25 for adenylyl cyclase. 50 for cAMP and PKA activation. 75 for downstream PKA substrate/transcription mechanisms. 100 for the deepest integrative mechanism, such as MLCK regulation or exception-level signaling detail. Give 0 points only if substantially incorrect or irrelevant, but if 0, use depth Gs protein.",
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
