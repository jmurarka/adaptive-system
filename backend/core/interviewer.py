"""
Component 2: Interview-Driven Mastery Inference Module
Uses Gemini to evaluate open-ended answers and map them to discrete mastery states.
"""
import os
import json
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
from google import genai
from dotenv import load_dotenv

load_dotenv()

QUESTION_BANK_PATH = Path(__file__).parent.parent / "data" / "question_bank.json"


class InterviewEngine:
    def __init__(self, use_mock: bool = False):
        self.use_mock = use_mock
        self._load_questions()
        self.model_name = "gemini-pro"  # Use gemini-pro which is stable

        if not use_mock:
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                print("⚠  GEMINI_API_KEY not set — falling back to mock evaluator")
                self.use_mock = True
            else:
                self.client = genai.Client(api_key=api_key)

    def _load_questions(self):
        with open(QUESTION_BANK_PATH) as f:
            self.question_bank: Dict = json.load(f)["questions"]

    # ── public API ─────────────────────────────────────────────────────────

    def get_questions(self, concept_id: str) -> List[Dict]:
        """Return interview questions for a concept, ordered definitional → synthesis."""
        return self.question_bank.get(concept_id, [])

    def evaluate(self, concept_id: str, question_id: str,
                 student_answer: str) -> Dict[str, Any]:
        """
        Evaluate one answer.
        Returns: {scores: {definition, reasoning, application},
                  composite_score: float,  # 0-1
                  feedback: str,
                  mastery_signal: str}      # weak|partial|strong
        """
        questions = self.question_bank.get(concept_id, [])
        question = next((q for q in questions if q["id"] == question_id), None)
        if question is None:
            return self._empty_result("Question not found")

        if self.use_mock:
            scores = self._mock_score(student_answer)
        else:
            scores = self._gemini_score(question, student_answer)

        composite = round(
            0.30 * scores["definition"]
            + 0.35 * scores["reasoning"]
            + 0.35 * scores["application"],
            4,
        )
        mastery_signal = (
            "strong" if composite >= 0.75
            else "partial" if composite >= 0.50
            else "weak"
        )
        feedback = self._generate_feedback(scores, mastery_signal)

        return {
            "scores": scores,
            "composite_score": composite,
            "mastery_signal": mastery_signal,
            "feedback": feedback,
        }

    def evaluate_session(self, concept_id: str,
                         answers: List[Dict]) -> Dict[str, Any]:
        """
        Evaluate a complete interview session (multiple Q&A pairs).
        answers = [{"question_id": ..., "answer": ...}, ...]
        Returns aggregated mastery estimate.
        """
        results = []
        for a in answers:
            r = self.evaluate(concept_id, a["question_id"], a["answer"])
            results.append(r)

        if not results:
            return self._empty_result("No answers provided")

        avg_composite = round(
            sum(r["composite_score"] for r in results) / len(results), 4
        )
        avg_scores = {
            dim: round(sum(r["scores"][dim] for r in results) / len(results), 4)
            for dim in ("definition", "reasoning", "application")
        }
        mastery_signal = (
            "strong" if avg_composite >= 0.75
            else "partial" if avg_composite >= 0.50
            else "weak"
        )

        return {
            "concept_id": concept_id,
            "per_question": results,
            "scores": avg_scores,
            "composite_score": avg_composite,
            "mastery_signal": mastery_signal,
            "feedback": self._generate_feedback(avg_scores, mastery_signal),
        }

    def assess_proficiency(self, self_reported_level: str,
                          answers: List[Dict]) -> Dict[str, Any]:
        """
        Assess learner proficiency with 3-5 quick questions.
        self_reported_level: "beginner" | "intermediate" | "advanced"
        answers: [{"question_id": "...", "concept_id": "...", "answer": "..."}, ...]
        
        Returns: {
            "proficiency_label": "beginner|intermediate|advanced",
            "validated_score": float (0-1),
            "per_question_scores": [{question_id, concept_id, score, feedback}, ...],
            "assessment_notes": str
        }
        """
        if not answers:
            return {
                "proficiency_label": self_reported_level.lower(),
                "validated_score": 0.5,
                "per_question_scores": [],
                "assessment_notes": "No answers provided",
            }

        # Evaluate each answer
        question_results = []
        composite_scores = []
        
        for a in answers:
            concept_id = a.get("concept_id", "")
            question_id = a.get("question_id", "")
            answer_text = a.get("answer", "")
            
            result = self.evaluate(concept_id, question_id, answer_text)
            question_results.append({
                "question_id": question_id,
                "concept_id": concept_id,
                "score": result["composite_score"],
                "feedback": result["feedback"],
            })
            composite_scores.append(result["composite_score"])

        avg_score = round(sum(composite_scores) / len(composite_scores), 3)
        
        # Determine proficiency label based on performance
        # If self-reported doesn't match performance, adjust
        normalized_level = self_reported_level.lower()
        
        if avg_score >= 0.75:
            proficiency_label = "advanced"
        elif avg_score >= 0.55:
            proficiency_label = "intermediate"
        else:
            proficiency_label = "beginner"

        # If validated differs significantly from self-report, note it
        notes_parts = []
        if normalized_level != proficiency_label:
            if proficiency_label == "beginner":
                notes_parts.append(f"Assessment suggests beginner level (avg score: {avg_score:.0%})")
            elif proficiency_label == "advanced":
                notes_parts.append(f"Strong performance detected (avg score: {avg_score:.0%})")

        return {
            "proficiency_label": proficiency_label,
            "validated_score": avg_score,
            "per_question_scores": question_results,
            "assessment_notes": "; ".join(notes_parts) if notes_parts else "Assessment complete",
        }

    def get_assessment_questions(self, num_questions: int = 5) -> List[Dict]:
        """
        Get quick proficiency assessment questions across different concepts.
        Returns a curated set of definitional/reasoning questions.
        """
        assessment_questions = []
        concepts_list = list(self.question_bank.keys())
        
        # Get ~1 question per concept, starting with 1st N concepts
        for i, concept_id in enumerate(concepts_list[:num_questions]):
            questions = self.question_bank.get(concept_id, [])
            if questions:
                # Prefer definitional or reasoning-level questions for assessment
                candidate = next(
                    (q for q in questions if q.get("level") in ["definitional", "reasoning"]),
                    questions[0]
                )
                assessment_questions.append({
                    **candidate,
                    "concept_id": concept_id  # Add concept context
                })
        
        return assessment_questions

    # ── private helpers ────────────────────────────────────────────────────

    def _gemini_score(self, question: Dict, answer: str) -> Dict[str, float]:
        prompt = f"""You are an expert CS educator evaluating a student's answer.

QUESTION: {question.get('text', '')}
EXPECTED KEY POINTS: {', '.join(question.get('expected_points', []))}
RUBRIC:
  definition  – {question['rubric'].get('definition', '')}
  reasoning   – {question['rubric'].get('reasoning', '')}
  application – {question['rubric'].get('application', '')}

STUDENT ANSWER: {answer}

Score each rubric dimension 0.0–1.0. Reply ONLY with this JSON (no preamble):
{{"definition": <float>, "reasoning": <float>, "application": <float>}}"""

        try:
            resp = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config={"temperature": 0.3, "max_output_tokens": 400},
            )
            text = resp.text.strip()
            m = re.search(r"\{[^}]+\}", text, re.DOTALL)
            raw = json.loads(m.group() if m else text)
            return {
                dim: max(0.0, min(1.0, float(raw.get(dim, 0.5))))
                for dim in ("definition", "reasoning", "application")
            }
        except Exception as e:
            print(f"Gemini error: {e}")
            return self._mock_score(answer)

    def _mock_score(self, answer: str) -> Dict[str, float]:
        import random
        n = len(answer.strip())
        base = min(0.9, n / 200)
        return {
            dim: round(max(0.0, min(1.0, base + random.uniform(-0.1, 0.15))), 2)
            for dim in ("definition", "reasoning", "application")
        }

    def _generate_feedback(self, scores: Dict, mastery: str) -> str:
        weak_dims = [d for d, v in scores.items() if v < 0.5]
        if mastery == "strong":
            return "Excellent understanding demonstrated across all dimensions."
        if weak_dims:
            return f"Areas to improve: {', '.join(weak_dims)}. Focus on depth of explanation."
        return "Good foundational understanding, but reasoning and application need more depth."

    def _empty_result(self, reason: str) -> Dict:
        return {
            "scores": {"definition": 0, "reasoning": 0, "application": 0},
            "composite_score": 0.0,
            "mastery_signal": "weak",
            "feedback": reason,
        }
