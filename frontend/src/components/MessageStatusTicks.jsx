// Only ever rendered on top of the accent-600 "sent" bubble, so ticks use
// on-accent tones (info-600 would be nearly invisible on that background).
export function MessageStatusTicks({ status }) {
  if (!status) return null;

  if (status === 'read') {
    return <span className="text-[#BFE0FF]">✓✓</span>;
  }
  if (status === 'delivered') {
    return <span className="text-white/70">✓✓</span>;
  }
  return <span className="text-white/70">✓</span>;
}
