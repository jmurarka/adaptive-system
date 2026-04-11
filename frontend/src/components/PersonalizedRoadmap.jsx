import React, { useState, useEffect } from "react";
import { API } from "../api/client";
import "./PersonalizedRoadmap.css";

export default function PersonalizedRoadmap({ learnerId, onConceptSelect }) {
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hoveredConcept, setHoveredConcept] = useState(null);

  useEffect(() => {
    if (!learnerId) return;

    const loadRoadmap = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await API.getPersonalizedRoadmap(learnerId);
        setRoadmap(response.data);
      } catch (err) {
        setError("Failed to load roadmap: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadRoadmap();
  }, [learnerId]);

  if (loading) {
    return (
      <div className="roadmap-container">
        <div className="roadmap-spinner">
          <div className="spinner"></div>
          <p>Loading your personalized roadmap...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="roadmap-container">
        <div className="roadmap-error">{error}</div>
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="roadmap-container">
        <div className="roadmap-empty">
          Complete onboarding to see your personalized roadmap
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "mastered":
        return "#10b981"; // green
      case "in_progress":
        return "#f59e0b"; // amber
      case "weak":
        return "#ef4444"; // red
      default:
        return "#6b7280"; // gray
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "mastered":
        return "✓";
      case "in_progress":
        return "⟳";
      case "weak":
        return "⚠";
      default:
        return "○";
    }
  };

  const concepts = roadmap.concepts || [];
  const completedCount = roadmap.completed_concepts?.length || 0;
  const inProgressCount = roadmap.in_progress_concepts?.length || 0;
  const totalCount = concepts.length;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Group concepts by difficulty for horizontal layout
  const conceptsByDifficulty = {
    easy: [],
    medium: [],
    hard: [],
  };

  concepts.forEach((c) => {
    const difficulty = c.difficulty || "medium";
    if (!conceptsByDifficulty[difficulty]) {
      conceptsByDifficulty[difficulty] = [];
    }
    conceptsByDifficulty[difficulty].push(c);
  });

  const deadline = roadmap.learning_deadline
    ? new Date(roadmap.learning_deadline).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No deadline";

  return (
    <div className="roadmap-container">
      {/* Header with progress */}
      <div className="roadmap-header">
        <div className="roadmap-title-section">
          <h2 className="roadmap-title">
            📚 Your Personalized Learning Roadmap
          </h2>
          <p className="roadmap-subtitle">
            {roadmap.proficiency_level.toUpperCase()} • {totalCount} concepts •
            Due {deadline}
          </p>
        </div>

        <div className="roadmap-progress-section">
          <div className="progress-stats">
            <div className="stat">
              <span className="stat-value" style={{ color: "#10b981" }}>
                {completedCount}
              </span>
              <span className="stat-label">Completed</span>
            </div>
            <div className="stat">
              <span className="stat-value" style={{ color: "#f59e0b" }}>
                {inProgressCount}
              </span>
              <span className="stat-label">In Progress</span>
            </div>
            <div className="stat">
              <span className="stat-value" style={{ color: "#6b7280" }}>
                {totalCount - completedCount - inProgressCount}
              </span>
              <span className="stat-label">To Learn</span>
            </div>
          </div>

          <div className="progress-bar-container">
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${progressPercent}%`,
                  background: `linear-gradient(90deg, #10b981, #06b6d4)`,
                }}
              ></div>
            </div>
            <span className="progress-percentage">{progressPercent}%</span>
          </div>
        </div>
      </div>

      {/* Flowchart visualization */}
      <div className="roadmap-flowchart">
        {Object.entries(conceptsByDifficulty)
          .filter(([_, items]) => items.length > 0)
          .map(([difficulty, items]) => (
            <div key={difficulty} className="roadmap-tier">
              <div className="tier-label">
                {difficulty === "easy" && "🟢 Foundational"}
                {difficulty === "medium" && "🟡 Intermediate"}
                {difficulty === "hard" && "🔴 Advanced"}
              </div>

              <div className="tier-concepts">
                {items.map((concept) => (
                  <div
                    key={concept.id}
                    className={`concept-node ${concept.status}`}
                    style={{
                      borderColor: getStatusColor(concept.status),
                      background:
                        concept.status === "mastered"
                          ? "rgba(16, 185, 129, 0.1)"
                          : concept.status === "in_progress"
                            ? "rgba(245, 158, 11, 0.1)"
                            : concept.status === "weak"
                              ? "rgba(239, 68, 68, 0.1)"
                              : "rgba(107, 114, 128, 0.1)",
                    }}
                    onMouseEnter={() => setHoveredConcept(concept.id)}
                    onMouseLeave={() => setHoveredConcept(null)}
                    onClick={() =>
                      onConceptSelect &&
                      onConceptSelect(concept.id, concept.name)
                    }
                  >
                    <div className="concept-header">
                      <span
                        className="concept-status-icon"
                        style={{ color: getStatusColor(concept.status) }}
                      >
                        {getStatusIcon(concept.status)}
                      </span>
                      <span className="concept-name">{concept.name}</span>
                    </div>

                    {hoveredConcept === concept.id && (
                      <div className="concept-tooltip">
                        <div className="tooltip-row">
                          <span className="tooltip-label">Effort:</span>
                          <span className="tooltip-value">
                            {concept.effort_hours}h
                          </span>
                        </div>
                        {concept.prerequisites?.length > 0 && (
                          <div className="tooltip-row">
                            <span className="tooltip-label">
                              Prerequisites:
                            </span>
                            <span className="tooltip-value">
                              {concept.prerequisites.length}
                            </span>
                          </div>
                        )}
                        <div
                          className="tooltip-status"
                          style={{ color: getStatusColor(concept.status) }}
                        >
                          {concept.status === "mastered"
                            ? "✓ Mastered"
                            : concept.status === "in_progress"
                              ? "⟳ In Progress"
                              : concept.status === "weak"
                                ? "⚠ Weak"
                                : "○ Not Started"}
                        </div>
                        {onConceptSelect && (
                          <button className="tooltip-button">
                            Start Learning →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Learning goals */}
      {roadmap.learning_goals?.length > 0 && (
        <div className="roadmap-goals">
          <h3 className="goals-title">🎯 Your Learning Goals</h3>
          <ul className="goals-list">
            {roadmap.learning_goals.slice(0, 5).map((goal, idx) => (
              <li key={idx} className="goal-item">
                {goal}
              </li>
            ))}
            {roadmap.learning_goals.length > 5 && (
              <li className="goal-item more">
                +{roadmap.learning_goals.length - 5} more concepts
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
