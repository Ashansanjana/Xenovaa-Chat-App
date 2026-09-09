import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listDepartmentsRequest } from '../api/departments';
import { TextInput, Select } from '../components/FormField';
import { Button } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', departmentId: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listDepartmentsRequest().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  function updateField(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas px-4 py-10">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-600 text-base font-bold text-white">
            X
          </div>
          <span className="text-lg font-semibold text-ink">Xenovaa Chat</span>
        </div>

        <div className="rounded-xl border border-line bg-surface p-8 shadow-card">
          <h1 className="mb-1 text-xl font-semibold text-ink">Create your account</h1>
          <p className="mb-6 text-sm text-[var(--color-ink-muted)]">Join your Xenovaa colleagues on chat.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink-soft)]">Full name</label>
              <TextInput required value={form.name} onChange={updateField('name')} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink-soft)]">Email</label>
              <TextInput type="email" required value={form.email} onChange={updateField('email')} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink-soft)]">Password</label>
              <TextInput
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={updateField('password')}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink-soft)]">Department</label>
              <Select value={form.departmentId} onChange={updateField('departmentId')}>
                <option value="">Select a department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>

            {error && (
              <p className="rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-600">{error}</p>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--color-ink-muted)]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-accent-600 hover:text-accent-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
