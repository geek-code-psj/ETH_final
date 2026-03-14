// Returns <tbody> rows only - must be placed inside an existing <tbody>
export function SkeletonRows({ cols = 5, rows = 8 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri} className="border-b border-ink-800/40">
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} className="px-4 py-3">
              {ci === 0 ? (
                <div className="flex items-center gap-3">
                  <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="space-y-1.5">
                    <div className="skeleton h-3 rounded w-24" />
                    <div className="skeleton h-2.5 rounded w-16" />
                  </div>
                </div>
              ) : (
                <div className="skeleton h-3 rounded" style={{ width: `${48 + (ri * ci * 7) % 40}px` }} />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// Standalone full-table skeleton for non-table contexts
export default function SkeletonTable({ cols = 5, rows = 8 }) {
  return (
    <table className="w-full">
      <thead className="bg-ink-900/60">
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="px-4 py-3">
              <div className="skeleton h-3 rounded w-20" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <SkeletonRows cols={cols} rows={rows} />
      </tbody>
    </table>
  )
}
