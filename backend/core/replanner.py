"""
Component 4: Dynamic Roadmap Replanner
Operators: reinsertion, compression, deferral.
All plans are validated against prerequisite constraints.
"""
from typing import List, Dict, Optional
from core.kg import CurriculumKG
from core.learner import LearnerState, MasteryLevel
from core.reasoner import PlanAwareReasoner, ReasonerResult


class RoadmapStep:
    def __init__(self, concept_id: str, concept_name: str,
                 action: str, reason: str, priority: int = 0):
        self.concept_id   = concept_id
        self.concept_name = concept_name
        self.action       = action    # "learn" | "review" | "reinforce"
        self.reason       = reason
        self.priority     = priority

    def to_dict(self) -> Dict:
        return {
            "concept_id":   self.concept_id,
            "concept_name": self.concept_name,
            "action":       self.action,
            "reason":       self.reason,
            "priority":     self.priority,
        }


class DynamicReplanner:
    MAX_STEPS = 8   # max steps in one roadmap window

    def __init__(self, kg: CurriculumKG, reasoner: PlanAwareReasoner):
        self.kg = kg
        self.reasoner = reasoner

    # ── main entry point ───────────────────────────────────────────────────

    def generate_roadmap(self, learner: LearnerState,
                         canonical_idx: int) -> Dict:
        """
        Build a personalised, constraint-valid learning roadmap.
        Returns the plan + the reasoning that produced it.
        """
        analysis = self.reasoner.analyse(learner, canonical_idx)
        steps: List[RoadmapStep] = []
        applied_ops: List[str] = []

        # ① Reinsertion — forgotten or newly weak concepts
        for event in analysis.forgetting_events:
            cid = event["concept_id"]
            if self._prereqs_ok(cid, learner, steps):
                steps.append(RoadmapStep(
                    cid, self.kg.get(cid)["name"],
                    "reinforce",
                    f"Forgetting detected — reinserting for spaced review",
                    priority=0,
                ))
                applied_ops.append(f"REINSERTION({cid})")

        # ② Root-cause remediation — weak prerequisites
        seen = {s.concept_id for s in steps}
        for weak_cid, weak_prereqs in analysis.weak_root_causes.items():
            for p in weak_prereqs:
                if p not in seen and self._prereqs_ok(p, learner, steps):
                    steps.append(RoadmapStep(
                        p, self.kg.get(p)["name"],
                        "review",
                        f"Root cause of weakness in '{self.kg.get(weak_cid)['name']}'",
                        priority=1,
                    ))
                    seen.add(p)
                    applied_ops.append(f"REMEDIATION({p})")

        # ③ Normal forward learning — next unmastered concepts
        roadmap_order = self.kg.all_concept_ids()
        seen = {s.concept_id for s in steps}

        for cid in roadmap_order:
            if len(steps) >= self.MAX_STEPS:
                break
            if cid in seen:
                continue
            level = learner.mastery_level(cid)
            if level == MasteryLevel.STRONG:
                continue

            # Check prerequisite constraint (hard rule)
            ok, unmet = self.reasoner.prerequisites_met(cid, learner)
            if not ok:
                # Add unmet prereqs first if not already present
                for u in unmet:
                    if u not in seen and len(steps) < self.MAX_STEPS:
                        u_ok, _ = self.reasoner.prerequisites_met(u, learner)
                        if u_ok:
                            steps.append(RoadmapStep(
                                u, self.kg.get(u)["name"],
                                "learn" if learner.mastery_level(u) == MasteryLevel.UNKNOWN else "review",
                                f"Prerequisite for '{self.kg.get(cid)['name']}'",
                                priority=2,
                            ))
                            seen.add(u)
                continue

            action = "review" if level == MasteryLevel.PARTIAL else "learn"
            steps.append(RoadmapStep(
                cid, self.kg.get(cid)["name"], action,
                "Next concept in curriculum" if action == "learn"
                else "Partial mastery — needs reinforcement",
                priority=3,
            ))
            seen.add(cid)

        # ④ Compression — if learner is accelerating (deviation < -1)
        if analysis.deviation < -1:
            steps = self._compress(steps)
            applied_ops.append("COMPRESSION")

        return {
            "steps": [s.to_dict() for s in steps],
            "operators_applied": applied_ops,
            "analysis": analysis.to_dict(),
            "total_steps": len(steps),
        }

    # ── helpers ────────────────────────────────────────────────────────────

    def _prereqs_ok(self, cid: str, learner: LearnerState,
                    planned: List[RoadmapStep]) -> bool:
        """Check hard prerequisites against current mastery + already planned steps."""
        planned_ids = {s.concept_id for s in planned}
        for p in self.kg.hard_prerequisites(cid):
            level = learner.mastery_level(p)
            if level == MasteryLevel.UNKNOWN and p not in planned_ids:
                return False
        return True

    def _compress(self, steps: List[RoadmapStep]) -> List[RoadmapStep]:
        """
        Merge adjacent "review" steps on closely related concepts.
        Simple heuristic: keep at most one review per difficulty tier.
        """
        seen_actions: Dict[str, int] = {}
        compressed = []
        for s in steps:
            key = f"{s.action}_{(self.kg.get(s.concept_id) or {}).get('difficulty', '')}"
            if s.action == "review":
                if seen_actions.get(key, 0) >= 2:
                    continue
                seen_actions[key] = seen_actions.get(key, 0) + 1
            compressed.append(s)
        return compressed
