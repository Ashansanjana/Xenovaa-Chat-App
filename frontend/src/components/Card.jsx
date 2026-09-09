export function Card({ className = '', ...props }) {
  return <div className={`rounded-xl border border-line bg-surface shadow-card ${className}`} {...props} />;
}
