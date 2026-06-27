export function SkeletonTable({ columns, rows = 5 }) {
  const widths = columns || [5, 5, 5, 5];
  return (
    <div style={{ padding: "4px 0" }}>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: widths.map((w) => `${w}fr`).join(" "),
            gap: 12,
            padding: "14px 12px",
            alignItems: "center",
          }}
        >
          {widths.map((_, ci) => (
            <div
              key={ci}
              className="skeleton"
              style={{ height: 14, borderRadius: 4 }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ lines = 3 }) {
  const sizes = [70, 50, 85, 60, 75];
  return (
    <div style={{ padding: 16 }}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height: 14,
            width: `${sizes[i % sizes.length]}%`,
            marginBottom: 12,
            borderRadius: 4,
          }}
        />
      ))}
    </div>
  );
}
