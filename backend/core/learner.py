"""
Learner State Graph — tracks per-concept mastery with full history.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from enum import Enum


class MasteryLevel(str, Enum):
    UNKNOWN = "unknown"
    WEAK = "weak"
    PARTIAL = "partial"
    STRONG = "strong"


class ProficiencyLevel(str, Enum):
    UNASSESSED = "unassessed"
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


MASTERY_SCORE_MAP = {
    MasteryLevel.UNKNOWN: 0.0,
    MasteryLevel.WEAK: 0.25,
    MasteryLevel.PARTIAL: 0.55,
    MasteryLevel.STRONG: 0.85,
}


def score_to_level(score: float) -> MasteryLevel:
    if score >= 0.75:
        return MasteryLevel.STRONG
    elif score >= 0.50:
        return MasteryLevel.PARTIAL
    elif score > 0.0:
        return MasteryLevel.WEAK
    return MasteryLevel.UNKNOWN


class ConceptState:
    def __init__(self, concept_id: str):
        self.concept_id = concept_id
        self.score: float = 0.0
        self.level: MasteryLevel = MasteryLevel.UNKNOWN
        self.attempts: int = 0
        self.history: List[Dict] = []   # list of {score, level, timestamp}
        self.last_updated: Optional[str] = None

    def update(self, new_score: float, alpha: float = 0.65):
        """Exponential smoothing: blend old knowledge with new evidence."""
        if self.score == 0.0 and self.level == MasteryLevel.UNKNOWN:
            updated = new_score
        else:
            updated = alpha * self.score + (1 - alpha) * new_score
        self.score = round(updated, 4)
        self.level = score_to_level(self.score)
        self.attempts += 1
        self.last_updated = datetime.utcnow().isoformat()
        self.history.append({
            "score": self.score,
            "level": self.level,
            "timestamp": self.last_updated,
        })

    def is_forgetting_candidate(self) -> bool:
        """
        Returns True if the concept had a prior Strong assessment but
        now shows Partial or Weak — indicating possible forgetting.
        """
        had_strong = any(h["level"] == MasteryLevel.STRONG for h in self.history[:-1])
        degraded = self.level in (MasteryLevel.WEAK, MasteryLevel.PARTIAL)
        return had_strong and degraded

    def to_dict(self) -> Dict:
        return {
            "concept_id": self.concept_id,
            "score": self.score,
            "level": self.level,
            "attempts": self.attempts,
            "last_updated": self.last_updated,
            "history": self.history,
        }


class LearnerState:
    def __init__(self, learner_id: str, concept_ids: List[str]):
        self.learner_id = learner_id
        self.created_at = datetime.utcnow().isoformat()
        self.states: Dict[str, ConceptState] = {
            cid: ConceptState(cid) for cid in concept_ids
        }
        
        # Onboarding & Proficiency Tracking
        self.proficiency_level: ProficiencyLevel = ProficiencyLevel.UNASSESSED
        self.onboarding_complete: bool = False
        self.proficiency_assessment_results: Optional[Dict] = None
        self.learning_deadline: Optional[str] = None  # ISO format datetime
        self.learning_goals: List[str] = []  # List of concept IDs
        self.timeline_adjustments: List[Dict] = []  # [{date, reason, new_deadline, concepts_affected}]
        self.weak_points: Dict[str, int] = {}  # {concept_id: weak_answer_count}

    def update(self, concept_id: str, score: float):
        if concept_id not in self.states:
            self.states[concept_id] = ConceptState(concept_id)
        self.states[concept_id].update(score)

    def get(self, concept_id: str) -> ConceptState:
        return self.states.get(concept_id, ConceptState(concept_id))

    def mastery_level(self, concept_id: str) -> MasteryLevel:
        return self.states.get(concept_id, ConceptState(concept_id)).level

    def mastery_score(self, concept_id: str) -> float:
        return self.states.get(concept_id, ConceptState(concept_id)).score

    def all_states_dict(self) -> Dict:
        return {cid: s.to_dict() for cid, s in self.states.items()}

    def flag_weak_point(self, concept_id: str):
        """Increment weak point counter for a concept (incorrect answer)."""
        if concept_id not in self.weak_points:
            self.weak_points[concept_id] = 0
        self.weak_points[concept_id] += 1

    def is_weak_point_flagged(self, concept_id: str, threshold: int = 2) -> bool:
        """Check if concept has been flagged as weak point (>=threshold wrong answers)."""
        return self.weak_points.get(concept_id, 0) >= threshold

    def adjust_timeline(self, new_deadline: str, reason: str, affected_concepts: List[str]):
        """Record a timeline adjustment (e.g., due to performance change)."""
        self.timeline_adjustments.append({
            "date": datetime.utcnow().isoformat(),
            "reason": reason,
            "new_deadline": new_deadline,
            "concepts_affected": affected_concepts,
        })
        self.learning_deadline = new_deadline

    def get_days_to_deadline(self) -> Optional[int]:
        """Calculate days remaining until learning deadline."""
        if not self.learning_deadline:
            return None
        deadline = datetime.fromisoformat(self.learning_deadline)
        return (deadline - datetime.utcnow()).days

    def snapshot(self) -> Dict:
        return {
            "learner_id": self.learner_id,
            "created_at": self.created_at,
            "concepts": self.all_states_dict(),
        }
