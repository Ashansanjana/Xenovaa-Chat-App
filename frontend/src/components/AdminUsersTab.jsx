import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listAllUsersRequest, updateUserRequest } from '../api/admin';
import { Card } from './Card';
import { Select } from './FormField';

export function AdminUsersTab() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    return listAllUsersRequest()
      .then(setUsers)
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }

  async function handleToggleActive(u) {
    setBusyId(u.id);
    setError('');
    try {
      const updated = await updateUserRequest(u.id, { isActive: !u.is_active });
      setUsers((prev) => prev.map((row) => (row.id === u.id ? updated : row)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleRoleChange(u, role) {
    setBusyId(u.id);
    setError('');
    try {
      const updated = await updateUserRequest(u.id, { role });
      setUsers((prev) => prev.map((row) => (row.id === u.id ? updated : row)));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update role.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>;

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-600">{error}</p>
      )}
      <Card className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-field text-left text-xs uppercase tracking-wide text-[var(--color-ink-muted)]">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Department</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-2">
                  <p className="font-medium text-ink">{u.name}</p>
                  <p className="text-xs text-[var(--color-ink-muted)]">{u.email}</p>
                </td>
                <td className="px-4 py-2 text-[var(--color-ink-soft)]">{u.department_name || '—'}</td>
                <td className="px-4 py-2">
                  <Select
                    value={u.role}
                    disabled={busyId === u.id || u.id === me?.id}
                    onChange={(e) => handleRoleChange(u, e.target.value)}
                    className="w-auto py-1 text-xs"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </Select>
                </td>
                <td className="px-4 py-2 capitalize text-[var(--color-ink-soft)]">{u.status}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => handleToggleActive(u)}
                    disabled={busyId === u.id || u.id === me?.id}
                    className={`rounded-lg px-2 py-1 text-xs font-medium transition disabled:opacity-50 ${
                      u.is_active
                        ? 'bg-success-tint text-success-600 hover:opacity-90'
                        : 'bg-field text-[var(--color-ink-muted)] hover:bg-line'
                    }`}
                  >
                    {u.is_active ? 'Active' : 'Deactivated'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
