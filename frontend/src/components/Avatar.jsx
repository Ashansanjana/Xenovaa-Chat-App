// Six muted tones derived from the palette (accent, info, success, warning, two
// neutral fallbacks) — never bright/random colors. Selection is deterministic
// per user so the same person always gets the same tone.
const TONES = [
  { bg: 'var(--color-accent-tint)', text: 'var(--color-accent-700)' },
  { bg: '#dceefb', text: '#1f6e9e' },
  { bg: 'var(--color-success-tint)', text: '#166b49' },
  { bg: 'var(--color-warning-tint)', text: '#8a5f10' },
  { bg: 'var(--color-neutral-100)', text: 'var(--color-neutral-600)' },
  { bg: 'var(--color-neutral-200)', text: 'var(--color-neutral-900)' },
];

function toneFor(seed) {
  const str = seed || '?';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return TONES[hash % TONES.length];
}

export function Avatar({ name, profileImage, size = 40 }) {
  const initials = (name || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (profileImage) {
    return (
      <img
        src={profileImage}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover"
      />
    );
  }

  const tone = toneFor(name);

  return (
    <div
      style={{ width: size, height: size, backgroundColor: tone.bg, color: tone.text }}
      className="flex flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold"
    >
      {initials}
    </div>
  );
}
