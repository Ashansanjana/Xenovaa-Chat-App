import { useEffect, useState } from 'react';
import { listReportsRequest, resolveReportRequest } from '../api/reports';
import { Card } from './Card';
import { Button } from './Button';

const STATUS_TABS = ['open', 'resolved', 'dismissed'];

export function AdminReportsTab() {
  const [status, setStatus] = useState('open');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    listReportsRequest(status)
      .then(setReports)
      .catch(() => setError('Failed to load reports.'))
      .finally(() => setLoading(false));
  }, [status]);

  async function handleResolve(report, nextStatus) {
    setBusyId(report.id);
    setError('');
    try {
      await resolveReportRequest(report.id, nextStatus);
      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update report.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-lg bg-field p-1 sm:w-80">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${
              status === s
                ? 'bg-surface text-ink shadow-card'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-600">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-[var(--color-ink-muted)]">No {status} reports.</p>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm text-[var(--color-ink-muted)]">
                    Reported by <span className="font-medium text-[var(--color-ink-soft)]">{r.reporter?.name}</span>
                  </p>
                  {r.reported_user && (
                    <p className="text-sm text-[var(--color-ink-muted)]">
                      User: <span className="font-medium text-[var(--color-ink-soft)]">{r.reported_user.name}</span>
                    </p>
                  )}
                  {r.message && (
                    <p className="mt-1 rounded-lg bg-field px-2 py-1 text-sm text-[var(--color-ink-soft)]">
                      "{r.message.message || `[${r.message.message_type}]`}" — {r.message.sender?.name}
                    </p>
                  )}
                  <p className="mt-2 text-sm text-ink">{r.reason}</p>
                  <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
                    {new Date(r.created_at).toLocaleString()}
                  </p>
                </div>

                {status === 'open' && (
                  <div className="flex flex-shrink-0 gap-2">
                    <Button size="sm" onClick={() => handleResolve(r, 'resolved')} disabled={busyId === r.id}>
                      Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleResolve(r, 'dismissed')}
                      disabled={busyId === r.id}
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
