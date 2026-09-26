export default function Chart({ samples }) {
  if (!samples || samples.length < 2) {
    return <div className="chart-empty">not enough data for a chart</div>;
  }
  const W = 640;
  const H = 200;
  const P = 34;
  const maxSec = Math.max(...samples.map((s) => s.sec), 1);
  const maxWpm = Math.max(40, ...samples.map((s) => s.wpm));
  const x = (sec) => P + (sec / maxSec) * (W - P * 2);
  const yWpm = (v) => H - P - (v / maxWpm) * (H - P * 2);
  const yAcc = (v) => H - P - (v / 100) * (H - P * 2);

  const wpmPoints = samples.map((s) => `${x(s.sec).toFixed(1)},${yWpm(s.wpm).toFixed(1)}`).join(' ');
  const accPoints = samples.map((s) => `${x(s.sec).toFixed(1)},${yAcc(s.acc).toFixed(1)}`).join(' ');
  const areaPoints = `${P},${H - P} ${wpmPoints} ${x(maxSec).toFixed(1)},${H - P}`;
  const grid = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="wpm over time">
        {grid.map((g) => (
          <line
            key={g}
            x1={P}
            x2={W - P}
            y1={P + g * (H - P * 2)}
            y2={P + g * (H - P * 2)}
            className="chart-grid"
          />
        ))}
        <polygon points={areaPoints} className="chart-area" />
        <polyline points={accPoints} className="chart-acc" />
        <polyline points={wpmPoints} className="chart-wpm" />
        <text x={P - 6} y={P + 4} className="chart-label" textAnchor="end">{maxWpm}</text>
        <text x={P - 6} y={H - P + 4} className="chart-label" textAnchor="end">0</text>
        <text x={P} y={H - 8} className="chart-label">0s</text>
        <text x={W - P} y={H - 8} className="chart-label" textAnchor="end">{maxSec}s</text>
      </svg>
      <div className="chart-legend">
        <span><i className="dot dot-wpm" /> wpm</span>
        <span><i className="dot dot-acc" /> accuracy</span>
      </div>
    </div>
  );
}
