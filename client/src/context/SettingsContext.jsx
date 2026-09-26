import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'typing-arena-settings';

const DEFAULTS = {
  nickname: '',
  sound: true,
  keySound: 'classic',
  theme: 'light',
  fontSize: 2,
  caret: 'line',
  source: 'basic',
};

const SettingsContext = createContext(null);

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(settings));
    document.documentElement.dataset.theme = settings.theme;
  }, [settings]);

  const value = useMemo(() => ({
    ...settings,
    set: (patch) => setSettings((s) => ({ ...s, ...patch })),
  }), [settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
