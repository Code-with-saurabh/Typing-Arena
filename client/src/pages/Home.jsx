import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext.jsx';
import { fetchStats } from '../utils/api.js';

export default function Home() {
  const settings = useSettings();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let alive = true;
    if (settings.nickname) {
      fetchStats(settings.nickname)
        .then((d) => alive && setStats(d))
        .catch(() => alive && setStats(null));
    } else {
      setStats(null);
    }
    return () => { alive = false; };
  }, [settings.nickname]);

  return (
    <div className="home">
      <section className="hero">
        <p className="hero-kicker">realtime typing races</p>
        <h1>
          type <span className="accent">faster</span>, race <span className="accent">friends</span>,
        </h1>
        <h1>win the <span className="accent">lobby</span>.</h1>
        <p className="hero-sub">
          solo tests with live wpm, accuracy and heatmaps — or create a room, share the code and
          watch your friends type in realtime.
        </p>

        <div className="hero-nick">
          <label htmlFor="home-nick">playing as</label>
          <input
            id="home-nick"
            className="input"
            value={settings.nickname}
            maxLength={20}
            placeholder="enter nickname"
            onChange={(e) => settings.set({ nickname: e.target.value })}
          />
          {stats && (
            <span className="hero-stats">
              best <b>{Math.round(stats.best?.wpm || 0)}</b> wpm · {stats.runs} runs
            </span>
          )}
        </div>

        <div className="hero-actions">
          <Link className="btn btn-yellow btn-lg" to="/solo">start solo test</Link>
          <Link className="btn btn-ghost btn-lg" to="/multiplayer">create / join room</Link>
        </div>
      </section>

      <section className="feature-grid">
        <Link to="/solo" className="card feature">
          <h3>⏱ solo modes</h3>
          <p>15/30/60/120s sprints, word counts, quotes and your own custom text.</p>
        </Link>
        <Link to="/multiplayer" className="card feature">
          <h3>🏁 multiplayer rooms</h3>
          <p>2–8 players, one code, live positions and a podium at the finish line.</p>
        </Link>
        <Link to="/leaderboard" className="card feature">
          <h3>🏆 global leaderboard</h3>
          <p>Every saved run is ranked by wpm per mode. Climb the board.</p>
        </Link>
        <div className="card feature">
          <h3>🎨 yellow · white · graphite</h3>
          <p>Light-first theme built from yellow blended with white, gray and black overlays.</p>
        </div>
      </section>
    </div>
  );
}
