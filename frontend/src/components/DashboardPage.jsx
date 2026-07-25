/** Page shell — matches PM dashboard width (centered, max 1600px). */
export default function DashboardPage({ children, className = '' }) {
  return (
    <div className={`space-y-6 w-full min-w-0 ${className}`.trim()}>
      {children}
    </div>
  );
}
