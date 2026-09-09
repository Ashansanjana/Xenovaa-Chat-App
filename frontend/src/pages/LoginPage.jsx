import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TextInput } from '../components/FormField';
import { Button } from '../components/Button';
import { ThemeToggle } from '../components/ThemeToggle';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-canvas px-4">
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
          <h1 className="mb-1 text-xl font-semibold text-ink">Welcome back</h1>
          <p className="mb-6 text-sm text-[var(--color-ink-muted)]">Sign in with your company account.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink-soft)]">Email</label>
              <TextInput
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@xenovaa.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--color-ink-soft)]">Password</label>
              <TextInput
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-600">{error}</p>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--color-ink-muted)]">
          New employee?{' '}
          <Link to="/register" className="font-medium text-accent-600 hover:text-accent-700">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
