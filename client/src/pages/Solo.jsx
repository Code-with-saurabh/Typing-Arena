import { useCallback, useRef, useState } from 'react';
import { useTypingEngine } from '../hooks/useTypingEngine.js';
import TypingBox from '../components/TypingBox.jsx';
import Hud from '../components/Hud.jsx';
import ResultsPanel from '../components/ResultsPanel.jsx';
import { fetchText } from '../utils/api.js';
import { modeKeyOf } from '../utils/stats.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { sfx } from '../utils/sounds.js';

const TIME_OPTIONS = [15, 30, 60, 120];
const WORD_OPTIONS = [25, 50, 100];
const SOURCES = [
  { id: 'basic', label: 'common' },
  { id: 'extended', label: 'extended' },
  { id: 'quotes', label: 'quotes' },
];

export default function Solo() {
  const settings = useSettings();
  const [cfg, setCfg] = useState({
    kind: 'time',
    limit: 30,
    words: 50,
    source: settings.source || 'basic',
    punctuation: false,
    numbers: false,
    custom: '',
  });
  const [phase, setPhase] = useState('idle');
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const busyRef = useRef(false);

  const onDone = useCallback((r) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setResults(r);
    setPhase('results');
    sfx.finish();
    setTimeout(() => { busyRef.current = false; }, 300);
  }, []);

  const engine = useTypingEngine({
    kind: cfg.kind,
    limitSeconds: cfg.limit,
    active: phase === 'typing',
    onDone,
  });

  const start = async (patch) => {
    const next = patch ? { ...cfg, ...patch } : cfg;
    if (patch) setCfg(next);
    setError('');
    try {
      const text = await fetchText(next);
      engine.reset(text);
      setResults(null);
      setPhase('typing');
    } catch {
      setError('could not reach the server — is it running?');
    }
  };

  const set = (patch) => {
    setCfg((c) => ({ ...c, ...patch }));
  };

  const onKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      start();
    }
  };

  const modeKey = modeKeyOf(cfg);

  return (
    <div className="page solo" onKeyDown={onKeyDown}>
      <div className="mode-bar">
        <div className="chip-group">
          <button
            type="button"
            className={`chip${cfg.kind === 'time' ? ' active' : ''}`}
            onClick={() => set({ kind: 'time' })}
          >
            time
          </button>
          <button
            type="button"
            className={`chip${cfg.kind === 'words' ? ' active' : ''}`}
            onClick={() => set({ kind: 'words' })}
          >
            words
          </button>
          <button
            type="button"
            className={`chip${cfg.kind === 'quote' ? ' active' : ''}`}
            onClick={() => { set({ kind: 'quote', source: 'quotes' }); }}
          >
            quote
          </button>
          <button
            type="button"
            className={`chip${cfg.kind === 'custom' ? ' active' : ''}`}
            onClick={() => set({ kind: 'custom' })}
          >
            custom
          </button>
        </div>

        {cfg.kind === 'time' && (
          <div className="chip-group">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip${cfg.limit === t ? ' active' : ''}`}
                onClick={() => set({ limit: t })}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {cfg.kind === 'words' && (
          <div className="chip-group">
            {WORD_OPTIONS.map((w) => (
              <button
                key={w}
                type="button"
                className={`chip${cfg.words === w ? ' active' : ''}`}
                onClick={() => set({ words: w })}
              >
                {w}
              </button>
            ))}
          </div>
        )}

        {(cfg.kind === 'time' || cfg.kind === 'words') && (
          <div className="chip-group">
            {SOURCES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`chip${cfg.source === s.id ? ' active' : ''}`}
                onClick={() => set({ source: s.id })}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div className="chip-group">
          <button
            type="button"
            className={`chip${cfg.punctuation ? ' active' : ''}`}
            onClick={() => set({ punctuation: !cfg.punctuation })}
          >
            punctuation
          </button>
          <button
            type="button"
            className={`chip${cfg.numbers ? ' active' : ''}`}
            onClick={() => set({ numbers: !cfg.numbers })}
          >
            numbers
          </button>
        </div>

        <button type="button" className="btn btn-ghost restart-btn" onClick={() => start()}>
          restart · tab
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      {phase === 'typing' && (
        <div className="test-area">
          <Hud
            engine={engine}
            kind={cfg.kind}
            progressLabel={`${engine.typed.length}/${engine.text.length}`}
          />
          <TypingBox
            engine={engine}
            fontSize={settings.fontSize}
            caretStyle={settings.caret}
          />
          <div className="test-hint">tab — new test · click the text to focus</div>
        </div>
      )}

      {phase !== 'typing' && (
        <>
          {cfg.kind === 'custom' && (
            <div className="card custom-card">
              <label htmlFor="custom-text">paste or type your own text</label>
              <textarea
                id="custom-text"
                className="textarea"
                rows={5}
                maxLength={2000}
                placeholder="paste a paragraph, code snippet, lyrics…"
                value={cfg.custom}
                onChange={(e) => set({ custom: e.target.value })}
              />
            </div>
          )}

          {phase === 'idle' && (
            <div className="card start-card">
              <button type="button" className="btn btn-yellow btn-lg" onClick={() => start()}>
                start test
              </button>
              <p className="hint">
                {cfg.kind === 'time'
                  ? `${cfg.limit} seconds — type as much as you can`
                  : cfg.kind === 'words'
                    ? `${cfg.words} words — finish as fast as you can`
                    : cfg.kind === 'quote'
                      ? 'one quote — accuracy matters'
                      : 'your own text — at least a few words'}
              </p>
            </div>
          )}

          {phase === 'results' && results && (
            <ResultsPanel
              results={results}
              modeKey={modeKey}
              text={engine.text}
              typed={engine.typed}
              onRetry={() => start()}
              onConfig={() => setPhase('idle')}
            />
          )}
        </>
      )}
    </div>
  );
}
