import { useState, useEffect } from 'react';
import { API } from '../api/client';

const ACTION_META = {
  learn:     { label:'Learn',     color:'#7dd3fc', bg:'#1e3a5f', icon:'📘' },
  review:    { label:'Review',    color:'#fde68a', bg:'#3b2f00', icon:'🔁' },
  reinforce: { label:'Reinforce', color:'#c4b5fd', bg:'#2d1b69', icon:'🔒' },
};

const DIFF_META = {
  beginner:     { color:'#22c55e', label:'Beginner' },
  intermediate: { color:'#f59e0b', label:'Intermediate' },
  advanced:     { color:'#ef4444', label:'Advanced' },
};

function OperatorBadge({ op }) {
  const color = op.startsWith('REINSERTION') ? '#c4b5fd'
              : op.startsWith('REMEDIATION')  ? '#fde68a'
              : op.startsWith('COMPRESSION')  ? '#7dd3fc'
              : '#94a3b8';
  return (
    <span style={{
      display:'inline-block', padding:'2px 8px', borderRadius:6,
      fontSize:10, fontWeight:700, color, border:`1px solid ${color}44`,
      background:`${color}11`, fontFamily:'monospace',
    }}>{op}</span>
  );
}

export default function RoadmapPanel({ learnerId, onConceptSelect }) {
  const [plan,     setPlan]     = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [expanded, setExpanded] = useState({});

  async function load() {
    if (!learnerId) return;
    setLoading(true);
    try {
      const [p, a] = await Promise.all([
        API.getPlan(learnerId),
        API.getAnalysis(learnerId),
      ]);
      setPlan(p.data);
      setAnalysis(a.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [learnerId]);

  if (loading && !plan) return (
    <div className="card" style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <div className="spinner" />
    </div>
  );

  if (!plan) return (
    <div className="card" style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%' }}>
      <p className="text-muted">No plan yet.</p>
    </div>
  );

  const steps = plan.steps || [];

  return (
    <div style={{ height:'100%', overflow:'auto', display:'flex', flexDirection:'column', gap:12 }}>

      {/* Header */}
      <div className="card flex items-center justify-between">
        <div>
          <h3 style={{ fontWeight:700, marginBottom:2 }}>Your Learning Roadmap</h3>
          <span className="text-muted text-sm">{steps.length} steps in current window</span>
        </div>
        <button className="btn btn-ghost" style={{ fontSize:12 }} onClick={load}>↺ Refresh</button>
      </div>

      {/* Replanning alerts */}
      {analysis?.replanning_needed && (
        <div className="card" style={{ borderColor:'#7c3aed44', background:'#1a0e40' }}>
          <div style={{ fontWeight:700, color:'#a78bfa', marginBottom:4 }}>⚡ Roadmap Replanned</div>
          <p className="text-muted text-sm">{analysis.replanning_reason}</p>
        </div>
      )}

      {/* Forgetting events */}
      {analysis?.forgetting_events?.length > 0 && (
        <div className="card" style={{ borderColor:'#ef444444', background:'#1f0808' }}>
          <div style={{ fontWeight:700, color:'#f87171', marginBottom:6 }}>⚠ Forgetting Detected</div>
          {analysis.forgetting_events.map(e => (
            <div key={e.concept_id} className="text-sm" style={{ marginBottom:4 }}>
              <span style={{ color:'#fca5a5', fontWeight:600 }}>{e.concept_name}</span>
              <span className="text-muted"> — now {e.current_level} ({(e.current_score*100).toFixed(0)}%)</span>
            </div>
          ))}
        </div>
      )}

      {/* Progress deviation */}
      {analysis && (
        <div className="card flex items-center gap-16" style={{ padding:'10px 16px' }}>
          <div>
            <div className="text-muted text-sm">Progress Deviation</div>
            <div style={{ fontWeight:700, fontSize:20,
              color: analysis.deviation > 2 ? '#ef4444' : analysis.deviation < -1 ? '#22c55e' : '#f59e0b' }}>
              {analysis.deviation > 0 ? `+${analysis.deviation}` : analysis.deviation} concepts
            </div>
          </div>
          <div style={{ color:'#94a3b8', fontSize:12 }}>
            {analysis.deviation > 2 ? '⬇ Behind schedule' :
             analysis.deviation < -1 ? '⬆ Ahead — roadmap compressed' :
             '✓ On track'}
          </div>
        </div>
      )}

      {/* Operators applied */}
      {plan.operators_applied?.length > 0 && (
        <div className="card" style={{ padding:'8px 14px' }}>
          <div className="text-muted text-sm" style={{ marginBottom:6 }}>Operators applied:</div>
          <div className="flex gap-8" style={{ flexWrap:'wrap' }}>
            {plan.operators_applied.map((op, i) => <OperatorBadge key={i} op={op} />)}
          </div>
        </div>
      )}

      {/* Steps */}
      <div>
        {steps.map((step, i) => {
          const meta = ACTION_META[step.action] || ACTION_META.learn;
          const diff = DIFF_META[/* we don't have difficulty here; fetch separately */ 'intermediate'];
          const isOpen = expanded[step.concept_id];
          return (
            <div key={step.concept_id} className="card"
              style={{ marginBottom:8, borderLeft:`3px solid ${meta.color}` }}>
              <div className="flex items-center justify-between"
                style={{ cursor:'pointer' }}
                onClick={() => setExpanded(e => ({ ...e, [step.concept_id]: !e[step.concept_id] }))}>
                <div className="flex items-center gap-12">
                  <span style={{ fontSize:18 }}>{meta.icon}</span>
                  <div>
                    <div style={{ fontWeight:600 }}>
                      <span style={{ color:'#475569', marginRight:8, fontSize:12 }}>#{i+1}</span>
                      {step.concept_name}
                    </div>
                    <span style={{
                      display:'inline-block', marginTop:3, padding:'1px 8px', borderRadius:6,
                      fontSize:10, fontWeight:700, color:meta.color, background:meta.bg,
                    }}>{meta.label}</span>
                  </div>
                </div>
                <span className="text-muted" style={{ fontSize:16 }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {isOpen && (
                <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
                  <p className="text-muted text-sm" style={{ marginBottom:10 }}>{step.reason}</p>
                  <button className="btn btn-primary" style={{ fontSize:12, padding:'6px 14px' }}
                    onClick={() => onConceptSelect && onConceptSelect(step.concept_id, step.concept_name)}>
                    Start Interview →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {steps.length === 0 && (
        <div className="card" style={{ textAlign:'center' }}>
          <p className="text-muted">🎉 All concepts mastered! No steps remaining.</p>
        </div>
      )}
    </div>
  );
}
