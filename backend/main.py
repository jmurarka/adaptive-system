"""
Adaptive Learning System — FastAPI Backend
All 5 components wired together through a session-based API.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn

from core.kg import CurriculumKG
from core.learner import LearnerState
from core.interviewer import InterviewEngine
from core.reasoner import PlanAwareReasoner
from core.replanner import DynamicReplanner
from core.rag import RAGExplainer

# ── App setup ───────────────────────────────────────────────────────────────
app = FastAPI(title="Adaptive Learning System", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Singleton components (loaded once) ──────────────────────────────────────
kg         = CurriculumKG()
interviewer = InterviewEngine()
reasoner   = PlanAwareReasoner(kg)
replanner  = DynamicReplanner(kg, reasoner)
rag        = RAGExplainer(kg)

# In-memory learner sessions: learner_id → LearnerState
# (replace with DB in production)
_sessions: Dict[str, LearnerState] = {}
_canonical_positions: Dict[str, int] = {}  # learner_id → expected index


def get_learner(learner_id: str) -> LearnerState:
    if learner_id not in _sessions:
        _sessions[learner_id] = LearnerState(learner_id, kg.all_concept_ids())
        _canonical_positions[learner_id] = 0
    return _sessions[learner_id]


# ── Pydantic models ─────────────────────────────────────────────────────────
class AnswerItem(BaseModel):
    question_id: str
    answer: str

class EvaluateRequest(BaseModel):
    learner_id: str
    concept_id: str
    answers: List[AnswerItem]

class UpdateMasteryRequest(BaseModel):
    learner_id: str
    concept_id: str
    score: float   # 0-1

class ExplainRequest(BaseModel):
    learner_id: str
    concept_id: str
    action: str
    reason: str


# ── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "system": "Adaptive Learning System v2"}


# ── Knowledge Graph ──────────────────────────────────────────────────────────

@app.get("/kg/graph")
def kg_graph():
    """Frontend visualisation data."""
    return kg.to_graph_data()

@app.get("/kg/roadmap")
def kg_roadmap():
    """Canonical curriculum roadmap."""
    return {"roadmap": kg.canonical_roadmap()}

@app.get("/kg/concept/{concept_id}")
def kg_concept(concept_id: str):
    c = kg.get(concept_id)
    if not c:
        raise HTTPException(404, f"Concept '{concept_id}' not found")
    return c


# ── Learner Session ──────────────────────────────────────────────────────────

@app.get("/learner/{learner_id}")
def get_learner_state(learner_id: str):
    return get_learner(learner_id).snapshot()

@app.post("/learner/{learner_id}/reset")
def reset_learner(learner_id: str):
    _sessions[learner_id] = LearnerState(learner_id, kg.all_concept_ids())
    _canonical_positions[learner_id] = 0
    return {"reset": True}

@app.post("/learner/mastery/update")
def update_mastery(req: UpdateMasteryRequest):
    """Direct mastery update (e.g. from completed exercise)."""
    learner = get_learner(req.learner_id)
    learner.update(req.concept_id, req.score)
    state = learner.get(req.concept_id)
    return {
        "concept_id": req.concept_id,
        "score": state.score,
        "level": state.level,
    }


# ── Interview ────────────────────────────────────────────────────────────────

@app.get("/interview/questions/{concept_id}")
def get_questions(concept_id: str):
    questions = interviewer.get_questions(concept_id)
    if not questions:
        raise HTTPException(404, f"No questions for concept '{concept_id}'")
    return {"concept_id": concept_id, "questions": questions}

@app.post("/interview/evaluate")
def evaluate_interview(req: EvaluateRequest):
    """
    Evaluate a completed interview session and update learner mastery.
    """
    learner = get_learner(req.learner_id)
    answers = [a.dict() for a in req.answers]
    result = interviewer.evaluate_session(req.concept_id, answers)

    # Update learner state from interview result
    learner.update(req.concept_id, result["composite_score"])
    state = learner.get(req.concept_id)

    # Advance canonical position
    roadmap = kg.all_concept_ids()
    if req.concept_id in roadmap:
        idx = roadmap.index(req.concept_id)
        current_pos = _canonical_positions.get(req.learner_id, 0)
        _canonical_positions[req.learner_id] = max(current_pos, idx + 1)

    return {
        **result,
        "updated_mastery": {"score": state.score, "level": state.level},
    }


# ── Planner / Replanner ───────────────────────────────────────────────────────

@app.get("/plan/{learner_id}")
def get_plan(learner_id: str):
    """Generate (or replan) the learner's personalised roadmap."""
    learner = get_learner(learner_id)
    canonical_pos = _canonical_positions.get(learner_id, 0)
    return replanner.generate_roadmap(learner, canonical_pos)

