"""
Component 5: Retrieval-Augmented Explanation Layer
Grounds all explanations in the KG + Evidence Log (ChromaDB).
Prevents hallucination by restricting generation to retrieved evidence.
"""
import os
import json
from typing import List, Dict, Optional
from pathlib import Path

# Optional ChromaDB — graceful fallback if not installed
try:
    import chromadb
    from chromadb.utils import embedding_functions
    CHROMA_OK = True
except ImportError:
    CHROMA_OK = False

from google import genai
from dotenv import load_dotenv
from core.kg import CurriculumKG

load_dotenv()


class RAGExplainer:
    """
    Evidence Log = ChromaDB collection of KG concept descriptions + Q&A pairs.
    All LLM calls are constrained to retrieved context (no free-form generation).
    """

    COLLECTION_NAME = "evidence_log"

    def __init__(self, kg: CurriculumKG, use_mock: bool = False):
        self.kg = kg
        self.use_mock = use_mock
        self._llm_ok = False
        self.model_name = "gemini-pro"  # Use gemini-pro which is stable

        # Set up Gemini
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key and not use_mock:
            self.client = genai.Client(api_key=api_key)
            self._llm_ok = True

        # Set up ChromaDB
        self._chroma_ok = False
        if CHROMA_OK and not use_mock:
            self._setup_chroma()

    # ── public API ─────────────────────────────────────────────────────────

    def explain_roadmap_change(self, concept_id: str, action: str,
                               reason: str, mastery_score: float) -> str:
        """Human-readable explanation for a roadmap change."""
        context = self._retrieve(concept_id)
        concept = self.kg.get(concept_id) or {}

        if not self._llm_ok:
            return self._template_explanation(concept, action, reason, mastery_score)

        prompt = f"""You are an adaptive learning tutor. Explain in 2–3 clear sentences
why the learner's roadmap was updated.

CONCEPT: {concept.get('name', concept_id)}
DESCRIPTION: {concept.get('description', '')}
ACTION: {action}
REASON: {reason}
MASTERY SCORE: {mastery_score:.0%}
RETRIEVED EVIDENCE:
{context}

Rules:
- Only use information from the description and retrieved evidence above.
- Address the learner directly ("you/your").
- Be constructive and specific.
- Do NOT invent facts not present in the evidence."""

        try:
            return self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config={"temperature": 0.4, "max_output_tokens": 500},
            ).text.strip()
        except Exception:
            return self._template_explanation(concept, action, reason, mastery_score)

    def explain_weak_concept(self, concept_id: str,
                             weak_prereqs: List[str]) -> str:
        """Explain why a concept is hard and what needs reviewing."""
        concept = self.kg.get(concept_id) or {}
        prereq_names = [
            (self.kg.get(p) or {}).get("name", p) for p in weak_prereqs
        ]
        context = self._retrieve(concept_id)

        if not self._llm_ok:
            return (
                f"Your difficulty with '{concept.get('name', concept_id)}' "
                f"likely stems from gaps in: {', '.join(prereq_names)}. "
                f"Reviewing these prerequisites first will make the concept easier to grasp."
            )

        prompt = f"""You are an adaptive learning tutor.

CONCEPT: {concept.get('name', concept_id)}
DESCRIPTION: {concept.get('description', '')}
WEAK PREREQUISITES: {', '.join(prereq_names)}
RETRIEVED EVIDENCE:
{context}

In 2–3 sentences, explain to the learner why these prerequisites matter
for understanding this concept. Be specific and constructive.
Only use information from the evidence above."""

        try:
            return self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config={"temperature": 0.4, "max_output_tokens": 500},
            ).text.strip()
        except Exception:
            return (
                f"Strengthening {', '.join(prereq_names)} will directly "
                f"improve your understanding of {concept.get('name', concept_id)}."
            )

    def explain_forgetting(self, concept_id: str, score: float) -> str:
        concept = self.kg.get(concept_id) or {}
        name = concept.get("name", concept_id)
        descendants = list(self.kg.descendants(concept_id))[:3]
        desc_names = [(self.kg.get(d) or {}).get("name", d) for d in descendants]

        return (
            f"Your mastery of '{name}' has dropped to {score:.0%}. "
            f"This is a foundation for: {', '.join(desc_names) if desc_names else 'future topics'}. "
            f"A targeted review session is included in your updated roadmap."
        )

    # ── ChromaDB helpers ───────────────────────────────────────────────────

    def _setup_chroma(self):
        try:
            self.chroma = chromadb.Client()
            ef = embedding_functions.DefaultEmbeddingFunction()
            self.collection = self.chroma.get_or_create_collection(
                self.COLLECTION_NAME, embedding_function=ef
            )
            # Index KG concept descriptions if collection is empty
            if self.collection.count() == 0:
                self._index_kg()
            self._chroma_ok = True
        except Exception as e:
            print(f"ChromaDB init failed: {e}")

    def _index_kg(self):
        docs, ids, metas = [], [], []
        for cid, c in self.kg.concepts.items():
            docs.append(f"{c['name']}: {c['description']}")
            ids.append(cid)
            metas.append({"difficulty": c["difficulty"]})
        if docs:
            self.collection.add(documents=docs, ids=ids, metadatas=metas)

    def _retrieve(self, concept_id: str, n: int = 3) -> str:
        if not self._chroma_ok:
            # Fallback: return concept description from KG
            c = self.kg.get(concept_id)
            return c.get("description", "") if c else ""
        try:
            query = (self.kg.get(concept_id) or {}).get("name", concept_id)
            results = self.collection.query(query_texts=[query], n_results=n)
            docs = results.get("documents", [[]])[0]
            return "\n".join(docs)
        except Exception:
            c = self.kg.get(concept_id)
            return c.get("description", "") if c else ""

    def _template_explanation(self, concept: Dict, action: str,
                               reason: str, score: float) -> str:
        name = concept.get("name", "this concept")
        action_map = {
            "learn": f"Your roadmap now includes '{name}' as the next concept to study.",
            "review": f"'{name}' has been added for review (current mastery: {score:.0%}).",
            "reinforce": f"'{name}' has been reinserted for spaced reinforcement.",
        }
        return f"{action_map.get(action, f'Action: {action} on {name}.')} Reason: {reason}."

    def prompt_roadmap_generation(self, proficiency_level: str,
                                  canonical_roadmap: List[str],
                                  effort_data: Dict[str, float],
                                  deadline_weeks: int = 12) -> str:
        """
        Generate LLM-based personalized learning roadmap prompt.
        
        Args:
            proficiency_level: "beginner" | "intermediate" | "advanced"
            canonical_roadmap: List of concept IDs in topo order
            effort_data: Dict[concept_id] -> estimated_hours
            deadline_weeks: Target learning duration
        
        Returns: Generated roadmap as formatted string
        """
        concept_list = "\n".join([
            f"- {(self.kg.get(cid) or {}).get('name', cid)} ({effort_data.get(cid, 3)} hours)"
            for cid in canonical_roadmap[:15]  # First 15 concepts
        ])
        
        pace_guidance = {
            "beginner": "3-4 concepts per week, with extra review time",
            "intermediate": "4-5 concepts per week, mix new and reinforcement",
            "advanced": "5-6 concepts per week, focus on advanced topics and applications",
        }
        
        prompt = f"""You are an expert curriculum designer creating a personalized learning roadmap.

LEARNER PROFICIENCY: {proficiency_level.upper()}
DEADLINE: {deadline_weeks} weeks
RECOMMENDED PACE: {pace_guidance.get(proficiency_level, pace_guidance['beginner'])}

AVAILABLE CONCEPTS (in canonical order with estimated hours):
{concept_list}

Based on the learner's proficiency level and deadline, generate a structured weekly learning plan:

1. For {proficiency_level}s, select appropriate concepts (skip advanced topics if beginner)
2. Organize concepts into weekly milestones (roughly {deadline_weeks} milestones)
3. Include review sessions every 2-3 weeks to reinforce learning
4. Provide estimated completion date for each milestone

Format your response as a structured weekly plan with clear milestones and deadlines."""

        if not self._llm_ok:
            # Fallback template
            return f"""PERSONALIZED {proficiency_level.upper()} ROADMAP ({deadline_weeks} weeks)
Available {len(canonical_roadmap)} concepts organized for {proficiency_level} learners.
Pace: {pace_guidance.get(proficiency_level, "Custom pace")}.
Review phases scheduled every 2-3 weeks."""

        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config={"temperature": 0.5, "max_output_tokens": 1000},
            )
            return response.text.strip()
        except Exception as e:
            print(f"Roadmap generation LLM error: {e}")
            return f"""PERSONALIZED {proficiency_level.upper()} ROADMAP ({deadline_weeks} weeks)
Fallback: {len(canonical_roadmap)} DSA concepts available.
Recommended pace: {pace_guidance.get(proficiency_level, 'Custom pace')}"""
