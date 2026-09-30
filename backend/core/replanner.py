"""
Component 4: Dynamic Roadmap Replanner
Operators: reinsertion, compression, deferral.
All plans are validated against prerequisite constraints.
"""
from typing import List, Dict, Optional, Set
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
        seen: Set[str] = set()

        # ① Reinsertion — forgotten or newly weak concepts
        for event in analysis.forgetting_events:
            cid = event["concept_id"]
            self._add_with_prereqs(
                cid, "reinforce", "Forgetting detected — reinserting for spaced review",
                priority=0, learner=learner, steps=steps, seen=seen
            )
            if cid in seen:
                applied_ops.append(f"REINSERTION({cid})")

        # ② Root-cause remediation — weak prerequisites
        for weak_cid, weak_prereqs in analysis.weak_root_causes.items():
            for p in weak_prereqs:
                self._add_with_prereqs(
                    p, "review", f"Root cause of weakness in '{self.kg.get(weak_cid)['name']}'",
                    priority=1, learner=learner, steps=steps, seen=seen
                )
                if p in seen:
                    applied_ops.append(f"REMEDIATION({p})")

        # ③ Normal forward learning — next unmastered concepts
        roadmap_order = self.kg.all_concept_ids()

        for cid in roadmap_order:
            if len(steps) >= self.MAX_STEPS:
                break
            if cid in seen:
                continue
            level = learner.mastery_level(cid)
            if level == MasteryLevel.STRONG:
                continue

            action = "review" if level == MasteryLevel.PARTIAL else "learn"
            reason = ("Next concept in curriculum" if action == "learn"
                      else "Partial mastery — needs reinforcement")
            self._add_with_prereqs(
                cid, action, reason, priority=3,
                learner=learner, steps=steps, seen=seen
            )

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

    def _add_with_prereqs(self, cid: str, action: str, reason: str, priority: int,
                          learner: LearnerState, steps: List[RoadmapStep], seen: Set[str]):
        """
        Recursively ensures all unmastered/unknown prerequisite ancestors of cid
        are added to steps in topological order BEFORE adding cid.
        """
        # Find all ancestors of cid in topological order
        ancestors_topo = [a for a in self.kg.all_concept_ids() if a in self.kg.ancestors(cid)]
        for a in ancestors_topo:
            if len(steps) >= self.MAX_STEPS:
                break
            if a not in seen and learner.mastery_level(a) not in (MasteryLevel.STRONG, MasteryLevel.PARTIAL):
                a_name = (self.kg.get(a) or {}).get("name", a)
                target_name = (self.kg.get(cid) or {}).get("name", cid)
                steps.append(RoadmapStep(
                    a, a_name,
                    "learn" if learner.mastery_level(a) == MasteryLevel.UNKNOWN else "review",
                    f"Prerequisite for '{target_name}'",
                    priority=priority
                ))
                seen.add(a)

        # Add cid itself if all prerequisite ancestors are satisfied (in learner or in steps)
        if self._prereqs_ok(cid, learner, steps) and cid not in seen and len(steps) < self.MAX_STEPS:
            cid_name = (self.kg.get(cid) or {}).get("name", cid)
            steps.append(RoadmapStep(
                cid, cid_name, action, reason, priority=priority
            ))
            seen.add(cid)

    def _prereqs_ok(self, cid: str, learner: LearnerState,
                    planned: List[RoadmapStep]) -> bool:
        """Check hard prerequisites (all transitive ancestors) against current mastery + already planned steps."""
        planned_ids = {s.concept_id for s in planned}
        for p in self.kg.ancestors(cid):
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
