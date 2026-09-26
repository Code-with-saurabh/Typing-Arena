import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSocket } from '../utils/socket.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { useTypingEngine } from '../hooks/useTypingEngine.js';
import TypingBox from '../components/TypingBox.jsx';
import Hud from '../components/Hud.jsx';
import Standings from '../components/Standings.jsx';
import Podium from '../components/Podium.jsx';
import ScoreSubmit from '../components/ScoreSubmit.jsx';
import { sfx } from '../utils/sounds.js';

const ERRORS = {
  room_not_found: 'room not found — it may have closed',
  room_full: 'that room is full',
  race_in_progress: 'that race already started',
  nickname_required: 'set a nickname first',
};

export default function Room() {
  const { code } = useParams();
  const navigate = useNavigate();
  const settings = useSettings();
  const socket = getSocket();

  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [countdownEndsAt, setCountdownEndsAt] = useState(null);
  const [tickLeft, setTickLeft] = useState(3);
  const [racePlayers, setRacePlayers] = useState([]);
  const [results, setResults] = useState(null);
  const [copied, setCopied] = useState(false);
  const raceStartedRef = useRef(false);

  const lastCountdownRef = useRef(null);
  const nickname = settings.nickname;

  const onProgress = useCallback((p) => {
    socket.emit('progress', p);
  }, [socket]);

  const onRaceDone = useCallback(() => {
    sfx.finish();
  }, []);

  const engine = useTypingEngine({
    kind: room?.settings.mode || 'time',
    limitSeconds: room?.settings.limit || 30,
    active: room?.state === 'racing' && !results,
    onProgress,
    onDone: onRaceDone,
  });

  useEffect(() => {
    if (!nickname) return undefined;

    const join = () => {
      socket.emit('joinRoom', { code: code.toUpperCase(), nickname }, (res) => {
        if (res?.ok) {
          setRoom(res.state);
          setRacePlayers(res.state.players.map((p) => ({ ...p })));
        } else {
          setError(ERRORS[res?.error] || 'could not join room');
        }
      });
    };

    const onRoomState = (state) => {
      setRoom(state);
      if (state.state !== 'racing') raceStartedRef.current = false;
    };
    const onCountdown = ({ endsAt, state }) => {
      setRoom(state);
      setCountdownEndsAt(endsAt);
      lastCountdownRef.current = null;
      sfx.countdown();
    };
    const onStart = (state) => {
      raceStartedRef.current = true;
      setResults(null);
      setCountdownEndsAt(null);
      setRoom(state);
      setRacePlayers(state.players.map((p) => ({ ...p })));
      engine.reset(state.text, { deadlineAt: state.endsAt || null });
      sfx.go();
    };
    const onTick = ({ players }) => setRacePlayers(players);
    const onFinishedTag = () => {};
    const onResults = (r) => {
      setResults(r);
      sfx.podium();
    };

    join();
    socket.on('connect', join);
    socket.on('roomState', onRoomState);
    socket.on('countdown', onCountdown);
    socket.on('raceStart', onStart);
    socket.on('raceTick', onTick);
    socket.on('playerFinished', onFinishedTag);
    socket.on('raceResults', onResults);

    return () => {
      socket.off('connect', join);
      socket.off('roomState', onRoomState);
      socket.off('countdown', onCountdown);
      socket.off('raceStart', onStart);
      socket.off('raceTick', onTick);
      socket.off('playerFinished', onFinishedTag);
      socket.off('raceResults', onResults);
      socket.emit('leaveRoom');
    };
  }, [socket, code, nickname, engine.reset]);

  useEffect(() => {
    if (!countdownEndsAt) return undefined;
    const id = setInterval(() => {
      const left = Math.ceil((countdownEndsAt - Date.now()) / 1000);
      setTickLeft(Math.max(0, left));
      if (left > 0 && left !== lastCountdownRef.current) {
        lastCountdownRef.current = left;
        sfx.countdown();
      }
      if (left <= 0) setCountdownEndsAt(null);
    }, 80);
    return () => clearInterval(id);
  }, [countdownEndsAt]);

  if (!nickname) {
    return (
      <div className="page room">
        <div className="card center-card">
          <h3>join room {code}</h3>
          <p>pick a nickname before entering the race.</p>
          <input
            className="input"
            autoFocus
            maxLength={20}
            placeholder="nickname"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim().length >= 2) {
                settings.set({ nickname: e.target.value.trim() });
              }
            }}
          />
          <p className="hint">press enter to continue</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page room">
        <div className="card center-card">
          <h3>oops</h3>
          <p className="form-error">{error}</p>
          <button type="button" className="btn btn-yellow" onClick={() => navigate('/multiplayer')}>
            back to multiplayer
          </button>
        </div>
      </div>
    );
  }

  if (!room) {
    return <div className="page room"><div className="loading">connecting to room…</div></div>;
  }

  const isHost = room.hostId && room.players.find((p) => p.id === room.hostId)?.id === socket.id;
  const me = room.players.find((p) => p.id === socket.id);
  const phase = room.state;

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const leave = () => {
    socket.emit('leaveRoom');
    navigate('/multiplayer');
  };

  const setReady = (ready) => socket.emit('setReady', { ready });
  const start = () => socket.emit('startRace');
  const rematch = () => socket.emit('rematch');
  const update = (patch) => socket.emit('updateSettings', patch);

  const modeKey = room.settings.mode === 'time'
    ? `time-${room.settings.limit}`
    : room.settings.mode === 'words'
      ? `words-${room.settings.words}`
      : 'quote';

  const ownRank = results ? results.rankings.find((r) => r.id === socket.id) : null;
  const submitResults = ownRank
    ? {
        wpm: ownRank.wpm,
        raw: engine.stats.raw || ownRank.rawWpm,
        accuracy: ownRank.accuracy,
        durationMs: ownRank.elapsedMs,
        correct: engine.stats.correct,
        incorrect: engine.stats.incorrect,
      }
    : null;

  return (
    <div className="page room">
      <div className="room-top">
        <div className="room-id">
          <span className="room-label">room</span>
          <button type="button" className="room-code-btn" onClick={copyCode} title="copy code">
            {room.code} {copied ? '✓ copied' : '⧉'}
          </button>
        </div>
        <div className="room-meta-chips">
          <span className="chip static">{room.settings.mode}</span>
          {room.settings.mode === 'time' && <span className="chip static">{room.settings.limit}s</span>}
          {room.settings.mode === 'words' && <span className="chip static">{room.settings.words} words</span>}
          <span className="chip static">{room.players.length}/{room.settings.maxPlayers} players</span>
        </div>
        <button type="button" className="btn btn-ghost" onClick={leave}>leave</button>
      </div>

      {(phase === 'lobby' || phase === 'countdown') && (
        <div className="lobby">
          <section className="card lobby-settings">
            <h3>race settings {isHost && <span className="tag">you are host</span>}</h3>
            <div className="form-row">
              <span className="form-label">mode</span>
              <div className="chip-group">
                {['time', 'words', 'quote'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={!isHost || phase === 'countdown'}
                    className={`chip${room.settings.mode === m ? ' active' : ''}`}
                    onClick={() => update({ mode: m })}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            {room.settings.mode === 'time' && (
              <div className="form-row">
                <span className="form-label">seconds</span>
                <div className="chip-group">
                  {[15, 30, 60, 120].map((t) => (
                    <button
                      key={t}
                      type="button"
                      disabled={!isHost}
                      className={`chip${room.settings.limit === t ? ' active' : ''}`}
                      onClick={() => update({ limit: t })}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {room.settings.mode === 'words' && (
              <div className="form-row">
                <span className="form-label">words</span>
                <div className="chip-group">
                  {[25, 50, 100].map((w) => (
                    <button
                      key={w}
                      type="button"
                      disabled={!isHost}
                      className={`chip${room.settings.words === w ? ' active' : ''}`}
                      onClick={() => update({ words: w })}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="form-row">
              <span className="form-label">text</span>
              <div className="chip-group">
                {[['basic', 'common'], ['extended', 'extended']].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    disabled={!isHost}
                    className={`chip${room.settings.source === id ? ' active' : ''}`}
                    onClick={() => update({ source: id })}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={!isHost}
                  className={`chip${room.settings.punctuation ? ' active' : ''}`}
                  onClick={() => update({ punctuation: !room.settings.punctuation })}
                >
                  punctuation
                </button>
                <button
                  type="button"
                  disabled={!isHost}
                  className={`chip${room.settings.numbers ? ' active' : ''}`}
                  onClick={() => update({ numbers: !room.settings.numbers })}
                >
                  numbers
                </button>
              </div>
            </div>

            <div className="lobby-actions">
              <button
                type="button"
                className={`btn ${me?.ready ? 'btn-ghost' : 'btn-yellow'}`}
                onClick={() => setReady(!me?.ready)}
              >
                {me?.ready ? 'ready ✓' : 'im ready'}
              </button>
              {isHost && (
                <button type="button" className="btn btn-yellow btn-lg" onClick={start}>
                  start race
                </button>
              )}
              {!isHost && <span className="hint">waiting for the host to start…</span>}
            </div>
          </section>

          <section className="card lobby-players">
            <h3>racers</h3>
            <div className="player-grid">
              {room.players.map((p) => (
                <div key={p.id} className={`player-card${p.id === socket.id ? ' me' : ''}`}>
                  <span className="player-dot big" style={{ background: p.color }} />
                  <b>{p.nickname}</b>
                  <span className="player-flags">
                    {p.id === room.hostId && <em className="tag">host</em>}
                    {p.ready && <em className="tag ready">ready</em>}
                  </span>
                </div>
              ))}
            </div>
            <p className="hint">share code <b>{room.code}</b> with friends to let them join.</p>
          </section>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="countdown-overlay">
          <span key={tickLeft} className="countdown-num">{tickLeft || 'GO'}</span>
        </div>
      )}

      {phase === 'racing' && !results && (
        <div className="race-layout">
          <div className="race-main">
            <Hud
              engine={engine}
              kind={room.settings.mode}
              progressLabel={`${engine.typed.length}/${engine.text.length}`}
            />
            <TypingBox engine={engine} fontSize={settings.fontSize} caretStyle={settings.caret} />
            {engine.done && (
              <div className="waiting-banner">
                finished! waiting for the other racers…
              </div>
            )}
          </div>
          <aside className="race-side">
            <Standings players={racePlayers} meId={socket.id} />
          </aside>
        </div>
      )}

      {results && (
        <div className="race-results">
          <div className="results-title">
            <h2>{results.rankings[0]?.nickname} wins the race!</h2>
            <p>{modeKey} · everyone typed the same text</p>
          </div>
          <Podium rankings={results.rankings} />
          <div className="card results-actions">
            {submitResults && <ScoreSubmit results={submitResults} modeKey={modeKey} multiplayer />}
            <div className="btn-row">
              {isHost && (
                <button type="button" className="btn btn-yellow" onClick={rematch}>rematch</button>
              )}
              <button type="button" className="btn btn-ghost" onClick={leave}>leave room</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
