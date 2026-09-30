# 🎓 Athena: Grounded Architecture & Evaluation for Knowledge-Graph-Grounded Adaptive Learning Systems

[![Python 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0+-646CFF.svg)](https://vitejs.dev/)
[![Gemini API](https://img.shields.io/badge/LLM-Gemini_2.5_Flash-8E75B2.svg)](https://deepmind.google/technologies/gemini/)
[![Constraint Validity](https://img.shields.io/badge/Prerequisite_Validity-100%25-brightgreen.svg)]()
[![Root-Cause Recovery](https://img.shields.io/badge/Root--Cause_MRR-1.0000-brightgreen.svg)]()
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> Official implementation and empirical evaluation repository for the research paper: **"Grounded Evaluation and Architecture Revision for Knowledge-Graph-Grounded Adaptive Learning Systems"**.

---

## 📌 Executive Summary

**Athena** is a graph-grounded, interview-aware adaptive learning framework that unifies structured knowledge representations with open-ended conversational evaluation. Rather than relying on ungrounded heuristic roadmaps or unconstrained LLM planning, Athena establishes strict topological prerequisite boundaries over a **Curriculum Knowledge Graph (KG)** and continuously adapts student roadmaps via a **Plan-Aware KG Reasoner** and **Dynamic Roadmap Replanner**.

Empirical benchmarks across $N=500$ property-tested simulated learners demonstrate:
- **100.00% Prerequisite Validity** (0 topological violations across 500 generated paths).
- **100.00% Root-Cause Recovery Rate** ($\text{MRR} = 1.0000$) via backward prerequisite graph propagation.
- **Sub-Millisecond Non-LLM Reasoning Latency** (Median latency $0.236\text{ ms}$).

---

## 🏗 System Architecture (The Five-Component Standard)

Athena is strictly structured around five decoupled, non-overlapping architectural components:

```
                                ┌─────────────────────────────────────────┐
                                │  Component 1: Curriculum Knowledge Graph│
                                │  (20 CS Concepts, Topological Directed) │
                                └────────────────────┬────────────────────┘
                                                     │
                                                     ▼
┌────────────────────────────────────────┐     ┌─────────────────────────────────────────┐
│ Component 2: Interview Mastery Engine  │────▶│  Component 3: Plan-Aware KG Reasoner    │
│ (Rubric-Graded LLM / Evaluator)        │     │  (Backprop Root-Cause & Forgetting)     │
└────────────────────────────────────────┘     └────────────────────┬────────────────────┘
                                                                    │
                                                                    ▼
┌────────────────────────────────────────┐     ┌─────────────────────────────────────────┐
│ Component 5: RAG Explanation Layer     │◀────│  Component 4: Dynamic Roadmap Replanner │
│ (Constrained Grounded RAG Explainer)   │     │  (Constraint-Valid 8-Step Window)       │
└────────────────────────────────────────┘     └─────────────────────────────────────────┘
```

1. **Component 1 — Curriculum Knowledge Graph (`core/kg.py`)**: Encodes domain concepts $C = \{c_1, \dots, c_{20}\}$ and directed prerequisite dependencies $E = \{(c_i, c_j) \mid c_i \text{ is prerequisite of } c_j\}$. Provides canonical topological sorting and ancestor DAG queries.
2. **Component 2 — Interview-Driven Mastery Engine (`core/interviewer.py`)**: Evaluates open-ended student interview responses across Definition ($30\%$), Reasoning ($35\%$), and Application ($35\%$) rubrics, yielding composite scores $X_t \in [0, 1]$. Tracks temporal score stability via Exponential Moving Average (EMA: $S_t = \alpha S_{t-1} + (1-\alpha) X_t$).
3. **Component 3 — Plan-Aware KG Reasoner (`core/reasoner.py`)**: Quantifies pace deviation, detects memory decay ($\text{STRONG} \to \text{PARTIAL/WEAK}$), and traverses prerequisite DAG lineages backward to isolate foundational root-cause knowledge gaps.
4. **Component 4 — Dynamic Roadmap Replanner (`core/replanner.py`)**: Generates an 8-step window learning path using four priority-ranked operators (**Reinsertion**, **Remediation**, **Forward Learning**, **Compression**) while recursively enforcing prerequisite constraints.
5. **Component 5 — Retrieval-Augmented Explanation Layer (`core/rag.py`)**: Produces grounded natural language explanations for plan modifications, strictly conditioned on evidence retrieved from the knowledge base.

---

## 📊 Key Empirical Benchmarks

All evaluation metrics are programmatically generated using fixed random seeds (`seed=42`) and percentile bootstrap confidence intervals (1,000 resamples). Full execution results are saved in [`backend/evaluation_results.json`](file:///c:/Users/jhanv/Desktop/athena-main/backend/evaluation_results.json).

### 1. Mastery Inference Accuracy ($N=20$ Learners, 400 Concepts)
Ground-truth hidden mastery $\theta \sim \text{Uniform}(0.15, 0.90)$ vs. inferred score $\hat{\theta}$:

| Metric | Measured Value (Mean ± Std) | 95% Bootstrap Confidence Interval |
| :--- | :--- | :--- |
| **Mean Absolute Error (MAE)** | **0.0787 ± 0.0115** | 95% CI: [0.0736, 0.0838] |
| **Constant Baseline MAE (0.525 Guess)** | 0.1846 | N/A |
| **Spearman Rank Correlation ($\rho$)** | **0.8591 ± 0.0368** | 95% CI: [0.8433, 0.8741] |
| **Pearson Correlation ($r$)** | **0.9031 ± 0.0290** | 95% CI: [0.8907, 0.9148] |

### 2. Root-Cause Recovery Benchmark ($N=50$ DAG Scenarios)
Evaluated across 5 structural DAG topology scenarios repeated 10 times under random initial mastery noise draws:

| Model / Baseline Variant | Hit Rate @ Top-1 (%) | Mean Reciprocal Rank (MRR) | Recovered / Total |
| :--- | :---: | :---: | :---: |
| **Proposed Plan-Aware Reasoner (Backpropagation)** | **100.00%** | **1.0000** | **50 / 50** |
| **Direct Prerequisite Baseline (Parent-Only)** | 0.00% | 0.0000 | 0 / 50 |
| **Lowest-Mastery Ancestor Baseline** | 0.00% | 0.0000 | 0 / 50 |
| **Target-Only Baseline (Failed Concept Review)** | 0.00% | 0.0000 | 0 / 50 |

### 3. Prerequisite Validity & Property Testing ($N=500$ Learners)

| Property Test Parameter | Programmatically Verified Result |
| :--- | :--- |
| **Total Random Learners Tested** | **500** |
| **Valid Constraint-Satisfying Roadmaps** | **100.00% (500 / 500)** |
| **Prerequisite Violation Count** | **0 violations** |
| **Average Roadmap Window Length** | **8.00 steps** |
| **Negative Control Violation Detection** | **86.40% (432 / 500)** |

### 4. System Runtime Profiling

| Component / Subsystem | Median Latency ($p_{50}$) | $p_{95}$ Latency | Mean ± Std Latency | Profiled Runs |
| :--- | :---: | :---: | :---: | :---: |
| **Non-LLM Pipeline (Reasoner & Replanner)** | **0.236 ms** | **0.479 ms** | **0.274 ± 0.112 ms** | $N=1000$ runs |
| **Single-Call LLM Inference (`gemini-2.5-flash`)** | **2891.12 ms** | **3145.15 ms** | **2924.7 ± 182.4 ms** | $N=20$ live calls |

---

## 📁 Repository Layout

```
athena-main/
├── PAPER_REVISION.md                 # Full paper revision & theoretical framework
├── README.md                         # Project documentation & benchmark overview
├── bugs.md                           # Production bug fixes & database sync logs
├── system_notes.md                   # Operational architecture guide
├── backend/                          # FastAPI Backend & Core AI Engine
│   ├── core/
│   │   ├── kg.py                     # Component 1 — Knowledge Graph DAG engine
│   │   ├── learner.py                # Learner state, memory decay, score tracking
│   │   ├── interviewer.py            # Component 2 — Rubric evaluation & score smoothing
│   │   ├── reasoner.py               # Component 3 — Root-cause backpropagation
│   │   ├── replanner.py              # Component 4 — Priority-ranked roadmap replanner
│   │   └── rag.py                    # Component 5 — Grounded explanation generator
│   ├── data/
│   │   ├── knowledge_graph.json      # 20 Data Structures & Algorithms DAG schema
│   │   └── question_bank.json        # Open-ended multi-level interview rubrics
│   ├── evaluation_results.json       # Programmatic empirical output data
│   ├── test_evaluation.py            # Automated research evaluation test suite
│   ├── generate_paper_tables.py      # Automated paper markdown table generator
│   └── main.py                       # FastAPI routes & session management
└── frontend/                         # React + Vite Interactive Web UI
    └── src/
        ├── components/
        │   ├── KGGraph.jsx           # Canvas force-directed Knowledge Graph visualizer
        │   ├── InterviewPanel.jsx    # Real-time multi-dimensional interview interface
        │   ├── RoadmapPanel.jsx      # Dynamic 8-step roadmap & replanning alerts
        │   └── MasteryPanel.jsx      # Grid view of concept mastery levels
        └── App.jsx                   # Main 4-tab application container
```

---

## ⚡ Quick Start & Reproduction

### Prerequisites
- **Python**: `3.12+`
- **Node.js**: `18.0+`
- **Gemini API Key**: Optional (System automatically falls back to deterministic mock evaluation if no key is provided).

---

### 1️⃣ Backend Setup & Server Execution

```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt

# (Optional) Set up your Gemini API Key
cp .env.example .env
# Edit .env and set: GEMINI_API_KEY=your_api_key_here

python main.py
```
> The API server starts at `http://localhost:8000`. Swagger documentation is available at `http://localhost:8000/docs`.

---

### 2️⃣ Frontend Setup & UI Execution

```bash
cd frontend
npm install
npm run dev
```
> Open `http://localhost:3000` (or `http://localhost:5173`) in your browser to view the interactive dashboard.

---

### 3️⃣ Running the Research Benchmark Suite

To execute the empirical evaluation suite and programmatically re-generate `evaluation_results.json`:

```bash
cd backend
python test_evaluation.py
```

To format and verify the programmatic paper markdown tables:

```bash
python generate_paper_tables.py
```

---

## 🔌 API Endpoint Reference

| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/kg/graph` | Fetch graph nodes, edges, and prerequisite links |
| `GET` | `/kg/roadmap` | Fetch baseline canonical topological curriculum order |
| `GET` | `/learner/{id}` | Retrieve learner profile and concept mastery scores |
| `POST` | `/learner/{id}/reset` | Reset learner mastery scores |
| `POST` | `/learner/mastery/update` | Direct update of concept mastery level |
| `GET` | `/interview/questions/{concept}` | Retrieve open-ended rubric questions for a concept |
| `POST` | `/interview/evaluate` | Submit interview response $\to$ LLM evaluation & EMA score update |
| `GET` | `/plan/{id}` | Run Reasoner + Replanner $\to$ generate personalized 8-step roadmap |
| `GET` | `/plan/{id}/analysis` | Output raw Reasoner analysis and root-cause detections |
| `POST` | `/explain/change` | Generate grounded RAG explanation for a roadmap modification |
| `GET` | `/explain/concept/{lid}/{cid}`| Fetch comprehensive grounded explanation for a concept |

---

## 📖 Citation

If you use Athena or reference our benchmarks in your research, please cite our work:

```bibtex
@article{athena2026grounded,
  title={Grounded Evaluation and Architecture Revision for Knowledge-Graph-Grounded Adaptive Learning Systems},
  author={Das, Soumashree and Murarka, J.},
  journal={arXiv preprint},
  year={2026}
}
```

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).
