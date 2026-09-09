import { useEffect, useState } from 'react';
import {
  listDepartmentsRequest,
  createDepartmentRequest,
  updateDepartmentRequest,
  deleteDepartmentRequest,
} from '../api/departments';
import { Card } from './Card';
import { Button } from './Button';
import { TextInput } from './FormField';

export function AdminDepartmentsTab() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    return listDepartmentsRequest()
      .then(setDepartments)
      .catch(() => setError('Failed to load departments.'))
      .finally(() => setLoading(false));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError('');
    try {
      const dept = await createDepartmentRequest(newName.trim());
      setDepartments((prev) => [...prev, dept].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create department.');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(dept) {
    setEditingId(dept.id);
    setEditingName(dept.name);
  }

  async function handleRename(id) {
    if (!editingName.trim()) return;
    setBusy(true);
    setError('');
    try {
      const dept = await updateDepartmentRequest(id, editingName.trim());
      setDepartments((prev) => prev.map((d) => (d.id === id ? dept : d)));
      setEditingId(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to rename department.');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    setBusy(true);
    setError('');
    try {
      await deleteDepartmentRequest(id);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete department.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-[var(--color-ink-muted)]">Loading…</p>;

  return (
    <div className="max-w-md">
      {error && (
        <p className="mb-3 rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-600">{error}</p>
      )}

      <form onSubmit={handleCreate} className="mb-4 flex gap-2">
        <TextInput
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New department name"
          className="flex-1"
        />
        <Button type="submit" disabled={busy || !newName.trim()}>
          Add
        </Button>
      </form>

      <Card className="divide-y divide-line overflow-hidden">
        {departments.map((d) => (
          <div key={d.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
            {editingId === d.id ? (
              <TextInput
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                autoFocus
                className="flex-1 py-1"
              />
            ) : (
              <span className="text-sm text-ink">{d.name}</span>
            )}

            <div className="flex flex-shrink-0 gap-3 text-xs font-medium">
              {editingId === d.id ? (
                <>
                  <button onClick={() => handleRename(d.id)} disabled={busy} className="text-accent-600 hover:text-accent-700">
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => startEdit(d)}
                    className="text-[var(--color-ink-muted)] hover:text-accent-600"
                  >
                    Rename
                  </button>
                  <button onClick={() => handleDelete(d.id)} disabled={busy} className="text-danger-600 hover:opacity-80">
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
