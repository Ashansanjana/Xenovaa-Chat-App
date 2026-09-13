import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { listUsersRequest } from '../api/users';
import { listDepartmentsRequest } from '../api/departments';
import {
  listIncomingRequestsApi,
  listOutgoingRequestsApi,
  listConnectionsApi,
  sendChatRequestApi,
  cancelRequestApi,
} from '../api/chatRequests';
import { Avatar } from '../components/Avatar';
import { StatusDot } from '../components/StatusDot';
import { RelationshipAction } from '../components/RelationshipAction';
import { TextInput, Select } from '../components/FormField';
import { Card } from '../components/Card';
import { Spinner } from '../components/Spinner';

export default function DirectoryPage() {
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const socket = useSocket();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [relationships, setRelationships] = useState({});
  const [busyUserId, setBusyUserId] = useState(null);

  useEffect(() => {
    listDepartmentsRequest().then(setDepartments).catch(() => setDepartments([]));
    refreshRelationships();
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const timeout = setTimeout(() => {
      listUsersRequest({ search, departmentId })
        .then(setUsers)
        .catch(() => setError('Failed to load employees.'))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timeout);
  }, [search, departmentId]);

  // Real-time status updates from socket
  useEffect(() => {
    if (!socket) return;
    function onUserStatusChanged({ userId, status }) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status } : u))
      );
    }
    socket.on('user_status_changed', onUserStatusChanged);
    return () => socket.off('user_status_changed', onUserStatusChanged);
  }, [socket]);

  async function refreshRelationships() {
    try {
      const [incoming, outgoing, connections] = await Promise.all([
        listIncomingRequestsApi(),
        listOutgoingRequestsApi(),
        listConnectionsApi(),
      ]);

      const map = {};
      incoming.forEach((r) => {
        map[r.sender.id] = { status: 'pending_incoming', requestId: r.id };
      });
      outgoing.forEach((r) => {
        map[r.receiver.id] = { status: 'pending_outgoing', requestId: r.id };
      });
      connections.forEach((c) => {
        map[c.user.id] = { status: 'connected', requestId: c.requestId, conversationId: c.conversationId };
      });
      setRelationships(map);
    } catch {
      // Leave relationships as-is; buttons will just default to "Send request".
    }
  }

  async function handleSend(userId) {
    setBusyUserId(userId);
    try {
      const { request, conversation } = await sendChatRequestApi(userId);
      if (conversation) {
        // Admin bypass: the conversation is already active — jump straight in.
        navigate(`/chats/${conversation.id}`);
        return;
      }
      setRelationships((prev) => ({ ...prev, [userId]: { status: 'pending_outgoing', requestId: request.id } }));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send chat request.');
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleCancel(userId) {
    const rel = relationships[userId];
    if (!rel) return;
    setBusyUserId(userId);
    try {
      await cancelRequestApi(rel.requestId);
      setRelationships((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel chat request.');
    } finally {
      setBusyUserId(null);
    }
  }

  const statusFor = useMemo(
    () => (userId) => relationships[userId]?.status || 'none',
    [relationships]
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="mb-6 text-xl font-semibold text-ink">Employee directory</h1>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="flex-1"
          />
          <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="sm:w-56">
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </div>

        {error && (
          <p className="mb-4 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-600">{error}</p>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--color-ink-muted)]">
            <Spinner /> Loading employees…
          </div>
        ) : users.length === 0 ? (
          <p className="text-sm text-[var(--color-ink-muted)]">No employees found.</p>
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <Link to={`/users/${u.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="relative">
                    <Avatar name={u.name} profileImage={u.profile_image} />
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <StatusDot status={u.status} />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{u.name}</p>
                    <p className="truncate text-xs text-[var(--color-ink-muted)]">
                      {u.department_name || 'No department'}
                    </p>
                  </div>
                </Link>
                <RelationshipAction
                  status={statusFor(u.id)}
                  conversationId={relationships[u.id]?.conversationId}
                  busy={busyUserId === u.id}
                  isAdmin={me?.role === 'admin'}
                  onSend={() => handleSend(u.id)}
                  onCancel={() => handleCancel(u.id)}
                />
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
