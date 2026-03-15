import { useNavigate } from 'react-router-dom'

export default function EmptyState({ 
  title = "No data found", 
  message = "Try adjusting your filters or adding a new record.", 
  actionLabel, 
  onAction,
  icon: Icon
}) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="bg-ink-900/50 p-4 rounded-full mb-4 border border-ink-800">
        {Icon ? (
          <Icon className="w-8 h-8 text-ink-400" />
        ) : (
          <svg className="w-8 h-8 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <h3 className="text-lg font-medium text-ink-100 mb-1">{title}</h3>
      <p className="text-ink-400 text-sm max-w-xs mb-6">{message}</p>
      {actionLabel && (
        <button
          onClick={onAction}
          className="btn btn-primary px-6"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
