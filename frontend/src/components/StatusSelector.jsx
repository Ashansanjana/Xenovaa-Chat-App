import { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { STATUS_STORAGE_KEY, getSavedStatus } from '../lib/presenceStatus';

const STATUSES = [
  { value: 'online', label: 'Online', dotClass: 'bg-success-600' },
  { value: 'break', label: 'On Break', dotClass: 'bg-warning-600' },
];

export function StatusSelector() {
  const socket = useSocket();
  const [status, setStatus] = useState(getSavedStatus);
  const [open, setOpen] = useState(false);

  // Reconnects are seeded with this status via the socket auth handshake
  // (see SocketContext), so this only needs to handle an explicit choice
  // made while already connected — no need to re-assert on every reconnect.
  function selectStatus(newStatus) {
    setStatus(newStatus);
    try {
      localStorage.setItem(STATUS_STORAGE_KEY, newStatus);
    } catch {
      // Storage unavailable — the choice still applies for this session.
    }
    socket?.emit('set_status', { status: newStatus });
    setOpen(false);
  }

  const current = STATUSES.find((s) => s.value === status) || STATUSES[0];

  return (
    <div className="relative">
      <button
        id="status-selector-btn"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-neutral-300 transition hover:bg-anchor-800 hover:text-white"
        title="Change your status"
      >
        <span className={`h-2 w-2 flex-shrink-0 rounded-full ring-1 ring-anchor-700 ${current.dotClass}`} />
        <span>{current.label}</span>
        <svg className="h-3 w-3 opacity-60" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          {/* Dropdown */}
          <div className="absolute bottom-full left-0 z-20 mb-1 w-36 overflow-hidden rounded-lg border border-anchor-700 bg-anchor-900 shadow-xl">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                id={`status-option-${s.value}`}
                onClick={() => selectStatus(s.value)}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium transition hover:bg-anchor-800 ${
                  status === s.value ? 'text-white' : 'text-neutral-400'
                }`}
              >
                <span className={`h-2 w-2 flex-shrink-0 rounded-full ${s.dotClass}`} />
                {s.label}
                {status === s.value && (
                  <svg className="ml-auto h-3 w-3 text-accent-400" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