@app.get("/plan/{learner_id}/analysis")
def get_analysis(learner_id: str):
    """Raw reasoner analysis (forgetting events, deviation, root causes)."""
    learner = get_learner(learner_id)
    canonical_pos = _canonical_positions.get(learner_id, 0)
    result = reasoner.analyse(learner, canonical_pos)
    return result.to_dict()


# ── RAG Explanation ───────────────────────────────────────────────────────────

@app.post("/explain/change")
def explain_change(req: ExplainRequest):
    """Get a grounded explanation for a specific roadmap change."""
    learner = get_learner(req.learner_id)
    score = learner.mastery_score(req.concept_id)
    text = rag.explain_roadmap_change(
        req.concept_id, req.action, req.reason, score
    )
    return {"explanation": text}

@app.get("/explain/concept/{learner_id}/{concept_id}")
def explain_concept(learner_id: str, concept_id: str):
    """Full concept explanation with prerequisite context."""
    learner = get_learner(learner_id)
    analysis = reasoner.analyse(learner, _canonical_positions.get(learner_id, 0))
    weak_prereqs = analysis.weak_root_causes.get(concept_id, [])
    forgetting = [
        e for e in analysis.forgetting_events if e["concept_id"] == concept_id
    ]

    explanations: Dict[str, str] = {}
    if forgetting:
        explanations["forgetting"] = rag.explain_forgetting(
            concept_id, learner.mastery_score(concept_id)
        )
    if weak_prereqs:
        explanations["weak_prereqs"] = rag.explain_weak_concept(concept_id, weak_prereqs)

    concept = kg.get(concept_id) or {}
    return {
        "concept_id": concept_id,
        "name": concept.get("name", concept_id),
        "description": concept.get("description", ""),
        "mastery": learner.get(concept_id).to_dict(),
        "explanations": explanations,
        "prerequisites": [
            {"id": p, "name": (kg.get(p) or {}).get("name", p),
             "level": learner.mastery_level(p)}
            for p in kg.prerequisites(concept_id)
        ],
    }


# ── Onboarding & Proficiency ────────────────────────────────────────────────

class OnboardRequest(BaseModel):
    learner_id: str
    self_proficiency_level: str  # "beginner" | "intermediate" | "advanced"

class AssessmentSubmitRequest(BaseModel):
    learner_id: str
    answers: List[Dict[str, str]]  # [{question_id, concept_id, answer}, ...]
    self_proficiency_level: Optional[str] = None

class GoalsGenerateRequest(BaseModel):
    learner_id: str
    deadline_weeks: int = 12


@app.post("/learner/onboard")
def onboard_learner(req: OnboardRequest):
    """Initialize onboarding for a new learner."""
    learner_id = req.learner_id
    learner = get_learner(learner_id)
    
    # Update proficiency level from self-report
    from core.learner import ProficiencyLevel
    try:
        learner.proficiency_level = ProficiencyLevel(req.self_proficiency_level.lower())
    except (KeyError, ValueError):
        learner.proficiency_level = ProficiencyLevel.UNASSESSED
    
    learner.onboarding_complete = False
    
    # Get assessment questions for proficiency validation
    assessment_questions = interviewer.get_assessment_questions(num_questions=5)
    
    return {
        "learner_id": learner_id,
        "proficiency_level": learner.proficiency_level,
        "onboarding_complete": False,
        "next_step": "assessment_questions",
        "assessment_questions": assessment_questions,
    }


@app.post("/learner/assessment/submit")
def submit_assessment(req: AssessmentSubmitRequest):
    """
    Submit assessment answers and validate proficiency level.
    """
    learner = get_learner(req.learner_id)
    
    # Assess proficiency with provided answers
    assessment_result = interviewer.assess_proficiency(
        req.self_proficiency_level or "beginner",
        req.answers,
    )
    
    # Store assessment results
    learner.proficiency_assessment_results = assessment_result
    from core.learner import ProficiencyLevel
    learner.proficiency_level = ProficiencyLevel(assessment_result["proficiency_label"])
    
    return {
        "learner_id": req.learner_id,
        "proficiency_label": assessment_result["proficiency_label"],
        "score": assessment_result["validated_score"],
        "assessment_notes": assessment_result["assessment_notes"],
        "next_step": "goal_generation",
    }


