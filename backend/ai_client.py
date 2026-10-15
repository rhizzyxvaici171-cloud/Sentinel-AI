"""
ai_client.py
Wrapper around the Groq API (OpenAI-compatible, free tier — no card
required). Keeps prompt construction in one place and ensures the model
only ever sees a compact summary of the log data, not the raw file.

Swapping providers later (e.g. back to Claude, or to Gemini) only means
changing this file — main.py and the frontend don't need to change.
"""

import os
import json
from groq import Groq

MODEL = "openai/gpt-oss-120b"

_client = None


def get_client():
    global _client
    if _client is None:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY is not set. Add it to backend/.env "
                "(copy .env.example to .env and paste your free key from "
                "console.groq.com)."
            )
        _client = Groq(api_key=api_key)
    return _client


ANOMALY_SYSTEM_PROMPT = """You are a security analyst assistant reviewing summarized log statistics \
(not raw logs). Given aggregate stats about authentication events, identify likely security \
anomalies. Focus on brute-force patterns, credential stuffing, unusual user enumeration, and \
suspicious IP concentration. Be concise and concrete.

Respond ONLY with valid JSON, no markdown fences, no preamble, in this exact shape:
{
  "summary": "one or two sentence overall assessment",
  "anomalies": [
    {
      "severity": "critical" | "high" | "medium" | "low",
      "title": "short title",
      "description": "1-2 sentence explanation referencing specific IPs/users/counts from the data",
      "source_ip": "ip address if applicable, else null",
      "recommended_action": "short actionable recommendation"
    }
  ]
}
If nothing suspicious stands out, return an empty anomalies array and say so in the summary."""


def analyze_log_summary(summary: dict) -> dict:
    client = get_client()
    completion = client.chat.completions.create(
        model=MODEL,
        max_tokens=1500,
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": ANOMALY_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Here is the aggregate log summary:\n\n{json.dumps(summary, indent=2)}",
            },
        ],
    )
    text = completion.choices[0].message.content.strip()
    text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            "summary": "Model returned a non-JSON response; showing raw output.",
            "anomalies": [],
            "raw_response": text,
        }


CHAT_SYSTEM_PROMPT = """You are a security analyst assistant. You are given aggregate statistics \
about a log file and a short list of the most relevant raw log lines for the user's question. \
Answer the user's question directly and specifically, citing IPs/users/counts where relevant. \
If the data provided doesn't contain the answer, say so plainly rather than guessing."""


def answer_question(question: str, summary: dict, relevant_lines: list[str]) -> str:
    client = get_client()
    context = (
        f"AGGREGATE SUMMARY:\n{json.dumps(summary, indent=2)}\n\n"
        f"RELEVANT LOG LINES (up to 30):\n" + "\n".join(relevant_lines[:30])
    )
    completion = client.chat.completions.create(
        model=MODEL,
        max_tokens=800,
        temperature=0.3,
        messages=[
            {"role": "system", "content": CHAT_SYSTEM_PROMPT},
            {"role": "user", "content": f"{context}\n\nQUESTION: {question}"},
        ],
    )
    return completion.choices[0].message.content.strip()
