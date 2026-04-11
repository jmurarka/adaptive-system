import { useState, useEffect } from 'react';
import { API } from '../api/client';

const LEVEL_COLOR = {
  strong:  '#22c55e',
  partial: '#f59e0b',
  weak:    '#ef4444',
  unknown: '#475569',
};

const DIFF_ORDER = { beginner:0, intermediate:1, advanced:2 };

export default function MasteryPanel({ learnerId, onConceptSelect, refreshKey = 0 }) {
  const [data,    setData]    = useState(null);
  const [kg,      setKG]      = useState(null);
  const [filter,  setFilter]  = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!learnerId) return;
    setLoading(true);
    Promise.all([
      API.getLearner(learnerId),
      API.getGraph(),
    ]).then(([lr, gr]) => {
      setData(lr.data);
      // Build id → node map
      const map = {};
      gr.data.nodes.forEach(n => { map[n.id] = n; });
      setKG(map);
    }).finally(() => setLoading(false));
  }, [learnerId, refreshKey]);

  if (loading || !data || !kg) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200 }}>
      <div className="spinner" />
    </div>
  );

  const concepts = data.concepts || {};
  const entries = Object.entries(concepts)
    .map(([id, s]) => ({ id, ...s, kgNode: kg[id] || {} }))
    .sort((a, b) =>
      (DIFF_ORDER[a.kgNode.difficulty] ?? 1) - (DIFF_ORDER[b.kgNode.difficulty] ?? 1)
    );

  const filtered = filter === 'all' ? entries
    : entries.filter(e => e.level === filter);

  const counts = {
    strong:  entries.filter(e => e.level === 'strong').length,
    partial: entries.filter(e => e.level === 'partial').length,
    weak:    entries.filter(e => e.level === 'weak').length,
    unknown: entries.filter(e => e.level === 'unknown').length,
  };
  const total = entries.length;
  const done  = counts.strong + counts.partial;
  const pct   = Math.round((done / total) * 100);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* Summary */}
      <div className="card">
        <div className="flex justify-between items-center" style={{ marginBottom:8 }}>
          <span style={{ fontWeight:700 }}>Overall Progress</span>
          <span style={{ fontWeight:700, fontSize:18, color: pct >= 70 ? '#22c55e' : '#f59e0b' }}>
            {pct}%
          </span>
        </div>
        <div className="progress-bar" style={{ height:8 }}>
          <div className="progress-bar-fill" style={{ width:`${pct}%` }} />
        </div>
        <div className="flex gap-16 mt-12" style={{ flexWrap:'wrap' }}>
          {Object.entries(counts).map(([lvl, n]) => (
            <span key={lvl} style={{ fontSize:12 }}>
              <span style={{ color: LEVEL_COLOR[lvl], fontWeight:700 }}>{n}</span>
              <span className="text-muted"> {lvl}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-8" style={{ flexWrap:'wrap' }}>
        {['all','strong','partial','weak','unknown'].map(f => (
          <button key={f} className={`btn ${filter===f ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding:'4px 12px', fontSize:11 }}
            onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
            {f !== 'all' && <span style={{ marginLeft:4, opacity:.7 }}>({counts[f]??0})</span>}
          </button>
        ))}
      </div>

      {/* Concept cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:8 }}>
        {filtered.map(e => {
          const color = LEVEL_COLOR[e.level] || '#475569';
          const pctVal = Math.round((e.score || 0) * 100);
          return (
            <div key={e.id} className="card"
              style={{ borderLeft:`3px solid ${color}`, cursor:'pointer', transition:'transform .1s' }}
              onClick={() => onConceptSelect && onConceptSelect(e.id, e.kgNode.label || e.id)}
              onMouseEnter={ev => ev.currentTarget.style.transform='translateY(-2px)'}
              onMouseLeave={ev => ev.currentTarget.style.transform=''}>
              <div className="flex justify-between items-center">
                <span style={{ fontWeight:600, fontSize:13 }}>{e.kgNode.label || e.id}</span>
                <span className={`badge badge-${e.level}`}>{e.level}</span>
              </div>
              <div className="progress-bar mt-8">
                <div className="progress-bar-fill" style={{ width:`${pctVal}%`, background:color }} />
              </div>
              <div className="flex justify-between mt-8 text-sm text-muted">
                <span>{e.kgNode.difficulty}</span>
                <span style={{ color }}>{pctVal}%</span>
              </div>
              {e.attempts > 0 && (
                <div className="text-sm text-muted mt-8">
                  {e.attempts} attempt{e.attempts!==1?'s':''} ·
                  {e.last_updated
                    ? ' ' + new Date(e.last_updated).toLocaleDateString()
                    : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
