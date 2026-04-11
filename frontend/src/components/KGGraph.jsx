import { useEffect, useRef, useState } from 'react';
import { API } from '../api/client';

const DIFF_COLOR = {
  beginner:     '#22c55e',
  intermediate: '#f59e0b',
  advanced:     '#ef4444',
};

const MASTERY_COLOR = {
  strong:  '#22c55e',
  partial: '#f59e0b',
  weak:    '#ef4444',
  unknown: '#475569',
};

export default function KGGraph({ learnerId, masteryMap = {}, onNodeClick }) {
  const canvasRef = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const nodesRef = useRef([]);
  const animRef = useRef(null);

  useEffect(() => {
    API.getGraph().then(r => setGraphData(r.data));
  }, []);

  useEffect(() => {
    if (!graphData) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    // Build node positions with a simple layered layout
    const nodes = graphData.nodes.map((n, i) => ({
      ...n,
      x: 80 + ((n.position - 1) % 5) * ((W - 160) / 4),
      y: 60 + Math.floor((n.position - 1) / 5) * 110,
      vx: 0, vy: 0,
    }));
    nodesRef.current = nodes;

    const edges = graphData.edges;
    const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));

    let dragging = null;

    // Simple force simulation
    function tick() {
      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const dist = Math.sqrt(dx*dx + dy*dy) || 1;
          if (dist < 120) {
            const f = (120 - dist) / dist * 0.3;
            a.vx -= dx * f; a.vy -= dy * f;
            b.vx += dx * f; b.vy += dy * f;
          }
        }
      }
      // Spring edges
      for (const e of edges) {
        const s = nodeById[e.source], t = nodeById[e.target];
        if (!s || !t) continue;
        const dx = t.x - s.x, dy = t.y - s.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        const f = (dist - 140) / dist * 0.05;
        s.vx += dx * f; s.vy += dy * f;
        t.vx -= dx * f; t.vy -= dy * f;
      }
      // Integrate + dampen
      for (const n of nodes) {
        if (n === dragging) continue;
        n.x += n.vx; n.y += n.vy;
        n.vx *= 0.85; n.vy *= 0.85;
        n.x = Math.max(50, Math.min(W - 50, n.x));
        n.y = Math.max(30, Math.min(H - 30, n.y));
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Edges
      for (const e of edges) {
        const s = nodeById[e.source], t = nodeById[e.target];
        if (!s || !t) continue;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        // Arrow
        const angle = Math.atan2(t.y - s.y, t.x - s.x);
        const ex = t.x - Math.cos(angle) * 22;
        const ey = t.y - Math.sin(angle) * 22;
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = '#2e3450';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - 8*Math.cos(angle-0.35), ey - 8*Math.sin(angle-0.35));
        ctx.lineTo(ex - 8*Math.cos(angle+0.35), ey - 8*Math.sin(angle+0.35));
        ctx.closePath();
        ctx.fillStyle = '#2e3450';
        ctx.fill();
      }

      // Nodes
      for (const n of nodes) {
        const mastery = masteryMap[n.id]?.level || 'unknown';
        const baseColor = DIFF_COLOR[n.difficulty] || '#6366f1';
        const ringColor = MASTERY_COLOR[mastery];

        // Ring
        ctx.beginPath();
        ctx.arc(n.x, n.y, 24, 0, Math.PI * 2);
        ctx.fillStyle = ringColor + '33';
        ctx.fill();
        ctx.strokeStyle = ringColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner circle
        ctx.beginPath();
        ctx.arc(n.x, n.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = baseColor + '22';
        ctx.fill();

        // Label
        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const words = n.label.split(' ');
        if (words.length <= 2) {
          ctx.fillText(n.label.length > 12 ? n.label.slice(0,11)+'…' : n.label, n.x, n.y);
        } else {
          ctx.fillText(words.slice(0,2).join(' '), n.x, n.y - 5);
          ctx.fillText(words.slice(2).join(' '), n.x, n.y + 7);
        }
      }
    }

    function loop() {
      tick(); draw();
      animRef.current = requestAnimationFrame(loop);
    }
    animRef.current = requestAnimationFrame(loop);

    // Mouse events
    function getNode(mx, my) {
      return nodes.find(n => Math.hypot(n.x - mx, n.y - my) < 24);
    }
    function onMouseMove(e) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const n = getNode(mx, my);
      canvas.style.cursor = n ? 'pointer' : 'default';
      setTooltip(n ? { x: e.clientX, y: e.clientY, node: n } : null);
      if (dragging) { dragging.x = mx; dragging.y = my; }
    }
    function onMouseDown(e) {
      const rect = canvas.getBoundingClientRect();
      const n = getNode(e.clientX - rect.left, e.clientY - rect.top);
      if (n) dragging = n;
    }
    function onMouseUp(e) {
      const rect = canvas.getBoundingClientRect();
      const n = getNode(e.clientX - rect.left, e.clientY - rect.top);
      if (n && n === dragging && onNodeClick) onNodeClick(n);
      dragging = null;
    }

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
    };
  }, [graphData, masteryMap]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />

      {!graphData && (
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div className="spinner" />
        </div>
      )}

      {/* Legend */}
      <div className="card" style={{
        position: 'absolute', bottom: 12, left: 12, padding: '8px 12px',
        fontSize: 11, display: 'flex', gap: 12, alignItems: 'center'
      }}>
        {Object.entries(MASTERY_COLOR).map(([k, v]) => (
          <span key={k} className="flex items-center gap-8">
            <span style={{ width:10, height:10, borderRadius:'50%', background:v, display:'inline-block' }} />
            {k}
          </span>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x + 12, top: tooltip.y - 10,
          background: '#1a1d27', border: '1px solid #2e3450', borderRadius: 8,
          padding: '8px 12px', pointerEvents: 'none', zIndex: 999, fontSize: 12,
          maxWidth: 200,
        }}>
          <div style={{ fontWeight: 700 }}>{tooltip.node.label}</div>
          <div className="text-muted">{tooltip.node.difficulty} · {tooltip.node.effort}h</div>
          <div style={{ color: MASTERY_COLOR[masteryMap[tooltip.node.id]?.level || 'unknown'], marginTop: 2 }}>
            {masteryMap[tooltip.node.id]?.level || 'unknown'}
            {masteryMap[tooltip.node.id]?.score
              ? ` · ${(masteryMap[tooltip.node.id].score * 100).toFixed(0)}%` : ''}
          </div>
          <div className="text-muted mt-8" style={{ fontStyle:'italic' }}>Click to interview</div>
        </div>
      )}
    </div>
  );
}
