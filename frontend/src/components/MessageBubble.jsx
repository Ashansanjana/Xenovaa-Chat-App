import { useState } from 'react';
import { MessageStatusTicks } from './MessageStatusTicks';
import { ReplyIcon, PinIcon, TrashIcon, FlagIcon, FileIcon } from './Icons';

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ message: m, isMine, otherMemberId, onReply, onTogglePin, onDelete, onReport }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reportingReason, setReportingReason] = useState(null);

  const otherStatus = isMine
    ? m.statuses?.find((s) => s.userId === otherMemberId)?.status
    : null;

  return (
    <div className={`group flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      {!m.is_deleted && (
        <div
          className={`flex items-center gap-0.5 self-center opacity-0 transition group-hover:opacity-100 ${
            isMine ? 'order-1 pr-2' : 'order-2 pl-2'
          }`}
        >
          <button
            title="Reply"
            onClick={() => onReply(m)}
            className="rounded p-1.5 text-[var(--color-ink-muted)] transition hover:bg-field hover:text-[var(--color-ink-soft)]"
          >
            <ReplyIcon className="h-4 w-4" />
          </button>
          <button
            title={m.is_pinned ? 'Unpin' : 'Pin'}
            onClick={() => onTogglePin(m)}
            className={`rounded p-1.5 transition hover:bg-field ${
              m.is_pinned ? 'text-accent-600' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]'
            }`}
          >
            <PinIcon className="h-4 w-4" />
          </button>
          <div className="relative">
            <button
              title="Delete"
              onClick={() => setConfirmingDelete((v) => !v)}
              className="rounded p-1.5 text-[var(--color-ink-muted)] transition hover:bg-field hover:text-[var(--color-ink-soft)]"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
            {confirmingDelete && (
              <div className="absolute z-10 mt-1 w-40 rounded-lg border border-line bg-surface py-1 shadow-panel">
                <button
                  onClick={() => {
                    setConfirmingDelete(false);
                    onDelete(m, false);
                  }}
                  className="block w-full px-3 py-1.5 text-left text-xs text-[var(--color-ink-soft)] hover:bg-field"
                >
                  Delete for me
                </button>
                {isMine && (
                  <button
                    onClick={() => {
                      setConfirmingDelete(false);
                      onDelete(m, true);
                    }}
                    className="block w-full px-3 py-1.5 text-left text-xs text-danger-600 hover:bg-field"
                  >
                    Delete for everyone
                  </button>
                )}
              </div>
            )}
          </div>
          {!isMine && onReport && (
            <div className="relative">
              <button
                title="Report"
                onClick={() => setReportingReason((v) => (v === null ? '' : null))}
                className="rounded p-1.5 text-[var(--color-ink-muted)] transition hover:bg-field hover:text-[var(--color-ink-soft)]"
              >
                <FlagIcon className="h-4 w-4" />
              </button>
              {reportingReason !== null && (
                <div className="absolute z-10 mt-1 w-52 rounded-lg border border-line bg-surface p-2 shadow-panel">
                  <textarea
                    autoFocus
                    value={reportingReason}
                    onChange={(e) => setReportingReason(e.target.value)}
                    placeholder="Why are you reporting this?"
                    rows={2}
                    className="w-full rounded border border-line bg-field px-2 py-1 text-xs text-ink outline-none focus:border-accent-600"
                  />
                  <button
                    onClick={() => {
                      if (!reportingReason.trim()) return;
                      onReport(m, reportingReason.trim());
                      setReportingReason(null);
                    }}
                    disabled={!reportingReason.trim()}
                    className="mt-1 w-full rounded bg-danger-600 py-1 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                  >
                    Submit report
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div
        className={`order-1 max-w-xs rounded-2xl px-3 py-2 text-sm sm:max-w-sm ${
          isMine
            ? 'bg-accent-600 text-white'
            : 'border border-line bg-bubble-received text-ink'
        }`}
      >
        {m.is_pinned && !m.is_deleted && (
          <p
            className={`mb-1 flex items-center gap-1 text-[10px] font-medium ${
              isMine ? 'text-white/80' : 'text-accent-600'
            }`}
          >
            <PinIcon className="h-2.5 w-2.5" /> Pinned
          </p>
        )}

        {m.reply_to && !m.is_deleted && (
          <div
            className={`mb-1.5 rounded-lg border-l-2 px-2 py-1 text-xs ${
              isMine
                ? 'border-white/40 bg-white/10 text-white/80'
                : 'border-line bg-field text-[var(--color-ink-muted)]'
            }`}
          >
            <p className="font-medium">{m.reply_to.sender?.name}</p>
            <p className="truncate">
              {m.reply_to.message_type !== 'text' ? `Attachment · ${m.reply_to.message_type}` : m.reply_to.message}
            </p>
          </div>
        )}

        {m.is_deleted ? (
          <p className={`italic ${isMine ? 'text-white/70' : 'text-[var(--color-ink-muted)]'}`}>Message deleted</p>
        ) : m.message_type === 'image' ? (
          <a href={m.file_url} target="_blank" rel="noreferrer">
            <img src={m.file_url} alt={m.message || 'Image'} className="max-h-64 rounded-lg object-cover" />
          </a>
        ) : m.message_type === 'file' ? (
          <a
            href={m.file_url}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-2 underline ${isMine ? 'text-white' : 'text-accent-600'}`}
          >
            <FileIcon className="h-4 w-4 flex-shrink-0" /> {m.message || 'Download file'}
          </a>
        ) : (
          <p className="whitespace-pre-wrap break-words">{m.message}</p>
        )}

        <div
          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
            isMine ? 'text-white/70' : 'text-[var(--color-ink-muted)]'
          }`}
        >
          {formatTime(m.created_at)}
          {isMine && !m.is_deleted && <MessageStatusTicks status={otherStatus} />}
        </div>
      </div>
    </div>
  );
}
