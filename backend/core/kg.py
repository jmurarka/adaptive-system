"""
Component 1: Curriculum Knowledge Graph
Encodes domain concepts as nodes, prerequisite relations as directed edges.
"""
import json
from pathlib import Path
from typing import List, Dict, Optional, Set

class CurriculumKG:
    def __init__(self, path: str = None):
        if path is None:
            path = Path(__file__).parent.parent / "data" / "knowledge_graph.json"
        with open(path) as f:
            data = json.load(f)
        self.concepts: Dict = data["concepts"]
        self._build_indexes()

    def _build_indexes(self):
        # topological order (canonical roadmap)
        self._topo_order = self._topological_sort()

    def _topological_sort(self) -> List[str]:
        visited, order = set(), []

        def dfs(cid):
            if cid in visited:
                return
            visited.add(cid)
            for pre in self.concepts[cid]["prerequisites"]:
                if pre in self.concepts:
                    dfs(pre)
            order.append(cid)

        for cid in sorted(self.concepts.keys(),
                          key=lambda c: self.concepts[c]["canonical_position"]):
            dfs(cid)
        return order

    # ── accessors ──────────────────────────────────────────────────────────
    def all_concept_ids(self) -> List[str]:
        return self._topo_order.copy()

    def get(self, cid: str) -> Optional[Dict]:
        return self.concepts.get(cid)

    def prerequisites(self, cid: str) -> List[str]:
        return self.concepts.get(cid, {}).get("prerequisites", [])

    def hard_prerequisites(self, cid: str) -> List[str]:
        """All prerequisites are treated as hard prerequisites in DSA."""
        return self.prerequisites(cid)

    def ancestors(self, cid: str) -> Set[str]:
        """All transitive prerequisite ancestors of a concept."""
        result, stack = set(), list(self.prerequisites(cid))
        while stack:
            p = stack.pop()
            if p in result:
                continue
            result.add(p)
            stack.extend(self.prerequisites(p))
        return result

    def descendants(self, cid: str) -> Set[str]:
        """All concepts that directly or transitively depend on cid."""
        result = set()
        for other in self.concepts:
            if cid in self.ancestors(other):
                result.add(other)
        return result

    def canonical_roadmap(self) -> List[Dict]:
        return [
            {
                "id": cid,
                "name": self.concepts[cid]["name"],
                "difficulty": self.concepts[cid]["difficulty"],
                "effort_hours": self.concepts[cid]["effort_hours"],
                "prerequisites": self.concepts[cid]["prerequisites"],
            }
            for cid in self._topo_order
        ]

    def to_graph_data(self) -> Dict:
        """Serialise for frontend visualisation (nodes + edges)."""
        nodes = [
            {
                "id": cid,
                "label": c["name"],
                "difficulty": c["difficulty"],
                "effort": c["effort_hours"],
                "position": c["canonical_position"],
            }
            for cid, c in self.concepts.items()
        ]
        edges = [
            {"source": pre, "target": cid}
            for cid, c in self.concepts.items()
            for pre in c["prerequisites"]
        ]
        return {"nodes": nodes, "edges": edges}
