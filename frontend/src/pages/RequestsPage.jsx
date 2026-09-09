import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  listIncomingRequestsApi,
  listOutgoingRequestsApi,
  listConnectionsApi,
  respondToRequestApi,
  cancelRequestApi,
} from '../api/chatRequests';
import { Avatar } from '../components/Avatar';
import { useSocket } from '../context/SocketContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

const TABS = [
  { key: 'incoming', label: 'Incoming' },
  { key: 'outgoing', label: 'Outgoing' },
  { key: 'connections', label: 'Connections' },
];

export default function RequestsPage() {
  const [tab, setTab] = useState('incoming');
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const socket = useSocket();

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [i, o, c] = await Promise.all([
        listIncomingRequestsApi(),
        listOutgoingRequestsApi(),
        listConnectionsApi(),
      ]);
      setIncoming(i);
      setOutgoing(o);
      setConnections(c);
    } catch {
      setError('Failed to load chat requests.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onReceived = () => loadAll();
    const onAccepted = () => loadAll();
    socket.on('chat_request_received', onReceived);
    socket.on('chat_request_accepted', onAccepted);
    return () => {
      socket.off('chat_request_received', onReceived);
      socket.off('chat_request_accepted', onAccepted);
    };
  }, [socket]);

  async function handleRespond(id, action) {
    setBusyId(id);
    try {
      await respondToRequestApi(id, action);
      setIncoming((prev) => prev.filter((r) => r.id !== id));
      if (action === 'accept') loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to respond to request.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(id) {
    setBusyId(id);
    try {
      await cancelRequestApi(id);
      setOutgoing((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel request.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="mb-6 text-xl font-semibold text-ink">Chat requests</h1>

        <div className="mb-6 flex gap-1 rounded-lg bg-field p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === t.key
                  ? 'bg-surface text-ink shadow-card'
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]'
              }`}
            >
              {t.label}
              {t.key === 'incoming' && incoming.length > 0 && (
                <span className="ml-1.5 rounded-full bg-accent-600 px-1.5 text-xs text-white">
                  {incoming.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-600">{error}</p>
        )}

        {loading ? (
          <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>
        ) : (
          <>
            {tab === 'incoming' && (
              <RequestList
                items={incoming}
                empty="No incoming requests."
                renderUser={(r) => r.sender}
                renderActions={(r) => (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleRespond(r.id, 'accept')} disabled={busyId === r.id}>
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleRespond(r.id, 'reject')}
                      disabled={busyId === r.id}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              />
            )}

            {tab === 'outgoing' && (
              <RequestList
                items={outgoing}
                empty="No outgoing requests."
                renderUser={(r) => r.receiver}
                renderActions={(r) => (
                  <Button size="sm" variant="secondary" onClick={() => handleCancel(r.id)} disabled={busyId === r.id}>
                    Cancel
                  </Button>
                )}
              />
            )}

            {tab === 'connections' && (
              <RequestList
                items={connections}
                empty="No connections yet."
                renderUser={(c) => c.user}
                renderActions={(c) => (
                  <Link
                    to={`/chats/${c.conversationId}`}
                    className="rounded-lg bg-success-tint px-3 py-1.5 text-sm font-medium text-success-600 transition hover:opacity-90"
                  >
                    Message
                  </Link>
                )}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RequestList({ items, empty, renderUser, renderActions }) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--color-ink-muted)]">{empty}</p>;
  }

  return (
    <Card className="divide-y divide-line overflow-hidden">
      {items.map((item) => {
        const user = renderUser(item);
        return (
          <div key={item.id || item.requestId} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={user.name} profileImage={user.profile_image} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{user.name}</p>
                <p className="truncate text-xs text-[var(--color-ink-muted)]">{user.email}</p>
              </div>
            </div>
            {renderActions(item)}
          </div>
        );
      })}
    </Card>
  );
}
