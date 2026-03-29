/**
 * Skeleton — pulsing placeholder bars for loading states.
 *
 * Usage:
 *   <Skeleton />                — single bar, full width, 16px tall
 *   <Skeleton width="60%" height={24} />
 *   <Skeleton count={4} gap={10} />   — stacked bars
 *   <Skeleton variant="card" />       — card-shaped block
 */
export default function Skeleton({ width = '100%', height = 16, borderRadius = 6, count = 1, gap = 8, variant, style = {} }) {
  if (variant === 'card') {
    return (
      <div className="skeleton-pulse" style={{
        width: '100%', height: 110, borderRadius: 12,
        background: '#e5e7eb', ...style,
      }} />
    );
  }

  if (variant === 'kpi') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        {Array.from({ length: count || 4 }).map((_, i) => (
          <div key={i} className="skeleton-pulse" style={{
            height: 80, borderRadius: 14, background: '#e5e7eb',
          }} />
        ))}
      </div>
    );
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton-pulse"
          style={{
            width, height, borderRadius, background: '#e5e7eb',
            marginBottom: i < count - 1 ? gap : 0,
            ...style,
          }}
        />
      ))}
      <style>{`
        @keyframes skeletonPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
        .skeleton-pulse {
          animation: skeletonPulse 1.4s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
