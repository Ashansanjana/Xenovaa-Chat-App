export function StatusDot({ status }) {
  const colorClass =
    status === 'online'
      ? 'bg-success-600'
      : status === 'break'
      ? 'bg-warning-600'
      : 'bg-neutral-400';

  const label =
    status === 'online' ? 'Online' : status === 'break' ? 'On Break' : 'Offline';

  return (
    <span
      className={`block h-2.5 w-2.5 rounded-full ring-2 ring-[var(--color-surface)] ${colorClass}`}
      title={label}
    />
  );
}
