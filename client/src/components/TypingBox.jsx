import { useEffect, useMemo, useRef, useState } from 'react';

export default function TypingBox({ engine, fontSize = 2, caretStyle = 'line', locked = false }) {
  const inputRef = useRef(null);
  const boxRef = useRef(null);
  const [caret, setCaret] = useState({ x: 0, y: 0, h: 26 });
  const [windowStart, setWindowStart] = useState(0);
  const [focused, setFocused] = useState(false);

  const words = useMemo(() => {
    const res = [];
    let idx = 0;
    for (const w of engine.text.split(' ')) {
      res.push({ w, start: idx });
      idx += w.length + 1;
    }
    return res;
  }, [engine.text]);

  const currentWordIdx = useMemo(() => {
    let i = 0;
    while (i < words.length - 1 && engine.typed.length >= words[i].start + words[i].w.length + 1) i++;
    return i;
  }, [words, engine.typed]);

  useEffect(() => {
    setWindowStart((ws) => {
      const minStart = Math.max(0, currentWordIdx - 6);
      if (currentWordIdx < ws || currentWordIdx > ws + 34) return minStart;
      return ws;
    });
  }, [currentWordIdx]);

  useEffect(() => {
    if (!locked) inputRef.current?.focus();
  }, [locked]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let el = box.querySelector(`[data-i="${engine.typed.length}"]`);
    if (!el) el = box.querySelector(`[data-i="${engine.typed.length - 1}"]`);
    if (el) {
      const x = engine.typed.length >= engine.text.length || box.querySelector(`[data-i="${engine.typed.length}"]`)
        ? el.offsetLeft
        : el.offsetLeft + el.offsetWidth;
      setCaret({ x, y: el.offsetTop, h: el.offsetHeight });
    }
  }, [engine.typed, engine.text, windowStart]);

  const visible = words.slice(windowStart, windowStart + 45);

  const renderWord = (word, gi) => {
    const nodes = [];
    const pushChar = (i) => {
      const st = engine.statuses[i];
      const raw = engine.text[i];
      const typedChar = engine.typed[i];
      const content = raw === ' ' ? '\u00A0' : (st === 'wrong' && typedChar ? typedChar : raw);
      nodes.push(<span key={i} data-i={i} className={`ch ${st}`}>{content}</span>);
    };
    for (let i = word.start; i < word.start + word.w.length; i++) pushChar(i);
    const gap = word.start + word.w.length;
    if (gap < engine.text.length) pushChar(gap);
    return (
      <span key={gi} className={`word${gi === currentWordIdx ? ' current' : ''}`}>
        {nodes}
      </span>
    );
  };

  return (
    <div
      className={`typing-box fs-${fontSize} caret-${caretStyle}${locked ? ' locked' : ''}`}
      ref={boxRef}
    >
      <div className="typing-words">{visible.map(renderWord)}</div>
      <div
        className={`caret ${focused ? '' : 'caret-idle'}`}
        style={{ transform: `translate(${caret.x}px, ${caret.y}px)`, height: `${caret.h}px` }}
      />
      <input
        ref={inputRef}
        className="typing-input"
        value={engine.typed}
        onChange={engine.handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        maxLength={engine.text.length}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        aria-label="typing input"
      />
      {!focused && !locked && (
        <button type="button" className="focus-overlay" onClick={() => inputRef.current?.focus()}>
          Click to focus
        </button>
      )}
    </div>
  );
}
