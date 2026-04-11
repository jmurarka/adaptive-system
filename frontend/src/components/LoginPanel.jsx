import React, { useState } from "react";
import "./LoginPanel.css";

export default function LoginPanel({ onSelectMode, onExistingLearner }) {
  const [learnerId, setLearnerId] = useState("");
  const [error, setError] = useState("");

  const handleNewLearner = () => {
    setError("");
    onSelectMode("new");
  };

  const handleExistingLearner = () => {
    if (!learnerId.trim()) {
      setError("Please enter a learner ID");
      return;
    }
    setError("");
    onExistingLearner(learnerId);
  };

  return (
    <div className="login-container">
      <div className="login-panel">
        <h1>⚓ Adaptive Learning System</h1>
        <p className="subtitle">
          Knowledge-graph-grounded, interview-aware adaptive learning
        </p>

        <div className="login-content">
          {/* New Learner Option */}
          <div className="login-option">
            <div className="option-icon">👤</div>
            <h2>New Learner</h2>
            <p>Start your personalized DSA learning journey</p>
            <button className="btn btn-primary" onClick={handleNewLearner}>
              Get Started
            </button>
          </div>

          {/* Returning Learner Option */}
          <div className="login-option">
            <div className="option-icon">🔄</div>
            <h2>Returning Learner</h2>
            <p>Continue your learning with your existing profile</p>

            <div className="input-group">
              <input
                type="text"
                placeholder="Enter your Learner ID"
                value={learnerId}
                onChange={(e) => {
                  setLearnerId(e.target.value);
                  setError("");
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleExistingLearner();
                  }
                }}
              />
              <button
                className="btn btn-secondary"
                onClick={handleExistingLearner}
              >
                Continue
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>
        </div>

        <div className="login-footer">
          <p className="footer-info">
            💡 Tip: Your learner ID can be any unique identifier you choose
          </p>
        </div>
      </div>
    </div>
  );
}
