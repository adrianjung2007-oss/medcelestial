"use client";

import { useEffect, useRef, useState } from "react";

type Question = { id: string; prompt: string; topic: string };
type Grade = {
  correct: boolean;
  depth: "Gs protein" | "Adenylyl cyclase" | "cAMP" | "PKA" | "MLCK";
  points: number;
  feedback: string;
  idealAnswer: string;
};

const DEPTHS = [
  { name: "Gs protein", points: 10, label: "Shallow" },
  { name: "Adenylyl cyclase", points: 25, label: "Deeper" },
  { name: "cAMP", points: 50, label: "Deep" },
  { name: "PKA", points: 75, label: "Very deep" },
  { name: "MLCK", points: 100, label: "Deepest" },
];

export default function Home() {
  const [phase, setPhase] = useState<"intro" | "playing" | "finished">("intro");
  const [question, setQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<Grade | null>(null);
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [seconds, setSeconds] = useState(30);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const usedPrompts = useRef<string[]>([]);

  async function nextQuestion() {
    setLoading(true);
    setAnswer("");
    setGrade(null);
    setSeconds(30);
    try {
      const response = await fetch("/api/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ previousPrompts: usedPrompts.current }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error();
      usedPrompts.current.push(data.prompt);
      setQuestion(data);
    } catch {
      setQuestion({
        id: "fallback",
        topic: "Gs protein",
        prompt: "Explain how a Gs-coupled receptor produces an intracellular signaling response.",
      });
    } finally {
      setLoading(false);
    }
  }

  function start() {
    setIndex(0);
    setScore(0);
    setPhase("playing");
  }

  useEffect(() => {
    if (phase === "playing" && !question && !loading) void nextQuestion();
  }, [phase, question, loading]);

  useEffect(() => {
    if (phase !== "playing" || !question || grade) return;
    timer.current = setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          if (timer.current) clearInterval(timer.current);
          void submitAnswer(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [phase, question, grade]);

  async function submitAnswer(timedOut = false) {
    if (!question || grade || loading) return;
    if (!timedOut && !answer.trim()) return;
    setLoading(true);
    if (timer.current) clearInterval(timer.current);
    try {
      const response = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: question.prompt,
          answer: timedOut ? "" : answer,
          timedOut,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error();
      setGrade(data);
      setScore((current) => current + data.points);
    } catch {
      setGrade({
        correct: false,
        depth: "Gs protein",
        points: 0,
        feedback: "The answer could not be graded.",
        idealAnswer: "Review the Gs-cAMP-PKA signaling sequence.",
      });
    } finally {
      setLoading(false);
    }
  }

  function advance() {
    if (index >= 6) {
      setPhase("finished");
      setQuestion(null);
      setGrade(null);
      return;
    }
    setIndex((current) => current + 1);
    setQuestion(null);
  }

  if (phase === "intro") {
    return (
      <main className="intro-page">
        <div className="brand">medcelestial</div>
        <div className="intro-copy">
          <p className="eyebrow">Cell signaling challenge</p>
          <h1>Dive into<br /><em>the pathway.</em></h1>
          <p>Seven open-ended questions. Thirty seconds each. The rarer your answer, the deeper you sink.</p>
          <button className="primary" onClick={start}>Start dive <span>→</span></button>
        </div>
        <div className="depth-preview">
          {DEPTHS.map((depth) => (
            <div key={depth.name}>
              <span>{depth.points}</span>
              <b>{depth.name}</b>
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (phase === "finished") {
    const depthIndex = score >= 600 ? 4 : score >= 400 ? 3 : score >= 250 ? 2 : score >= 100 ? 1 : 0;
    return (
      <main className="intro-page">
        <div className="brand">medcelestial</div>
        <section className="result">
          <p className="eyebrow">Dive complete</p>
          <h1>{score} points</h1>
          <div className="result-depth">
            <span>{DEPTHS[depthIndex].name}</span>
            <b>{DEPTHS[depthIndex].label}</b>
          </div>
          <button className="primary" onClick={() => { usedPrompts.current = []; setPhase("intro"); setQuestion(null); setGrade(null); }}>
            Dive again <span>↻</span>
          </button>
        </section>
      </main>
    );
  }

  const depthIndex = grade ? DEPTHS.findIndex((depth) => depth.name === grade.depth) : 0;
  const visualDepth = grade ? depthIndex : 0;

  return (
    <main className="game-page">
      <header>
        <div className="mini-brand">MC</div>
        <div className="progress">{[0,1,2,3,4,5,6].map((dot) => <i key={dot} className={dot === index ? "active" : dot < index ? "passed" : ""} />)}</div>
        <div className="score"><span>Score</span><strong>{score}</strong></div>
      </header>

      <section className={`game-card depth-${visualDepth}`}>
        <div className="sink-layer" style={{ "--depth": `${visualDepth * 18}%` } as React.CSSProperties} />
        <div className="question-meta">
          <span>{index + 1} / 7</span>
          {grade && <span className={`points depth-${depthIndex}`}>+{grade.points} points · {grade.depth}</span>}
        </div>
        <div className="timer"><strong>{seconds}</strong><span>sec</span></div>

        {loading && !grade ? (
          <div className="loading">Preparing question…</div>
        ) : question ? (
          <>
            <h2>{question.prompt}</h2>
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Type your answer..."
              disabled={Boolean(grade)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void submitAnswer();
              }}
            />
            {!grade ? (
              <button className="submit" onClick={() => void submitAnswer()} disabled={!answer.trim()}>Submit answer <span>↵</span></button>
            ) : (
              <div className="feedback">
                <p><strong>{grade.correct ? "Correct" : "Not enough"}</strong> · {grade.feedback}</p>
                <p className="ideal"><span>Ideal answer</span>{grade.idealAnswer}</p>
                <button className="submit" onClick={advance}>{index >= 6 ? "See results" : "Next question"} <span>→</span></button>
              </div>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}
