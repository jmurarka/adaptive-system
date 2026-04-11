# Adaptive Learning System v2

Knowledge-graph-grounded, interview-aware adaptive learning planner.
Five components from the paper, fully implemented.

```
adaptive_learning_system/
├── backend/           Python FastAPI — all 5 components
│   ├── core/
│   │   ├── kg.py          Component 1 — Curriculum Knowledge Graph
│   │   ├── learner.py     Learner state (mastery history, forgetting detection)
│   │   ├── interviewer.py Component 2 — Interview-Driven Mastery Inference
│   │   ├── reasoner.py    Component 3 — Plan-Aware KG Reasoner
│   │   ├── replanner.py   Component 4 — Dynamic Roadmap Replanner
│   │   └── rag.py         Component 5 — RAG Explanation Layer
│   ├── data/
│   │   ├── knowledge_graph.json   20 DSA concepts + prereq graph
│   │   └── question_bank.json     Multi-level questions per concept
│   └── main.py        FastAPI routes + session management
└── frontend/          React + Vite
    └── src/
        ├── components/
        │   ├── KGGraph.jsx        Canvas-based force-layout KG visualiser
        │   ├── InterviewPanel.jsx Multi-question interview + score display
        │   ├── RoadmapPanel.jsx   Dynamic roadmap with replanning alerts
        │   └── MasteryPanel.jsx   Per-concept mastery grid
        └── App.jsx               4-tab shell (Graph / Roadmap / Mastery / Interview)
```

## Quick Start

### 1 — Backend

```bash
cd backend
cp .env.example .env          # paste your GEMINI_API_KEY
pip install -r requirements.txt
python main.py                # → http://localhost:8000
```

System works without an API key (mock mode); Gemini only needed for
real LLM-based interview evaluation and RAG explanations.

### 2 — Frontend

```bash
cd frontend
npm install
npm run dev                   # → http://localhost:3000
```

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET  | `/kg/graph` | Nodes + edges for visualisation |
| GET  | `/kg/roadmap` | Canonical curriculum order |
| GET  | `/learner/{id}` | Full learner snapshot |
| POST | `/learner/{id}/reset` | Reset all mastery |
| POST | `/learner/mastery/update` | Direct score update |
| GET  | `/interview/questions/{concept}` | Fetch interview questions |
| POST | `/interview/evaluate` | Submit answers → mastery update |
| GET  | `/plan/{id}` | Generate/replan personalised roadmap |
| GET  | `/plan/{id}/analysis` | Raw reasoner output |
| POST | `/explain/change` | RAG explanation for a roadmap change |
| GET  | `/explain/concept/{lid}/{cid}` | Full concept explanation |

## Environment

```
GEMINI_API_KEY=...          required for LLM features
GEMINI_MODEL=gemini-1.5-flash
```

## Extending

- **Add concepts**: edit `data/knowledge_graph.json`
- **Add questions**: edit `data/question_bank.json`
- **New domain**: duplicate the JSON files, update `CurriculumKG` path
- **Persistence**: replace `_sessions` dict in `main.py` with MongoDB
