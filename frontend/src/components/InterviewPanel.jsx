import { useState, useEffect } from 'react';
import { API } from '../api/client';

const LEVEL_LABEL = { definitional: '① Define', application: '② Apply', synthesis: '③ Synthesise' };

function ScoreBar({ label, value }) {
  const pct = Math.round((value || 0) * 100);
  const color = value >= 0.75 ? '#22c55e' : value >= 0.5 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="flex justify-between text-sm text-muted" style={{ marginBottom: 4 }}>
        <span>{label}</span><span style={{ color }}>{pct}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function InterviewPanel({ learnerId, conceptId, conceptName, onComplete }) {
  const [questions, setQuestions]   = useState([]);
  const [current,   setCurrent]     = useState(0);
  const [answers,   setAnswers]     = useState({});  // questionId → text
  const [result,    setResult]      = useState(null);
  const [loading,   setLoading]     = useState(false);
  const [error,     setError]       = useState('');
  const [explain,   setExplain]     = useState('');

  useEffect(() => {
    setQuestions([]); setCurrent(0); setAnswers({}); setResult(null); setError('');
    if (!conceptId) return;
    API.getQuestions(conceptId)
      .then(r => setQuestions(r.data.questions))
      .catch(() => setError('No questions found for this concept.'));
  }, [conceptId]);

  const currentQ = questions[current];

  async function submitAll() {
    setLoading(true);
    try {
      const payload = {
        learner_id:  learnerId,
        concept_id:  conceptId,
        answers: Object.entries(answers).map(([question_id, answer]) => ({ question_id, answer })),
      };
      const r = await API.evaluate(payload);
      setResult(r.data);

      // Get RAG explanation
      const expR = await API.explainConcept(learnerId, conceptId);
      const exps = expR.data.explanations;
      const expText = Object.values(exps).join(' ') || '';
      setExplain(expText);

      if (onComplete) onComplete(r.data);
    } catch (e) {
      setError('Evaluation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const masteryColor = { strong: '#22c55e', partial: '#f59e0b', weak: '#ef4444' };

  if (!conceptId) return (
    <div className="card" style={{ height: '100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p className="text-muted">Select a concept from the graph to start an interview.</p>
    </div>
  );

  if (error && !questions.length) return (
    <div className="card" style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <p style={{ color: '#ef4444' }}>{error}</p>
    </div>
  );

  if (!questions.length) return (
    <div className="card" style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div className="spinner" />
    </div>
  );

  // ── Results view ──────────────────────────────────────────────────────────
  if (result) {
    const sig = result.mastery_signal;
    return (
      <div className="card flex-col gap-16" style={{ height:'100%', overflow:'auto', display:'flex' }}>
        <div className="flex items-center justify-between">
          <h3 style={{ fontWeight: 700 }}>Interview Complete: {conceptName}</h3>
          <span className={`badge badge-${sig}`}>{sig}</span>
        </div>

        <div style={{ textAlign:'center', padding: '12px 0' }}>
          <div style={{ fontSize: 48, fontWeight: 800,
                        color: masteryColor[sig] || '#94a3b8' }}>
            {Math.round(result.composite_score * 100)}%
          </div>
          <div className="text-muted">composite score</div>
        </div>

        <div>
          <ScoreBar label="Definition"  value={result.scores?.definition} />
          <ScoreBar label="Reasoning"   value={result.scores?.reasoning} />
          <ScoreBar label="Application" value={result.scores?.application} />
        </div>

        <div className="card" style={{ background: '#1e293b' }}>
          <div style={{ fontWeight:600, marginBottom:6 }}>Feedback</div>
          <p className="text-muted">{result.feedback}</p>
        </div>

        {explain && (
          <div className="card" style={{ background:'#1a2744', borderColor:'#2e4070' }}>
            <div style={{ fontWeight:600, marginBottom:6, color:'#818cf8' }}>🔍 AI Explanation</div>
            <p className="text-muted">{explain}</p>
          </div>
        )}

        {/* Per-question breakdown */}
        {result.per_question?.length > 0 && (
          <div>
            <div style={{ fontWeight:600, marginBottom:8 }}>Per-Question Scores</div>
            {result.per_question.map((pq, i) => (
              <div key={i} className="card" style={{ marginBottom:8, padding:'10px 14px' }}>
                <div className="flex justify-between text-sm">
                  <span>Q{i+1}</span>
                  <span style={{ color: masteryColor[pq.mastery_signal] }}>
                    {Math.round(pq.composite_score * 100)}% — {pq.mastery_signal}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-ghost" onClick={() => {
          setResult(null); setCurrent(0); setAnswers({});
        }}>Retake Interview</button>
      </div>
    );
  }

  // ── Question view ─────────────────────────────────────────────────────────
  const progress = ((current) / questions.length) * 100;
  const allAnswered = questions.every(q => (answers[q.id] || '').trim().length >= 10);

  return (
    <div className="card flex-col" style={{ height:'100%', overflow:'auto', display:'flex', gap:16 }}>
      {/* Header */}
      <div>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <h3 style={{ fontWeight:700 }}>Interview: {conceptName}</h3>
          <span className="text-muted text-sm">{current+1} / {questions.length}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width:`${progress}%` }} />
        </div>
      </div>

      {/* Question tabs */}
      <div className="flex gap-8" style={{ flexWrap:'wrap' }}>
        {questions.map((q, i) => (
          <button key={q.id} className="btn btn-ghost" style={{
            padding:'4px 12px', fontSize:11,
            borderColor: i === current ? 'var(--accent)' : undefined,
            color: answers[q.id] ? '#22c55e' : undefined,
          }} onClick={() => setCurrent(i)}>
            {LEVEL_LABEL[q.level] || `Q${i+1}`}
            {answers[q.id] ? ' ✓' : ''}
          </button>
        ))}
      </div>

      {/* Current question */}
      {currentQ && (
        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:12 }}>
          <div className="card" style={{ background:'#1e293b' }}>
            <div style={{ fontSize:11, color:'var(--accent2)', marginBottom:4, fontWeight:600 }}>
              {LEVEL_LABEL[currentQ.level] || currentQ.level}
            </div>
            <p style={{ fontSize:15, lineHeight:1.6 }}>{currentQ.text}</p>
          </div>

          <textarea
            placeholder="Type your answer here... (at least 10 characters)"
            value={answers[currentQ.id] || ''}
            onChange={e => setAnswers(a => ({ ...a, [currentQ.id]: e.target.value }))}
            style={{ flex:1, minHeight:140 }}
          />

          <div className="flex gap-8">
            {current > 0 && (
              <button className="btn btn-ghost" onClick={() => setCurrent(c => c-1)}>← Prev</button>
            )}
            {current < questions.length - 1 ? (
              <button className="btn btn-primary" style={{ marginLeft:'auto' }}
                onClick={() => setCurrent(c => c+1)}>Next →</button>
            ) : (
              <button className="btn btn-primary" style={{ marginLeft:'auto' }}
                disabled={!allAnswered || loading}
                onClick={submitAll}>
                {loading ? 'Evaluating…' : 'Submit All'}
              </button>
            )}
          </div>
          {!allAnswered && current === questions.length - 1 && (
            <p className="text-muted text-sm">Answer all questions before submitting.</p>
          )}
        </div>
      )}
    </div>
  );
}
