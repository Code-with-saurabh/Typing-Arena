import { useEffect, useState } from 'react';
import { fetchLeaderboard } from '../utils/api.js';
import { useSettings } from '../context/SettingsContext.jsx';

const MODES = [
  ['all', 'all'],
  ['time-15', '15s'],
  ['time-30', '30s'],
  ['time-60', '60s'],
  ['time-120', '120s'],
  ['words-25', '25w'],
  ['words-50', '50w'],
  ['words-100', '100w'],
  ['quote', 'quote'],
  ['custom', 'custom'],
];

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const settings = useSettings();
  const [mode, setMode] = useState('time-30');
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    fetchLeaderboard(mode)
      .then((d) => {
        if (!alive) return;
        setRows(d.rows);
        setStatus('ok');
      })
      .catch((err) => {
        if (!alive) return;
        setStatus(err.status === 503 ? 'db' : 'error');
      });
    return () => { alive = false; };
  }, [mode]);

  return (
    <div className="page leaderboard">
      <div className="page-head">
        <h2>global leaderboard</h2>
        <p>best saved runs, ranked by wpm for each mode.</p>
      </div>

      <div className="chip-group">
        {MODES.map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`chip${mode === id ? ' active' : ''}`}
            onClick={() => setMode(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card">
        {status === 'loading' && <div className="loading">loading rankings…</div>}
        {status === 'db' && (
          <div className="form-error">
            leaderboard needs the local MongoDB service running on port 27017.
          </div>
        )}
        {status === 'error' && <div className="form-error">could not reach the server.</div>}
        {status === 'ok' && rows.length === 0 && (
          <p className="hint">no scores for this mode yet — be the first.</p>
        )}
        {status === 'ok' && rows.length > 0 && (
          <table className="result-table">
            <thead>
              <tr>
                <th>#</th>
                <th>player</th>
                <th>wpm</th>
                <th>raw</th>
                <th>acc</th>
                <th>mode</th>
                <th>date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r._id}
                  className={`${i < 3 ? `place-${i + 1} ` : ''}${r.nickname === settings.nickname ? 'me' : ''}`}
                >
                  <td>{MEDALS[i] || i + 1}</td>
                  <td>{r.nickname}</td>
                  <td><b>{Math.round(r.wpm)}</b></td>
                  <td>{Math.round(r.rawWpm)}</td>
                  <td>{Math.round(r.accuracy)}%</td>
                  <td>{r.mode}</td>
                  <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
