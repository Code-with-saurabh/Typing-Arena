import { useState } from 'react';
import { useSettings } from '../context/SettingsContext.jsx';
import { fetchStats } from '../utils/api.js';

export default function SettingsPage() {
  const settings = useSettings();
  const [stats, setStats] = useState(null);
  const [checked, setChecked] = useState(false);

  const checkStats = () => {
    if (!settings.nickname) return;
    fetchStats(settings.nickname)
      .then((d) => { setStats(d); setChecked(true); })
      .catch(() => setStats(null));
  };

  return (
    <div className="page settings-page">
      <div className="page-head">
        <h2>settings</h2>
        <p>everything is saved locally in your browser.</p>
      </div>

      <div className="settings-grid">
        <section className="card">
          <h3>profile</h3>
          <label className="setting-row">
            <span>nickname</span>
            <input
              className="input"
              value={settings.nickname}
              maxLength={20}
              placeholder="used in rooms & leaderboard"
              onChange={(e) => settings.set({ nickname: e.target.value })}
            />
          </label>
          <div className="btn-row">
            <button type="button" className="btn btn-ghost" onClick={checkStats}>my stats</button>
          </div>
          {checked && stats && (
            <div className="stats-strip">
              <span>runs <b>{stats.runs}</b></span>
              <span>best <b>{Math.round(stats.best?.wpm || 0)}</b> wpm</span>
              <span>avg <b>{Math.round(stats.avg?.wpm || 0)}</b> wpm</span>
              <span>avg acc <b>{Math.round(stats.avg?.accuracy || 0)}%</b></span>
            </div>
          )}
        </section>

        <section className="card">
          <h3>appearance</h3>
          <label className="setting-row">
            <span>theme</span>
            <div className="chip-group">
              <button
                type="button"
                className={`chip${settings.theme === 'light' ? ' active' : ''}`}
                onClick={() => settings.set({ theme: 'light' })}
              >
                light
              </button>
              <button
                type="button"
                className={`chip${settings.theme === 'dark' ? ' active' : ''}`}
                onClick={() => settings.set({ theme: 'dark' })}
              >
                dark
              </button>
            </div>
          </label>
          <label className="setting-row">
            <span>text size</span>
            <div className="chip-group">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`chip${settings.fontSize === n ? ' active' : ''}`}
                  onClick={() => settings.set({ fontSize: n })}
                >
                  {n}
                </button>
              ))}
            </div>
          </label>
          <label className="setting-row">
            <span>caret</span>
            <div className="chip-group">
              {['line', 'block', 'off'].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip${settings.caret === c ? ' active' : ''}`}
                  onClick={() => settings.set({ caret: c })}
                >
                  {c}
                </button>
              ))}
            </div>
          </label>
        </section>

        <section className="card">
          <h3>gameplay</h3>
          <label className="setting-row">
            <span>sound effects</span>
            <button
              type="button"
              className={`toggle${settings.sound ? ' on' : ''}`}
              onClick={() => settings.set({ sound: !settings.sound })}
            >
              <i />
              {settings.sound ? 'on' : 'off'}
            </button>
          </label>
          <label className="setting-row">
            <span>default word pool</span>
            <div className="chip-group">
              {[['basic', 'common'], ['extended', 'extended']].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`chip${settings.source === id ? ' active' : ''}`}
                  onClick={() => settings.set({ source: id })}
                >
                  {label}
                </button>
              ))}
            </div>
          </label>
        </section>
      </div>
    </div>
  );
}
