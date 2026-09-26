import { useState } from 'react';
import { submitScore } from '../utils/api.js';
import { useSettings } from '../context/SettingsContext.jsx';

export default function ScoreSubmit({ results, modeKey, multiplayer = false }) {
  const settings = useSettings();
  const [nickname, setNickname] = useState(settings.nickname);
  const [status, setStatus] = useState({ state: 'idle' });

  if (!results) return null;

  const submit = async () => {
    const nick = nickname.trim();
    if (nick.length < 2) {
      setStatus({ state: 'error', message: 'nickname must be 2-20 characters' });
      return;
    }
    setStatus({ state: 'loading' });
    try {
      const res = await submitScore({
        nickname: nick,
        wpm: results.wpm,
        rawWpm: results.raw,
        accuracy: results.accuracy,
        mode: modeKey,
        correctChars: results.correct,
        incorrectChars: results.incorrect,
        durationMs: results.durationMs,
        multiplayer,
      });
      settings.set({ nickname: nick });
      setStatus({ state: 'ok', rank: res.rank });
    } catch (err) {
      setStatus({
        state: 'error',
        message: err.status === 503 ? 'leaderboard needs the local MongoDB service' : 'could not save score',
      });
    }
  };

  if (status.state === 'ok') {
    return (
      <div className="score-submit done">
        Saved — you are ranked <b>#{status.rank}</b> for {modeKey}
      </div>
    );
  }

  return (
    <div className="score-submit">
      <input
        className="input nick-input"
        value={nickname}
        maxLength={20}
        placeholder="your nickname"
        onChange={(e) => setNickname(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && status.state !== 'loading' && submit()}
      />
      <button type="button" className="btn btn-yellow" onClick={submit} disabled={status.state === 'loading'}>
        {status.state === 'loading' ? 'saving…' : 'save to leaderboard'}
      </button>
      {status.state === 'error' && <p className="form-error">{status.message}</p>}
    </div>
  );
}
