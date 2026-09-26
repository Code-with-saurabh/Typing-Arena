import { Routes, Route, NavLink, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Solo from './pages/Solo.jsx';
import Multi from './pages/Multi.jsx';
import Room from './pages/Room.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import { useSettings } from './context/SettingsContext.jsx';
import { sfx } from './utils/sounds.js';
import { useEffect } from 'react';

export default function App() {
  const settings = useSettings();

  useEffect(() => {
    sfx.setEnabled(settings.sound);
    sfx.setKeySound(settings.keySound);
  }, [settings.sound, settings.keySound]);

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="logo">
          <span className="logo-mark">T</span>
          typing<span className="logo-accent">arena</span>
        </Link>
        <nav>
          <NavLink to="/solo">solo</NavLink>
          <NavLink to="/multiplayer">multiplayer</NavLink>
          <NavLink to="/leaderboard">leaderboard</NavLink>
          <NavLink to="/settings">settings</NavLink>
        </nav>
        <div className="topbar-right">
          <button
            type="button"
            className="icon-btn"
            title="toggle theme"
            onClick={() => settings.set({ theme: settings.theme === 'light' ? 'dark' : 'light' })}
          >
            {settings.theme === 'light' ? '◐' : '◑'}
          </button>
          <span className="whoami">{settings.nickname || 'guest'}</span>
        </div>
      </header>

      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/solo" element={<Solo />} />
          <Route path="/multiplayer" element={<Multi />} />
          <Route path="/room/:code" element={<Room />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}
