import { useState } from 'react';
import { Button } from './Button';
import { TextInput } from './FormField';
import { CloseIcon } from './Icons';
import {
  getServerUrl,
  setServerUrl,
  resetServerUrl,
  normalizeServerUrl,
  isValidServerUrl,
  DEFAULT_SERVER_URL,
} from '../lib/serverConfig';

export function ServerSettingsModal({ onClose }) {
  const [url, setUrl] = useState(getServerUrl());
  const [error, setError] = useState('');
  const [testResult, setTestResult] = useState(null); // 'ok' | 'fail' | null
  const [testing, setTesting] = useState(false);

  async function handleTest() {
    const candidate = normalizeServerUrl(url);
    if (!isValidServerUrl(candidate)) {
      setError('Enter a valid URL starting with http:// or https://');
      setTestResult(null);
      return;
    }
    setError('');
    setTesting(true);
    setTestResult(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${candidate}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      setTestResult(res.ok ? 'ok' : 'fail');
    } catch {
      setTestResult('fail');
    } finally {
      setTesting(false);
    }
  }

  function handleSave() {
    try {
      setServerUrl(url);
      // Full reload: clears cached data, forces re-auth against the new
      // server, and re-initializes the socket connection cleanly.
      window.location.reload();
    } catch (err) {
      setError(err.message);
    }
  }

  function handleResetToDefault() {
    resetServerUrl();
    window.location.reload();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-anchor-900/50 px-4">
      <div className="w-full max-w-md rounded-xl border border-line bg-surface shadow-panel">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Server settings</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-[var(--color-ink-muted)] hover:bg-field hover:text-[var(--color-ink-soft)]"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--color-ink-soft)]">
              Backend server URL
            </label>
            <TextInput
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setTestResult(null);
              }}
              placeholder="http://your-server-ip"
            />
            <p className="mt-1 text-xs text-[var(--color-ink-muted)]">
              e.g. <span className="font-mono">http://169.58.41.116</span> or{' '}
              <span className="font-mono">https://your-domain.com</span> — no trailing slash, no{' '}
              <span className="font-mono">/api</span> suffix.
            </p>
          </div>

          {error && <p className="rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-600">{error}</p>}

          {testResult === 'ok' && (
            <p className="rounded-lg bg-success-tint px-3 py-2 text-sm text-success-600">
              Connected successfully.
            </p>
          )}
          {testResult === 'fail' && (
            <p className="rounded-lg bg-danger-tint px-3 py-2 text-sm text-danger-600">
              Could not reach that server. Check the URL and that the server is running.
            </p>
          )}

          <Button variant="secondary" size="sm" onClick={handleTest} disabled={testing || !url.trim()}>
            {testing ? 'Testing…' : 'Test connection'}
          </Button>

          <p className="text-xs text-[var(--color-ink-muted)]">
            Default: <span className="font-mono">{DEFAULT_SERVER_URL}</span>
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-3">
          <button
            onClick={handleResetToDefault}
            className="text-xs font-medium text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
          >
            Reset to default
          </button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!url.trim()}>
              Save &amp; reload
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
