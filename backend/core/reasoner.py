"""
Component 3: Plan-Aware Knowledge Graph Reasoner
- Backward prerequisite propagation (root-cause detection)
- Forgetting detection
- Progress deviation analysis
"""
from typing import Dict, List, Tuple, Optional
from core.kg import CurriculumKG
from core.learner import LearnerState, MasteryLevel


class ReasonerResult:
    def __init__(self):
        self.forgetting_events: List[Dict] = []
        self.weak_root_causes: Dict[str, List[str]] = {}  # concept → weak prereqs
        self.deviation: float = 0.0                        # positive = lagging
        self.at_risk_concepts: List[str] = []
        self.replanning_needed: bool = False
        self.replanning_reason: str = ""

    def to_dict(self) -> Dict:
        return {
            "forgetting_events": self.forgetting_events,
            "weak_root_causes": self.weak_root_causes,
            "deviation": self.deviation,
            "at_risk_concepts": self.at_risk_concepts,
            "replanning_needed": self.replanning_needed,
            "replanning_reason": self.replanning_reason,
        }


class PlanAwareReasoner:
    DEVIATION_THRESHOLD = 2.0   # concepts behind schedule before replanning
    FORGETTING_REPLAN   = True

    def __init__(self, kg: CurriculumKG):
        self.kg = kg

    # ── public entry point ─────────────────────────────────────────────────

    def analyse(self, learner: LearnerState,
                canonical_position: int) -> ReasonerResult:
        """
        Full reasoning pass. Returns a ReasonerResult driving the Replanner.
        canonical_position: expected concept index (0-based) in canonical roadmap.
        """
        result = ReasonerResult()

        result.forgetting_events = self._detect_forgetting(learner)
        result.weak_root_causes  = self._backward_propagation(learner)
        result.deviation         = self._progress_deviation(learner, canonical_position)
        result.at_risk_concepts  = self._at_risk_from_forgetting(
            learner, result.forgetting_events
        )

        # Decide if replanning is necessary
        if result.forgetting_events:
            result.replanning_needed = True
            concepts = [e["concept_id"] for e in result.forgetting_events]
            result.replanning_reason = (
                f"Forgetting detected in: {', '.join(concepts)}"
            )
        elif result.deviation >= self.DEVIATION_THRESHOLD:
            result.replanning_needed = True
            result.replanning_reason = (
                f"Progress lag of {result.deviation:.1f} concepts behind schedule"
            )
        elif result.weak_root_causes:
            result.replanning_needed = True
            result.replanning_reason = "Weak prerequisite foundations detected"

        return result

    # ── sub-analyses ───────────────────────────────────────────────────────

    def _detect_forgetting(self, learner: LearnerState) -> List[Dict]:
        """
        A forgetting event = concept previously Strong, now Partial or Weak.
        """
        events = []
        for cid, state in learner.states.items():
            if state.is_forgetting_candidate():
                events.append({
                    "concept_id": cid,
                    "concept_name": (self.kg.get(cid) or {}).get("name", cid),
                    "current_level": state.level,
                    "current_score": state.score,
                })
        return events

    def _backward_propagation(self, learner: LearnerState) -> Dict[str, List[str]]:
        """
        For every Weak concept, traverse its prerequisite chain backward
        to find which weak ancestors are likely root causes.
        """
        root_causes: Dict[str, List[str]] = {}
        for cid in self.kg.all_concept_ids():
            if learner.mastery_level(cid) == MasteryLevel.WEAK:
                weak_prereqs = [
                    p for p in self.kg.prerequisites(cid)
                    if learner.mastery_level(p) in (MasteryLevel.WEAK, MasteryLevel.UNKNOWN)
                ]
                if weak_prereqs:
                    root_causes[cid] = weak_prereqs
        return root_causes

    def _progress_deviation(self, learner: LearnerState,
                            expected_idx: int) -> float:
        """
        Counts how many concepts the learner should have mastered by now
        (based on canonical position) but hasn't.
        """
        roadmap = self.kg.all_concept_ids()
        expected_concepts = roadmap[:expected_idx]
        not_mastered = sum(
            1 for cid in expected_concepts
            if learner.mastery_level(cid) not in (MasteryLevel.STRONG, MasteryLevel.PARTIAL)
        )
        return float(not_mastered)

    def _at_risk_from_forgetting(self, learner: LearnerState,
                                 forgetting_events: List[Dict]) -> List[str]:
        """
        Concepts downstream of a forgotten concept that are now at risk.
        """
        at_risk = set()
        for event in forgetting_events:
            at_risk.update(self.kg.descendants(event["concept_id"]))
        return list(at_risk)

    # ── prerequisite constraint check ──────────────────────────────────────

    def prerequisites_met(self, concept_id: str,
                          learner: LearnerState) -> Tuple[bool, List[str]]:
        """
        Returns (met: bool, unmet_prereqs: list[str])
        """
        unmet = [
            p for p in self.kg.hard_prerequisites(concept_id)
            if learner.mastery_level(p) == MasteryLevel.UNKNOWN
        ]
        return len(unmet) == 0, unmet

    def generate_proficiency_roadmap(self, proficiency_level: str,
                                    deadline_weeks: int = 12) -> Dict:
        """
        Generate a proficiency-aware learning roadmap with goals and milestones.
        
        Args:
            proficiency_level: "beginner" | "intermediate" | "advanced"
            deadline_weeks: Target learning duration (default 12 weeks)
        
        Returns: {
            "learning_goals": [concept_ids],
            "milestone_deadlines": [{week, concepts, deadline}],
            "expected_pace": float (concepts/week),
            "proficiency_guidance": str
        }
        """
        from datetime import datetime, timedelta
        
        all_concepts = self.kg.all_concept_ids()
        
        # Filter concepts by proficiency level
        if proficiency_level == "beginner":
            # First 60% of concepts (easier ones)
            goal_concepts = all_concepts[:int(len(all_concepts) * 0.6)]
            pace = 3.5  # concepts per week
            guidance = "Focus on foundational concepts with repeated reinforcement"
        elif proficiency_level == "intermediate":
            # 70% of concepts
            goal_concepts = all_concepts[:int(len(all_concepts) * 0.7)]
            pace = 4.5
            guidance = "Build on fundamentals with balanced reinforcement and new topics"
        else:  # advanced
            # All concepts
            goal_concepts = all_concepts
            pace = 5.5
            guidance = "Cover full curriculum with focus on advanced applications"
        
        # Generate milestones (one per week, roughly)
        weeks = list(range(1, deadline_weeks + 1))
        concepts_per_milestone = max(1, len(goal_concepts) // len(weeks))
        
        milestones = []
        for week_idx, week in enumerate(weeks):
            start_idx = week_idx * concepts_per_milestone
            end_idx = start_idx + concepts_per_milestone
            milestone_concepts = goal_concepts[start_idx:end_idx]
            
            milestone_deadline = datetime.utcnow() + timedelta(weeks=week)
            milestones.append({
                "week": week,
                "concepts": milestone_concepts,
                "deadline": milestone_deadline.isoformat(),
                "expected_concepts": len(milestone_concepts),
            })
        
        return {
            "learning_goals": goal_concepts,
            "milestone_deadlines": milestones,
            "expected_pace": pace,
            "proficiency_level": proficiency_level,
            "proficiency_guidance": guidance,
            "total_concepts": len(goal_concepts),
            "deadline_weeks": deadline_weeks,
        }

    def calculate_timeline_adjustment(self, learner: LearnerState) -> Optional[Dict]:
        """
        Analyze recent performance and recommend timeline adjustments.
        
        Returns: {
            "adjustment_needed": bool,
            "reason": str,
            "days_to_add": int (negative = accelerate),
            "new_deadline": str (ISO format),
            "affected_concepts": [concept_ids],
        } or None if no adjustment needed
        """
        from datetime import datetime, timedelta
        
        if not learner.learning_deadline:
            return None
        
        # Calculate average score on recently assessed concepts
        recent_attempts = []
        for cid, state in learner.states.items():
            if state.attempts > 0 and len(state.history) > 0:
                # Use last attempt score
                recent_attempts.append(state.score)
        
        if not recent_attempts:
            return None
        
        avg_score = sum(recent_attempts) / len(recent_attempts)
        weak_point_count = len([c for c, count in learner.weak_points.items() if count > 0])
        
        adjustment_days = 0
        reason_parts = []
        affected = []
        
        # Adjustment logic based on performance
        if avg_score < 0.5:
            # Poor performance - extend deadline
            adjustment_days = +7  # Add 1 week
            reason_parts.append(f"Performance below 50% (avg: {avg_score:.0%})")
        elif avg_score < 0.65:
            # Below target - extend slightly
            adjustment_days = +3  # Add 3 days
            reason_parts.append(f"Performance below target (avg: {avg_score:.0%})")
        elif avg_score > 0.85:
            # Strong performance - accelerate
            adjustment_days = -3  # Reduce by 3 days
            reason_parts.append(f"Strong performance detected (avg: {avg_score:.0%})")
        
        # Adjust for weak points
        if weak_point_count > 3:
            adjustment_days += 2
            reason_parts.append(f"Multiple weak points flagged ({weak_point_count})")
            affected = [c for c, count in learner.weak_points.items() if count > 0]
        
        if adjustment_days == 0:
            return None
        
        # Calculate new deadline
        current_deadline = datetime.fromisoformat(learner.learning_deadline)
        new_deadline = current_deadline + timedelta(days=adjustment_days)
        
        return {
            "adjustment_needed": True,
            "reason": "; ".join(reason_parts),
            "days_to_add": adjustment_days,
            "new_deadline": new_deadline.isoformat(),
            "affected_concepts": affected,
        }
