# SentinelAI — AI-Powered Security Log Analyzer

A full-stack system that parses authentication logs, uses an LLM to detect
security anomalies (brute-force attempts, credential stuffing, suspicious
user enumeration), and answers natural-language questions about what
happened — with an n8n workflow on top that automates the whole pipeline.

Runs on Groq's free API tier (Llama 3.3 70B) — no card required, no cost.

## Architecture

```
React (Vite)  ──────►  FastAPI backend  ──────►  Groq API (Llama 3.3 70B)
   dashboard              /api/upload             (anomaly detection
   + chat UI              /api/analyze              + Q&A, grounded in
                          /api/chat                  parsed log data)

n8n (local)  ──────►  same FastAPI endpoints  ──────►  alert routing
  watches for              (upload → analyze)           (Slack/email/etc,
  new log files                                          extend as needed)
```

Why it's built this way, in one sentence each:
- **The backend never sends the model the raw log.** It parses events
  locally, computes aggregate stats (counts per IP/user, burst detection),
  and sends *that* to the model — keeping cost/latency low and demonstrating
  real context management rather than "dump the file into the prompt."
- **Chat answers are grounded**, not free-floating: the backend does a
  lightweight keyword filter over the parsed events to pull the log lines
  relevant to the question, and passes those alongside the aggregate summary.
- **Provider swap is isolated to one file.** All model calls live in
  `backend/ai_client.py`; `main.py` and the frontend never talk to the AI
  provider directly. Currently wired to Groq's free tier — moving to a
  different provider later means editing this one file only.
- **n8n sits on top, not underneath.** The core intelligence (parsing,
  anomaly detection, chat) is code you own. n8n automates *triggering* that
  system and routing its output — e.g., watch a folder, call the API,
  alert on critical findings — without you having to build a scheduler/queue
  from scratch.

## 1. Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# get a free key at console.groq.com (no card required), then edit .env:
# GROQ_API_KEY=YOUR_GROQ_API_KEY
uvicorn main:app --reload --port 8000
```

Confirm it's up: `curl http://localhost:8000/api/health`

## 2. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## 3. Try it

1. Upload `sample-data/auth.log` (included — a realistic SSH auth log with
   two brute-force IPs and normal traffic mixed in).
2. Watch the dashboard populate: event counts, a timeline chart, and a
   flagged brute-force warning before you even click anything.
3. Click **Run AI anomaly scan** — the model reviews the aggregate stats and
   returns severity-ranked findings with recommended actions.
4. Ask the chat panel something like *"Which IP made the most failed
   attempts?"* or *"Summarize what happened in plain English."*

## 4. n8n automation layer

1. Open your local n8n instance.
2. **Import** → select `n8n/sentinelai-workflow.json`.
3. The workflow: a webhook receives a log file → forwards it to
   `/api/upload` → triggers `/api/analyze` → branches on whether any
   critical/high severity findings came back → builds an alert message
   (wire this into a Slack/Email/Discord node to actually send it — the
   workflow leaves that connection point ready) or just responds with the
   findings if everything's clean.
4. To trigger it: `POST` a log file to the webhook's URL (n8n shows this
   once the workflow is active), or configure n8n's **Local File Trigger**
   node to watch a folder and feed it in automatically.

The AI system is fully
yours end-to-end, and n8n demonstrates you can also wire it into an
automated, production-style pipeline without writing glue-code infrastructure
from scratch.

## Project structure

```
sentinelai/
├── backend/
│   ├── main.py            # FastAPI app + endpoints
│   ├── log_parser.py      # log parsing + stats
│   ├── ai_client.py         # Groq API calls (analysis + chat)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── Sidebar.jsx    # upload + telemetry stats
│       ├── Timeline.jsx   # event volume chart
│       ├── AnomalyList.jsx
│       └── ChatPanel.jsx
├── n8n/
│   └── sentinelai-workflow.json
└── sample-data/
    └── auth.log           # realistic demo log with planted anomalies
```

## Extending it (good talking points if asked "what would you add next?")

- Swap in-memory state for a real datastore (Postgres) to support multiple
  concurrent logs / users
- Stream the model's analysis token-by-token instead of waiting for the full
  JSON response
- Add a vector store for true RAG over very large logs instead of the
  keyword-filter approach used here
- Wire the n8n alert branch into Slack/PagerDuty for real incident response
