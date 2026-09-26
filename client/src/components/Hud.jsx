function fmtTime(ms, countdown) {
  const s = Math.max(0, ms) / 1000;
  if (countdown) return s.toFixed(1);
  const m = Math.floor(s / 60);
  const rest = Math.floor(s % 60);
  return `${m}:${String(rest).padStart(2, '0')}`;
}

export default function Hud({ engine, kind, progressLabel }) {
  const { stats, remainingMs } = engine;
  const started = Boolean(engine.startedAt);
  return (
    <div className={`hud${started ? '' : ' hud-idle'}`}>
      <div className="hud-time">
        {remainingMs != null
          ? fmtTime(remainingMs, kind === 'time')
          : fmtTime(stats.elapsedMs, false)}
      </div>
      <div className="hud-center">
        <div className="hud-stat">
          <span className="hud-value">{started ? Math.round(stats.wpm) : '--'}</span>
          <span className="hud-label">wpm</span>
        </div>
        <div className="hud-stat">
          <span className="hud-value">{started ? `${Math.round(stats.accuracy)}%` : '--'}</span>
          <span className="hud-label">acc</span>
        </div>
        {kind !== 'time' && (
          <div className="hud-stat">
            <span className="hud-value">{progressLabel}</span>
            <span className="hud-label">progress</span>
          </div>
        )}
      </div>
      <div className="hud-raw">
        <span className="hud-value">{started ? Math.round(stats.raw) : '--'}</span>
        <span className="hud-label">raw</span>
      </div>
    </div>
  );
}
