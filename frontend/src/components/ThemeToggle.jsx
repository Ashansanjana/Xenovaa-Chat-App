import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { SunIcon, MoonIcon, MonitorIcon } from './Icons';

const OPTIONS = [
  { key: 'light', label: 'Light', Icon: SunIcon },
  { key: 'dark', label: 'Dark', Icon: MoonIcon },
  { key: 'system', label: 'System', Icon: MonitorIcon },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const Current = OPTIONS.find((o) => o.key === theme)?.Icon || MonitorIcon;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Theme"
        aria-label="Change theme"
        className="rounded-lg p-2 text-[var(--color-ink-soft)] transition hover:bg-field focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600/30"
      >
        <Current className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-2 w-36 rounded-xl border border-line bg-surface py-1 shadow-panel">
          {OPTIONS.map((o) => (
            <button
              key={o.key}
              onClick={() => {
                setTheme(o.key);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-field ${
                theme === o.key ? 'font-medium text-accent-600' : 'text-[var(--color-ink-soft)]'
              }`}
            >
              <o.Icon className="h-4 w-4" /> {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
