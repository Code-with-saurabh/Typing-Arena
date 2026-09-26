export default function Standings({ players, meId, compact = false }) {
  const sorted = [...players].sort((a, b) => {
    const af = a.progress.finished;
    const bf = b.progress.finished;
    if (af !== bf) return af ? -1 : 1;
    if (af && bf) return a.progress.finishTime - b.progress.finishTime;
    return (b.progress.fraction || 0) - (a.progress.fraction || 0);
  });

  return (
    <div className={`standings${compact ? ' compact' : ''}`}>
      <div className="standings-head">
        <h4>live standings</h4>
        <span>{players.length} racer{players.length === 1 ? '' : 's'}</span>
      </div>
      {sorted.map((p, i) => (
        <div key={p.id} className={`standing${p.id === meId ? ' me' : ''}`}>
          <div className="standing-top">
            <span className="rank-badge">{i + 1}</span>
            <span className="player-dot" style={{ background: p.color }} />
            <span className="standing-name">{p.nickname}{p.id === meId ? ' (you)' : ''}</span>
            {p.progress.finished ? (
              <span className="finish-tag">done</span>
            ) : (
              <span className="standing-wpm">{Math.round(p.progress.wpm)}</span>
            )}
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${Math.round((p.progress.fraction || 0) * 100)}%`, background: p.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
