export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-[var(--color-ink-muted)]"
          style={{ animation: 'typing-pulse 1.2s infinite', animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
