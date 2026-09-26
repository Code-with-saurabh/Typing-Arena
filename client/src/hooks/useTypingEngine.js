import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeStats, consistencyOf, statusesFor } from '../utils/stats.js';
import { sfx } from '../utils/sounds.js';

export function useTypingEngine({
  initialText = '',
  kind = 'time',
  limitSeconds = 30,
  active = true,
  onProgress,
  onDone,
}) {
  const [text, setText] = useState(initialText);
  const [typed, setTyped] = useState('');
  const [startedAt, setStartedAt] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [done, setDone] = useState(false);

  const typedRef = useRef('');
  const startedRef = useRef(null);
  const doneRef = useRef(false);
  const deadlineRef = useRef(null);
  const samplesRef = useRef([]);
  const lastSecondRef = useRef(-1);
  const lastEmitRef = useRef(0);
  const onDoneRef = useRef(onDone);
  const onProgressRef = useRef(onProgress);

  useEffect(() => { onDoneRef.current = onDone; });
  useEffect(() => { onProgressRef.current = onProgress; });
  useEffect(() => { typedRef.current = typed; }, [typed]);

  const effectiveEnd = useCallback(() => {
    if (deadlineRef.current) return deadlineRef.current;
    if (kind === 'time' && startedRef.current) return startedRef.current + limitSeconds * 1000;
    return null;
  }, [kind, limitSeconds]);

  const emitProgress = useCallback((force = false) => {
    const cb = onProgressRef.current;
    if (!cb || !startedRef.current || doneRef.current) return;
    const t = Date.now();
    if (!force && t - lastEmitRef.current < 180) return;
    lastEmitRef.current = t;
    const s = computeStats(text, typedRef.current, startedRef.current, t);
    cb({ charIndex: typedRef.current.length, correct: s.correct, incorrect: s.incorrect });
  }, [text]);

  const finish = useCallback(() => {
    if (doneRef.current || !startedRef.current) return;
    doneRef.current = true;
    const end = effectiveEnd();
    const endNow = end ? Math.min(Date.now(), end) : Date.now();
    setNow(endNow);
    setDone(true);
    const final = computeStats(text, typedRef.current, startedRef.current, endNow);
    final.consistency = consistencyOf(samplesRef.current);
    final.samples = samplesRef.current.slice();
    final.durationMs = endNow - startedRef.current;
    final.textLength = text.length;
    onProgressRef.current?.({
      charIndex: typedRef.current.length,
      correct: final.correct,
      incorrect: final.incorrect,
    });
    onDoneRef.current?.(final);
  }, [effectiveEnd, text]);

  const reset = useCallback((nextText, opts = {}) => {
    typedRef.current = '';
    startedRef.current = null;
    doneRef.current = false;
    samplesRef.current = [];
    lastSecondRef.current = -1;
    lastEmitRef.current = 0;
    deadlineRef.current = opts.deadlineAt || null;
    setTyped('');
    setStartedAt(null);
    setDone(false);
    setNow(Date.now());
    if (typeof nextText === 'string') setText(nextText);
  }, []);

  const handleChange = (e) => {
    if (doneRef.current || !active) return;
    const value = e.target.value;
    if (value.length > text.length) return;
    if (value.length > 0 && !startedRef.current) {
      const t = Date.now();
      startedRef.current = t;
      setStartedAt(t);
      lastSecondRef.current = 0;
    }
    if (value.length > typedRef.current.length) {
      const i = value.length - 1;
      if (value[i] === text[i]) sfx.key();
      else sfx.error();
    }
    typedRef.current = value;
    setTyped(value);
    emitProgress(value.length >= text.length);
  };

  useEffect(() => {
    if (!active || done || !startedAt) return undefined;
    const id = setInterval(() => {
      const t = Date.now();
      setNow(t);
      const elapsed = t - startedAt;
      const sec = Math.floor(elapsed / 1000);
      if (sec > lastSecondRef.current) {
        lastSecondRef.current = sec;
        const s = computeStats(text, typedRef.current, startedAt, t);
        samplesRef.current.push({ sec, wpm: Math.round(s.wpm), acc: Math.round(s.accuracy) });
      }
      const end = effectiveEnd();
      if (end && t >= end) finish();
    }, 100);
    return () => clearInterval(id);
  }, [active, done, startedAt, text, effectiveEnd, finish]);

  useEffect(() => {
    if (done || !startedAt || !text) return;
    if (typed.length >= text.length) finish();
  }, [typed, text, done, startedAt, finish]);

  useEffect(() => {
    if (!active || done || !startedAt) return;
    emitProgress(false);
  }, [typed, active, done, startedAt, emitProgress]);

  const statuses = useMemo(() => statusesFor(text, typed), [text, typed]);
  const stats = useMemo(
    () => computeStats(text, typed, startedAt, now),
    [text, typed, startedAt, now],
  );

  const remainingMs = deadlineRef.current
    ? Math.max(0, deadlineRef.current - now)
    : kind === 'time' && startedAt
      ? Math.max(0, limitSeconds * 1000 - (now - startedAt))
      : null;

  return {
    text,
    typed,
    statuses,
    stats,
    startedAt,
    now,
    done,
    remainingMs,
    samples: samplesRef.current,
    handleChange,
    reset,
  };
}
