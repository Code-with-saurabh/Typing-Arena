import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSocket } from '../utils/socket.js';
import { useSettings } from '../context/SettingsContext.jsx';

const TIME_OPTIONS = [15, 30, 60, 120];
const WORD_OPTIONS = [25, 50, 100];

export default function Multi() {
  const navigate = useNavigate();
  const settings = useSettings();
  const [nickname, setNickname] = useState(settings.nickname);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [rooms, setRooms] = useState([]);
  const [settingsForm, setSettingsForm] = useState({
    mode: 'time',
    limit: 30,
    words: 50,
    source: 'basic',
    punctuation: false,
    numbers: false,
    maxPlayers: 4,
  });

  const socket = getSocket();

  useEffect(() => {
    const timer = setInterval(() => {
      socket.emit('listRooms', (res) => {
        if (res?.ok) setRooms(res.rooms);
      });
    }, 2500);
    socket.emit('listRooms', (res) => { if (res?.ok) setRooms(res.rooms); });
    return () => clearInterval(timer);
  }, [socket]);

  const saveNick = (nick) => {
    setNickname(nick);
    settings.set({ nickname: nick });
    return nick.trim();
  };

  const requireNick = () => {
    const nick = nickname.trim();
    if (nick.length < 2) {
      setError('enter a nickname first (2–20 characters)');
      return null;
    }
    saveNick(nickname);
    return nick;
  };

  const createRoom = () => {
    const nick = requireNick();
    if (!nick) return;
    setError('');
    socket.emit('createRoom', { nickname: nick, settings: settingsForm }, (res) => {
      if (res?.ok) navigate(`/room/${res.state.code}`);
      else setError(res?.error || 'could not create room');
    });
  };

  const joinRoom = (target) => {
    const nick = requireNick();
    if (!nick) return;
    const roomCode = (target || code).toUpperCase().trim();
    if (!roomCode) {
      setError('enter a room code');
      return;
    }
    setError('');
    socket.emit('joinRoom', { code: roomCode, nickname: nick }, (res) => {
      if (res?.ok) navigate(`/room/${res.state.code}`);
      else setError({
        room_not_found: 'room not found — check the code',
        room_full: 'that room is full',
        race_in_progress: 'that race already started',
      }[res?.error] || 'could not join room');
    });
  };

  const quickMatch = () => {
    const nick = requireNick();
    if (!nick) return;
    setError('');
    socket.emit('quickMatch', { nickname: nick }, (res) => {
      if (res?.ok) navigate(`/room/${res.state.code}`);
      else setError('could not find or create a room');
    });
  };

  const setForm = (patch) => setSettingsForm((f) => ({ ...f, ...patch }));

  return (
    <div className="page multi">
      <div className="page-head">
        <h2>multiplayer rooms</h2>
        <p>create a room, share the 6-character code, and race in realtime.</p>
      </div>

      <div className="nick-row">
        <label htmlFor="multi-nick">nickname</label>
        <input
          id="multi-nick"
          className="input"
          value={nickname}
          maxLength={20}
          placeholder="your name"
          onChange={(e) => setNickname(e.target.value)}
        />
      </div>

      {error && <div className="form-error">{error}</div>}

      <div className="multi-grid">
        <section className="card">
          <h3>create room</h3>
          <div className="form-row">
            <span className="form-label">mode</span>
            <div className="chip-group">
              {['time', 'words', 'quote'].map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`chip${settingsForm.mode === m ? ' active' : ''}`}
                  onClick={() => setForm({ mode: m })}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {settingsForm.mode === 'time' && (
            <div className="form-row">
              <span className="form-label">seconds</span>
              <div className="chip-group">
                {TIME_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`chip${settingsForm.limit === t ? ' active' : ''}`}
                    onClick={() => setForm({ limit: t })}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {settingsForm.mode === 'words' && (
            <div className="form-row">
              <span className="form-label">words</span>
              <div className="chip-group">
                {WORD_OPTIONS.map((w) => (
                  <button
                    key={w}
                    type="button"
                    className={`chip${settingsForm.words === w ? ' active' : ''}`}
                    onClick={() => setForm({ words: w })}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
          )}

          {settingsForm.mode !== 'quote' && (
            <div className="form-row">
              <span className="form-label">text</span>
              <div className="chip-group">
                {[['basic', 'common'], ['extended', 'extended']].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`chip${settingsForm.source === id ? ' active' : ''}`}
                    onClick={() => setForm({ source: id })}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  className={`chip${settingsForm.punctuation ? ' active' : ''}`}
                  onClick={() => setForm({ punctuation: !settingsForm.punctuation })}
                >
                  punctuation
                </button>
                <button
                  type="button"
                  className={`chip${settingsForm.numbers ? ' active' : ''}`}
                  onClick={() => setForm({ numbers: !settingsForm.numbers })}
                >
                  numbers
                </button>
              </div>
            </div>
          )}

          <div className="form-row">
            <span className="form-label">players</span>
            <div className="chip-group">
              {[2, 4, 6, 8].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`chip${settingsForm.maxPlayers === n ? ' active' : ''}`}
                  onClick={() => setForm({ maxPlayers: n })}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="btn btn-yellow btn-lg" onClick={createRoom}>
            create room
          </button>
        </section>

        <section className="card">
          <h3>join room</h3>
          <div className="join-row">
            <input
              className="input code-input"
              value={code}
              maxLength={6}
              placeholder="CODE"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
            />
            <button type="button" className="btn btn-yellow" onClick={() => joinRoom()}>
              join
            </button>
          </div>
          <button type="button" className="btn btn-ghost btn-block" onClick={quickMatch}>
            quick match — find an open room
          </button>

          <div className="room-list">
            <h4>open rooms</h4>
            {rooms.length === 0 && <p className="hint">no open rooms right now — be the first.</p>}
            {rooms.map((r) => (
              <button key={r.code} type="button" className="room-row" onClick={() => joinRoom(r.code)}>
                <span className="room-code">{r.code}</span>
                <span className="room-host">by {r.host}</span>
                <span className="room-meta">
                  {r.mode}{r.mode === 'time' ? ` ${r.limit}s` : r.mode === 'words' ? ` ${r.words}` : ''}
                </span>
                <span className="room-players">{r.players}/{r.maxPlayers}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
