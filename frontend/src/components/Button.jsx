const VARIANTS = {
  primary: 'bg-accent-600 text-white hover:bg-accent-700 focus-visible:ring-accent-600/30',
  secondary:
    'bg-surface border border-line text-[var(--color-ink-soft)] hover:bg-field focus-visible:ring-accent-600/20',
  destructive: 'bg-danger-600 text-white hover:opacity-90 focus-visible:ring-danger-600/30',
  ghost: 'text-[var(--color-ink-soft)] hover:bg-field focus-visible:ring-accent-600/20',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

export function Button({ variant = 'primary', size = 'md', className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
