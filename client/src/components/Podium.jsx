const MEDALS = ['🥇', '🥈', '🥉'];

export default function Podium({ rankings }) {
  if (!rankings || rankings.length === 0) return null;
  const top = rankings.slice(0, 3);
  const order = top.length === 3 ? [top[1], top[0], top[2]] : top;

  return (
    <div className="podium-wrap">
      <div className="podium">
        {order.map((r) => (
          <div key={r.id} className={`podium-col rank-${r.rank}`}>
            <div className="podium-player">
              <span className="player-dot big" style={{ background: r.color }} />
              <b>{r.nickname}</b>
              <span className="podium-wpm">{Math.round(r.wpm)} wpm</span>
              <span className="podium-acc">{Math.round(r.accuracy)}% acc</span>
            </div>
            <div className="podium-block">
              <span className="podium-medal">{MEDALS[r.rank - 1] || ''}</span>
              <span className="podium-rank">{r.rank}</span>
            </div>
          </div>
        ))}
      </div>

      <table className="result-table">
        <thead>
          <tr>
            <th>#</th>
            <th>player</th>
            <th>wpm</th>
            <th>acc</th>
            <th>time</th>
            <th>status</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((r) => (
            <tr key={r.id} className={r.rank === 1 ? 'first' : ''}>
              <td>{MEDALS[r.rank - 1] || r.rank}</td>
              <td><span className="player-dot" style={{ background: r.color }} /> {r.nickname}</td>
              <td><b>{Math.round(r.wpm)}</b></td>
              <td>{Math.round(r.accuracy)}%</td>
              <td>{(r.elapsedMs / 1000).toFixed(1)}s</td>
              <td>{r.finished ? 'finished' : 'time up'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
