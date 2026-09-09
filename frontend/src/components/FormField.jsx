export const fieldClass =
  'w-full rounded-md border border-transparent bg-field px-3 py-2 text-sm text-ink outline-none transition placeholder:text-[var(--color-ink-muted)] focus:border-accent-600 focus:ring-2 focus:ring-accent-600/20';

export function TextInput({ className = '', ...props }) {
  return <input className={`${fieldClass} ${className}`} {...props} />;
}

export function TextArea({ className = '', ...props }) {
  return <textarea className={`${fieldClass} ${className}`} {...props} />;
}

export function Select({ className = '', ...props }) {
  return <select className={`${fieldClass} ${className}`} {...props} />;
}
