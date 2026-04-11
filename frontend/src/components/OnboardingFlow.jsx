import React, { useState, useEffect } from "react";
import { API } from "../api/client";
import "./OnboardingFlow.css";

export default function OnboardingFlow({ learnerId, onComplete }) {
  const [step, setStep] = useState(1); // 1=self-assess, 2=proficiency-q&a, 3=goal-setting, 4=confirm
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Step 1: Self-assessment
  const [selfLevel, setSelfLevel] = useState("beginner");

  // Step 2: Proficiency Q&A
  const [assessmentQuestions, setAssessmentQuestions] = useState([]);
  const [assessmentAnswers, setAssessmentAnswers] = useState({});
  const [assessmentResult, setAssessmentResult] = useState(null);

  // Step 3: Goal setting
  const [deadlineWeeks, setDeadlineWeeks] = useState(12);
  const [goalsResult, setGoalsResult] = useState(null);

  // Step 4: Confirmation
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Initialize - get assessment questions
  useEffect(() => {
    const initializeOnboarding = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await API.onboard({
          learner_id: learnerId,
          self_proficiency_level: selfLevel,
        });

        setAssessmentQuestions(response.data.assessment_questions || []);
        // Initialize assessment answers
        const initialAnswers = {};
        (response.data.assessment_questions || []).forEach((q) => {
          initialAnswers[q.id] = "";
        });
        setAssessmentAnswers(initialAnswers);
      } catch (err) {
        setError("Failed to start onboarding: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeOnboarding();
  }, [learnerId, selfLevel]);

  // Handle self-assessment submission
  const handleSelfAssessmentSubmit = () => {
    if (!selfLevel) {
      setError("Please select your proficiency level");
      return;
    }
    setStep(2);
    setError("");
  };

  // Handle answer change
  const handleAnswerChange = (qid, value) => {
    setAssessmentAnswers((prev) => ({
      ...prev,
      [qid]: value,
    }));
  };

  // Submit proficiency assessment
  const handleSubmitAssessment = async () => {
    try {
      // Validate all answers filled
      const unanswered = Object.entries(assessmentAnswers).filter(
        ([_, v]) => !v.trim(),
      );
      if (unanswered.length > 0) {
        setError("Please answer all questions");
        return;
      }

      setLoading(true);
      setError("");

      // Convert answers to API format
      const answers = assessmentQuestions.map((q) => ({
        question_id: q.id,
        concept_id: q.concept_id,
        answer: assessmentAnswers[q.id],
      }));

      const response = await API.submitAssessment({
        learner_id: learnerId,
        answers: answers,
        self_proficiency_level: selfLevel,
      });

      setAssessmentResult(response.data);
      setSuccess(
        `Proficiency assessed: ${response.data.proficiency_label} (${(response.data.score * 100).toFixed(0)}%)`,
      );
      setStep(3);
    } catch (err) {
      setError("Failed to submit assessment: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Generate learning goals
  const handleGenerateGoals = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await API.generateGoals({
        learner_id: learnerId,
        deadline_weeks: deadlineWeeks,
      });

      setGoalsResult(response.data);
      setSuccess("Learning goals generated successfully!");
      setStep(4);
    } catch (err) {
      setError("Failed to generate goals: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Accept goals and complete onboarding
  const handleAcceptGoals = async () => {
    try {
      setConfirmLoading(true);
      setError("");

      await API.acceptGoals({
        learner_id: learnerId,
        self_proficiency_level: selfLevel,
      });

      setSuccess("Onboarding complete! Start learning now.");
      setTimeout(() => onComplete(), 1500);
    } catch (err) {
      setError("Failed to accept goals: " + err.message);
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-panel">
        {/* Progress Indicator */}
        <div className="progress-bar">
          <div
            className="progress-step active"
            style={{ width: `${(step / 4) * 100}%` }}
          ></div>
        </div>

        <div className="step-indicator">
          <span className="step-number">{step}</span>
          <span className="step-total">of 4</span>
        </div>

        {/* Step 1: Self-Assessment */}
        {step === 1 && (
          <div className="step-content">
            <h2>How well do you know DSA?</h2>
            <p>
              Let's start with your current proficiency level to personalize
              your learning path.
            </p>

            <div className="proficiency-options">
              {[
                {
                  value: "beginner",
                  label: "Beginner",
                  desc: "New to DSA or need a refresh",
                },
                {
                  value: "intermediate",
                  label: "Intermediate",
                  desc: "Know basics, want to deepen knowledge",
                },
                {
                  value: "advanced",
                  label: "Advanced",
                  desc: "Strong foundation, ready for complex topics",
                },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`prof-option ${selfLevel === option.value ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="proficiency"
                    value={option.value}
                    checked={selfLevel === option.value}
                    onChange={(e) => setSelfLevel(e.target.value)}
                  />
                  <div className="prof-label">
                    <strong>{option.label}</strong>
                    <small>{option.desc}</small>
                  </div>
                </label>
              ))}
            </div>

            <button
              className="btn btn-primary btn-large"
              onClick={handleSelfAssessmentSubmit}
              disabled={loading}
            >
              {loading ? "Loading..." : "Continue"}
            </button>
          </div>
        )}

        {/* Step 2: Proficiency Q&A */}
        {step === 2 && (
          <div className="step-content">
            <h2>Quick Proficiency Check</h2>
            <p>
              Answer these questions so we can validate your level (
              {assessmentQuestions.length} questions)
            </p>

            <div className="questions-list">
              {assessmentQuestions.map((q, idx) => (
                <div key={q.id} className="question-block">
                  <label className="question-label">
                    Q{idx + 1}: {q.text || "Question"}
                  </label>
                  <textarea
                    className="answer-input"
                    value={assessmentAnswers[q.id] || ""}
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                    placeholder="Your answer..."
                    rows={3}
                  />
                </div>
              ))}
            </div>

            <div className="button-group">
              <button className="btn btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitAssessment}
                disabled={loading}
              >
                {loading ? "Evaluating..." : "Submit Assessment"}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Goal Setting */}
        {step === 3 && assessmentResult && (
          <div className="step-content">
            <h2>✓ Assessment Complete!</h2>
            <div className="assessment-result">
              <p>
                <strong>Your Level:</strong>{" "}
                {assessmentResult.proficiency_label}
              </p>
              <p>
                <strong>Validated Score:</strong>{" "}
                {(assessmentResult.score * 100).toFixed(0)}%
              </p>
              {assessmentResult.assessment_notes && (
                <p>
                  <strong>Notes:</strong> {assessmentResult.assessment_notes}
                </p>
              )}
            </div>

            <h3>Set Your Learning Goal</h3>
            <p>How many weeks do you want to dedicate to mastering DSA?</p>

            <div className="goal-input-group">
              <input
                type="range"
                min="4"
                max="26"
                value={deadlineWeeks}
                onChange={(e) => setDeadlineWeeks(parseInt(e.target.value))}
                className="deadline-slider"
              />
              <div className="deadline-display">
                <strong>{deadlineWeeks} weeks</strong>
                <span className="deadline-info">
                  ~{Math.ceil(deadlineWeeks / 4)} months
                </span>
              </div>
            </div>

            <div className="button-group">
              <button className="btn btn-secondary" onClick={() => setStep(2)}>
                Back
              </button>
              <button
                className="btn btn-primary"
                onClick={handleGenerateGoals}
                disabled={loading}
              >
                {loading ? "Generating..." : "Generate Learning Plan"}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && goalsResult && (
          <div className="step-content">
            <h2>📋 Your Personalized Learning Plan</h2>

            <div className="goals-summary">
              <div className="summary-item">
                <strong>Proficiency Level:</strong>{" "}
                {goalsResult.proficiency_level}
              </div>
              <div className="summary-item">
                <strong>Learning Duration:</strong> {deadlineWeeks} weeks
              </div>
              <div className="summary-item">
                <strong>Target Concepts:</strong>{" "}
                {goalsResult.learning_goals.length}
              </div>
              <div className="summary-item">
                <strong>Expected Pace:</strong> ~
                {goalsResult.expected_pace.toFixed(1)} concepts/week
              </div>
              <div className="summary-item">
                <strong>Deadline:</strong>{" "}
                {new Date(goalsResult.deadline).toLocaleDateString()}
              </div>
            </div>

            {goalsResult.roadmap_description && (
              <div className="roadmap-description">
                <h4>Your Learning Path:</h4>
                <p>{goalsResult.roadmap_description}</p>
              </div>
            )}

            <div className="button-group">
              <button
                className="btn btn-secondary"
                onClick={() => setStep(3)}
                disabled={confirmLoading}
              >
                Back
              </button>
              <button
                className="btn btn-primary btn-large"
                onClick={handleAcceptGoals}
                disabled={confirmLoading}
              >
                {confirmLoading ? "Starting..." : "Start Learning"}
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
      </div>
    </div>
  );
}
