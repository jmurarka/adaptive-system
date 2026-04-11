import { useState, useCallback, useEffect } from "react";
import KGGraph from "./components/KGGraph.jsx";
import InterviewPanel from "./components/InterviewPanel.jsx";
import RoadmapPanel from "./components/RoadmapPanel.jsx";
import PersonalizedRoadmap from "./components/PersonalizedRoadmap.jsx";
import MasteryPanel from "./components/MasteryPanel.jsx";
import LoginPanel from "./components/LoginPanel.jsx";
import OnboardingFlow from "./components/OnboardingFlow.jsx";
import GoalPanel from "./components/GoalPanel.jsx";
import { API } from "./api/client.js";

const TABS = [
  "Graph",
  "Roadmap",
  "Personalized",
  "Mastery",
  "Interview",
  "Goals",
];

export default function App() {
  const [loginMode, setLoginMode] = useState(null); // null | 'new' | 'continue'
  const [learnerId, setLearnerId] = useState(null); // null while not logged in
  const [inputId, setInputId] = useState("");
  const [tab, setTab] = useState("Graph");
  const [selectedCid, setSelectedCid] = useState(null);
  const [selectedName, setSelectedName] = useState("");
  const [masteryMap, setMasteryMap] = useState({});
  const [learnerState, setLearnerState] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [resetting, setResetting] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // When a concept is picked from any panel
  function selectConcept(cid, name) {
    setSelectedCid(cid);
    setSelectedName(name || cid);
    setTab("Interview");
  }

  // When an interview completes, refresh mastery display
  function onInterviewDone(result) {
    setRefreshKey((k) => k + 1);
    // Update local mastery map
    if (result?.concept_id) {
      setMasteryMap((m) => ({
        ...m,
        [result.concept_id]: {
          level: result.mastery_signal,
          score: result.composite_score,
        },
      }));
    }
    // Also refresh from server
    if (learnerId) {
      API.getLearner(learnerId)
        .then((r) => {
          const map = {};
          Object.entries(r.data.concepts || {}).forEach(([id, s]) => {
            map[id] = { level: s.level, score: s.score };
          });
          setMasteryMap(map);
          setLearnerState(r.data);
        })
        .catch(() => {});
    }
  }

  // Handle new learner - start onboarding
  function handleNewLearner() {
    // Generate a unique learner ID for the new learner
    const newLearnerId = `learner_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setLearnerId(newLearnerId);
    setLoginMode("new");
  }

  // Handle returning learner
  function handleExistingLearner(id) {
    setInputId(id);
    setLearnerId(id);
    setLoginMode("continue");
    // Load existing learner state
    API.getLearner(id)
      .then((r) => {
        setLearnerState(r.data);
        setOnboardingComplete(r.data.onboarding_complete || false);
        const map = {};
        Object.entries(r.data.concepts || {}).forEach(([cid, s]) => {
          map[cid] = { level: s.level, score: s.score };
        });
        setMasteryMap(map);
      })
      .catch(() => {});
  }

  // Handle onboarding complete
  function handleOnboardingComplete() {
    setOnboardingComplete(true);
    setTab("Graph");
    // Refresh learner state
    API.getLearner(learnerId)
      .then((r) => {
        setLearnerState(r.data);
        const map = {};
        Object.entries(r.data.concepts || {}).forEach(([cid, s]) => {
          map[cid] = { level: s.level, score: s.score };
        });
        setMasteryMap(map);
      })
      .catch(() => {});
  }

  async function handleReset() {
    if (!window.confirm(`Reset all progress for "${learnerId}"?`)) return;
    setResetting(true);
    await API.resetLearner(learnerId).catch(() => {});
    setMasteryMap({});
    setRefreshKey((k) => k + 1);
    setResetting(false);
  }

  function handleLearnerSwitch() {
    const id = inputId.trim();
    if (!id) return;
    setLearnerId(id);
    setMasteryMap({});
    setRefreshKey((k) => k + 1);
    // Load mastery from server
    API.getLearner(id)
      .then((r) => {
        const map = {};
        Object.entries(r.data.concepts || {}).forEach(([cid, s]) => {
          map[cid] = { level: s.level, score: s.score };
        });
        setMasteryMap(map);
        setLearnerState(r.data);
      })
      .catch(() => {});
  }

  // Show onboarding flow if learner is new and not completed onboarding
  if (loginMode === "new" && !onboardingComplete) {
    return (
      <OnboardingFlow
        learnerId={learnerId || ""}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  // Show login panel if no learner selected
  if (!learnerId) {
    return (
      <LoginPanel
        onSelectMode={handleNewLearner}
        onExistingLearner={handleExistingLearner}
      />
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Top bar ── */}
      <header
        style={{
          background: "#12151f",
          borderBottom: "1px solid #1e2235",
          padding: "0 20px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          height: 52,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontWeight: 800,
            fontSize: 16,
            color: "#818cf8",
            letterSpacing: "-0.02em",
            whiteSpace: "nowrap",
          }}
        >
          🧠 AdaptLearn
        </span>

        {/* Learner ID */}
        <div className="flex items-center gap-8" style={{ marginLeft: 8 }}>
          <input
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLearnerSwitch()}
            placeholder="Learner ID"
            style={{ width: 140, padding: "4px 10px", fontSize: 13 }}
          />
          <button
            className="btn btn-ghost"
            style={{ padding: "4px 12px", fontSize: 12 }}
            onClick={handleLearnerSwitch}
          >
            Switch
          </button>
          <span style={{ fontSize: 11, color: "#475569" }}>
            Learner: <strong style={{ color: "#818cf8" }}>{learnerId}</strong>
          </span>
        </div>

        {/* Tabs */}
        <nav className="flex gap-8" style={{ marginLeft: "auto" }}>
          {TABS.map((t) => (
            <button
              key={t}
              style={{
                background: "none",
                border: "none",
                color: tab === t ? "#818cf8" : "#64748b",
                fontWeight: tab === t ? 700 : 400,
                fontSize: 14,
                padding: "0 8px",
                borderBottom:
                  tab === t ? "2px solid #818cf8" : "2px solid transparent",
                cursor: "pointer",
                height: 52,
                transition: "color .15s",
              }}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </nav>

        <button
          className="btn btn-ghost"
          style={{
            padding: "4px 12px",
            fontSize: 11,
            marginLeft: 8,
            color: "#ef4444",
            borderColor: "#ef444444",
          }}
          disabled={resetting}
          onClick={handleReset}
        >
          {resetting ? "…" : "Reset"}
        </button>
      </header>

      {/* ── Body ── */}
      <main style={{ flex: 1, overflow: "hidden", display: "flex", gap: 0 }}>
        {/* Graph tab — KG left, Interview right */}
        {tab === "Graph" && (
          <div
            style={{ display: "flex", width: "100%", height: "100%", gap: 0 }}
          >
            <div style={{ flex: 1, overflow: "hidden", padding: 16 }}>
              <KGGraph
                learnerId={learnerId}
                masteryMap={masteryMap}
                onNodeClick={(n) => selectConcept(n.id, n.label)}
              />
            </div>
            <div
              style={{
                width: 380,
                flexShrink: 0,
                padding: 16,
                overflow: "auto",
                borderLeft: "1px solid var(--border)",
              }}
            >
              <InterviewPanel
                learnerId={learnerId}
                conceptId={selectedCid}
                conceptName={selectedName}
                onComplete={onInterviewDone}
              />
            </div>
          </div>
        )}

        {/* Roadmap tab */}
        {tab === "Roadmap" && (
          <div style={{ width: "100%", padding: 20, overflow: "auto" }}>
            <RoadmapPanel
              learnerId={learnerId}
              onConceptSelect={selectConcept}
            />
          </div>
        )}

        {/* Personalized Roadmap tab */}
        {tab === "Personalized" && (
          <div style={{ width: "100%", overflow: "auto" }}>
            <PersonalizedRoadmap
              learnerId={learnerId}
              onConceptSelect={selectConcept}
            />
          </div>
        )}

        {/* Mastery tab */}
        {tab === "Mastery" && (
          <div style={{ width: "100%", padding: 20, overflow: "auto" }}>
            <MasteryPanel
              learnerId={learnerId}
              refreshKey={refreshKey}
              onConceptSelect={selectConcept}
            />
          </div>
        )}

        {/* Interview tab (standalone) */}
        {tab === "Interview" && (
          <div
            style={{
              width: "100%",
              maxWidth: 720,
              margin: "0 auto",
              padding: 20,
              overflow: "auto",
            }}
          >
            {/* Concept selector */}
            <div
              className="card flex items-center gap-12"
              style={{ marginBottom: 16 }}
            >
              <span
                className="text-muted text-sm"
                style={{ whiteSpace: "nowrap" }}
              >
                Concept:
              </span>
              <ConceptSelector
                learnerId={learnerId}
                value={selectedCid}
                onChange={(id, name) => {
                  setSelectedCid(id);
                  setSelectedName(name);
                }}
              />
            </div>
            <InterviewPanel
              learnerId={learnerId}
              conceptId={selectedCid}
              conceptName={selectedName}
              onComplete={onInterviewDone}
            />
          </div>
        )}

        {/* Goals tab */}
        {tab === "Goals" && (
          <div style={{ width: "100%", height: "100%" }}>
            <GoalPanel learnerId={learnerId} learnerState={learnerState} />
          </div>
        )}
      </main>
    </div>
  );
}

// Small inline concept picker
function ConceptSelector({ value, onChange }) {
  const [concepts, setConcepts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;
    API.getRoadmap()
      .then((r) => {
        setConcepts(r.data.roadmap || []);
        setLoaded(true);
      })
      .catch(() => {});
  }, []);

  return (
    <select
      value={value || ""}
      onChange={(e) => {
        const c = concepts.find((x) => x.id === e.target.value);
        if (c) onChange(c.id, c.name);
      }}
      style={{ flex: 1 }}
    >
      <option value="">— Select a concept —</option>
      {concepts.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name} ({c.difficulty})
        </option>
      ))}
    </select>
  );
}

// Need useState/useEffect in ConceptSelector
