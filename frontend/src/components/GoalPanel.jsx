import React, { useState, useEffect } from "react";
import "./GoalPanel.css";

export default function GoalPanel({ learnerId, learnerState }) {
  const [goals, setGoals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [status, setStatus] = useState("on-track"); // on-track, ahead, behind

  useEffect(() => {
    const loadGoals = async () => {
      try {
        if (learnerState) {
          // Calculate progress
          const concept_count = Object.keys(learnerState.concepts || {}).length;
          const strong_count = Object.values(
            learnerState.concepts || {},
          ).filter((c) => c.level === "strong").length;
          const progress =
            concept_count > 0 ? (strong_count / concept_count) * 100 : 0;
          setProgressPercent(Math.round(progress));

          // Calculate days remaining
          if (learnerState.learning_deadline) {
            const deadline = new Date(learnerState.learning_deadline);
            const now = new Date();
            const days = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
            setDaysRemaining(days);

            // Determine status
            if (progress > 70) {
              setStatus("ahead");
            } else if (progress < 30 && days < 30) {
              setStatus("behind");
            } else {
              setStatus("on-track");
            }
          }

          // Set goals from learner state
          setGoals({
            goals: learnerState.learning_goals || [],
            proficiency_level: learnerState.proficiency_level,
            deadline: learnerState.learning_deadline,
            milestones: learnerState.timeline_adjustments || [],
          });
        }
      } catch (err) {
        console.error("Error loading goals:", err);
      } finally {
        setLoading(false);
      }
    };

    loadGoals();
  }, [learnerState]);

  if (loading) {
    return <div className="goal-panel">Loading your learning goals...</div>;
  }

  if (!goals || !goals.goals.length) {
    return (
      <div className="goal-panel">
        <div className="empty-state">
          <p>📋 No learning goals set yet.</p>
          <p>Complete onboarding to create your personalized learning plan.</p>
        </div>
      </div>
    );
  }

  const deadlineDate = goals.deadline ? new Date(goals.deadline) : null;
  const statusIcons = {
    "on-track": "✓",
    ahead: "🚀",
    behind: "⚠️",
  };

  return (
    <div className="goal-panel">
      <h2>🎯 Your Learning Goals</h2>

      {/* Status Card */}
      <div className={`status-card status-${status}`}>
        <div className="status-header">
          <span className="status-icon">{statusIcons[status]}</span>
          <div className="status-text">
            <div className="status-title">
              {status === "ahead" && "You're Ahead of Schedule!"}
              {status === "behind" && "You're Behind Schedule"}
              {status === "on-track" && "You're on Track"}
            </div>
            <div className="status-subtitle">
              {progressPercent}% concepts mastered • {daysRemaining} days
              remaining
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="progress-labels">
            <span>{progressPercent}%</span>
            <span>Complete</span>
          </div>
        </div>
      </div>

      {/* Goals Overview */}
      <div className="goals-section">
        <h3>Your Learning Path</h3>
        <div className="goals-grid">
          <div className="goal-item">
            <span className="goal-label">Proficiency Level</span>
            <span className="goal-value">{goals.proficiency_level}</span>
          </div>
          <div className="goal-item">
            <span className="goal-label">Target Concepts</span>
            <span className="goal-value">{goals.goals.length}</span>
          </div>
          <div className="goal-item">
            <span className="goal-label">Deadline</span>
            <span className="goal-value">
              {deadlineDate ? deadlineDate.toLocaleDateString() : "N/A"}
            </span>
          </div>
          <div className="goal-item">
            <span className="goal-label">Days Left</span>
            <span
              className="goal-value"
              style={{ color: daysRemaining < 14 ? "#e53e3e" : "" }}
            >
              {daysRemaining}
            </span>
          </div>
        </div>
      </div>

      {/* Concepts List */}
      <div className="concepts-section">
        <h3>Concepts in Your Plan</h3>
        <div className="concepts-list">
          {goals.goals.slice(0, 10).map((concept, idx) => (
            <div key={concept} className="concept-tag">
              {idx + 1}. {concept}
            </div>
          ))}
          {goals.goals.length > 10 && (
            <div className="concept-tag more-concepts">
              +{goals.goals.length - 10} more concepts
            </div>
          )}
        </div>
      </div>

      {/* Timeline Adjustments */}
      {goals.milestones && goals.milestones.length > 0 && (
        <div className="adjustments-section">
          <h3>Timeline Adjustments</h3>
          <div className="adjustments-list">
            {goals.milestones.map((adj, idx) => (
              <div key={idx} className="adjustment-item">
                <span className="adjustment-date">
                  {new Date(adj.date).toLocaleDateString()}
                </span>
                <span className="adjustment-reason">{adj.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="tips-section">
        <h4>💡 Tips for Success</h4>
        <ul>
          <li>Study 3-5 concepts per week consistently</li>
          <li>Review weak points when prompted by the system</li>
          <li>Schedule your learning sessions regularly</li>
          <li>
            Complete all interview questions for accurate mastery assessment
          </li>
        </ul>
      </div>
    </div>
  );
}
