"""
main.py
SentinelAI backend. Exposes:
  POST /api/upload   -> parse a log file, return summary + timeline
  POST /api/analyze  -> run AI anomaly detection on the last uploaded log
  POST /api/chat      -> ask a natural-language question about the last uploaded log
  GET  /api/health    -> simple health check (also used by the n8n workflow)

State is kept in-memory for simplicity (single-user local demo). For a real
deployment this would move to a database / per-session store.
"""

import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from log_parser import parse_log_file, summarize_events, build_timeline
from ai_client import analyze_log_summary, answer_question

app = FastAPI(title="SentinelAI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # local demo only
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- in-memory state (single active log at a time) ---
STATE = {
    "filename": None,
    "events": [],
    "summary": None,
    "timeline": None,
}


class ChatRequest(BaseModel):
    question: str


@app.get("/api/health")
def health():
    return {"status": "ok", "log_loaded": STATE["filename"] is not None}


@app.post("/api/upload")
async def upload_log(file: UploadFile = File(...)):
    raw_bytes = await file.read()
    try:
        text = raw_bytes.decode("utf-8", errors="ignore")
    except Exception:
        raise HTTPException(400, "Could not decode file as text")

    events = parse_log_file(file.filename, text)
    if not events:
        raise HTTPException(
            422,
            "No recognizable log events found. Supported formats: SSH auth.log "
            "style text, or CSV with timestamp/source_ip/user/event_type columns.",
        )

    summary = summarize_events(events)
    timeline = build_timeline(events)

    STATE["filename"] = file.filename
    STATE["events"] = events
    STATE["summary"] = summary
    STATE["timeline"] = timeline

    return {
        "filename": file.filename,
        "summary": summary,
        "timeline": timeline,
        "event_count": len(events),
    }


@app.post("/api/analyze")
def analyze():
    if not STATE["summary"]:
        raise HTTPException(400, "No log uploaded yet. Call /api/upload first.")
    result = analyze_log_summary(STATE["summary"])
    return result


@app.post("/api/chat")
def chat(req: ChatRequest):
    if not STATE["summary"]:
        raise HTTPException(400, "No log uploaded yet. Call /api/upload first.")

    # naive relevance filter: pull lines mentioning any word from the question
    # (an IP, a username, "failed", etc.) so we ground the answer without
    # sending the entire raw log to the model.
    question_lower = req.question.lower()
    keywords = [w.strip(".,?!") for w in question_lower.split() if len(w) > 2]
    relevant = []
    for e in STATE["events"]:
        raw_lower = e["raw"].lower()
        if any(kw in raw_lower for kw in keywords):
            relevant.append(e["raw"])
    if not relevant:
        # fall back to a sample of raw lines so the model has *something* concrete
        relevant = [e["raw"] for e in STATE["events"][:30]]

    answer = answer_question(req.question, STATE["summary"], relevant)
    return {"answer": answer}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
