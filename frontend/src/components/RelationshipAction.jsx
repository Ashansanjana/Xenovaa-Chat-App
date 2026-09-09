import { Link } from 'react-router-dom';
import { Button } from './Button';

const pillBase = 'rounded-lg px-3 py-1.5 text-sm font-medium';

export function RelationshipAction({ status, busy, onSend, onCancel, conversationId, isAdmin }) {
  switch (status) {
    case 'none':
      return (
        <Button onClick={onSend} disabled={busy}>
          {busy ? 'Starting…' : isAdmin ? 'Start chat' : 'Send request'}
        </Button>
      );
    case 'pending_outgoing':
      return (
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          {busy ? 'Cancelling…' : 'Cancel request'}
        </Button>
      );
    case 'pending_incoming':
      return (
        <Link
          to="/requests"
          className={`${pillBase} inline-block border border-accent-600/40 text-accent-700 transition hover:bg-accent-tint`}
        >
          Respond
        </Link>
      );
    case 'connected':
      return conversationId ? (
        <Link
          to={`/chats/${conversationId}`}
          className={`${pillBase} inline-block bg-success-tint text-success-600 transition hover:opacity-90`}
        >
          Message
        </Link>
      ) : (
        <span className={`${pillBase} bg-success-tint text-success-600`}>Connected</span>
      );
    case 'blocked_by_me':
      return <span className={`${pillBase} bg-field text-[var(--color-ink-muted)]`}>Blocked</span>;
    case 'blocked_me':
      return <span className={`${pillBase} bg-field text-[var(--color-ink-muted)]`}>Unavailable</span>;
    default:
      return null;
  }
}