@app.post("/learner/goals/generate")
def generate_learning_goals(req: GoalsGenerateRequest):
    """
    Generate personalized learning goals based on proficiency level.
    """
    learner = get_learner(req.learner_id)
    
    # Generate proficiency-based roadmap
    roadmap_data = reasoner.generate_proficiency_roadmap(
        learner.proficiency_level.value,
        deadline_weeks=req.deadline_weeks,
    )
    
    # Store learning goals and deadline
    learner.learning_goals = roadmap_data["learning_goals"]
    from datetime import datetime, timedelta
    deadline = datetime.utcnow() + timedelta(weeks=req.deadline_weeks)
    learner.learning_deadline = deadline.isoformat()
    
    # Generate LLM-enhanced roadmap description
    effort_data = {
        cid: (kg.get(cid) or {}).get("effort_hours", 3)
        for cid in roadmap_data["learning_goals"]
    }
    
    roadmap_description = rag.prompt_roadmap_generation(
        learner.proficiency_level.value,
        roadmap_data["learning_goals"],
        effort_data,
        req.deadline_weeks,
    )
    
    return {
        "learner_id": req.learner_id,
        "proficiency_level": learner.proficiency_level.value,
        "learning_goals": roadmap_data["learning_goals"],
        "milestone_deadlines": roadmap_data["milestone_deadlines"],
        "expected_pace": roadmap_data["expected_pace"],
        "deadline": learner.learning_deadline,
        "roadmap_description": roadmap_description,
        "next_step": "goal_acceptance",
    }


@app.post("/learner/goals/accept")
def accept_learning_goals(req: OnboardRequest):
    """
    Confirm learning goals and complete onboarding.
    """
    learner = get_learner(req.learner_id)
    learner.onboarding_complete = True
    
    # Generate initial roadmap with the accepted goals
    roadmap_data = replanner.generate_roadmap(learner, 0)
    steps = roadmap_data.get("steps", [])
    
    return {
        "learner_id": req.learner_id,
        "status": "onboarding_complete",
        "proficiency_level": learner.proficiency_level.value,
        "learning_deadline": learner.learning_deadline,
        "first_roadmap_steps": steps[:5],  # First 5 steps
    }


@app.get("/learner/{learner_id}/personalized-roadmap")
def get_personalized_roadmap(learner_id: str):
    """
    Get personalized learning roadmap for flowchart visualization.
    Returns learning goals, milestones, and progress.
    """
    learner = get_learner(learner_id)
    
    # Get all concepts and their mastery
    all_concepts = kg.all_concept_ids()
    concept_details = []
    
    for cid in all_concepts:
        concept = kg.get(cid) or {}
        mastery = learner.mastery_level(cid)
        status = "not_started" if mastery.value == "unknown" else \
                 "in_progress" if mastery.value == "partial" else \
                 "weak" if mastery.value == "weak" else "mastered"
        
        concept_details.append({
            "id": cid,
            "name": concept.get("name", cid),
            "status": status,
            "difficulty": concept.get("difficulty", "medium"),
            "prerequisites": kg.prerequisites(cid),
            "effort_hours": concept.get("effort_hours", 3),
        })
    
    # Filter by proficiency level
    proficiency = learner.proficiency_level.value
    if proficiency == "beginner":
        concepts = [c for c in concept_details[:int(len(concept_details) * 0.6)]]
    elif proficiency == "intermediate":
        concepts = [c for c in concept_details[:int(len(concept_details) * 0.7)]]
    else:  # advanced
        concepts = concept_details
    
    return {
        "learner_id": learner_id,
        "proficiency_level": proficiency,
        "learning_goals": learner.learning_goals,
        "learning_deadline": learner.learning_deadline,
        "onboarding_complete": learner.onboarding_complete,
        "concepts": concepts,
        "milestones": learner.timeline_adjustments,
        "completed_concepts": [c["id"] for c in concepts if c["status"] == "mastered"],
        "in_progress_concepts": [c["id"] for c in concepts if c["status"] == "in_progress"],
    }


# ── Dev runner ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
