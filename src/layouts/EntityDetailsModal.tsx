
interface Props {
  open: boolean
  entity: {
    name: string
    description?: string | null
    type: 'WORKSPACE' | 'FOLDER' | 'DOCUMENT'
    createdAt: string
  } | null
  onClose: () => void
}

export default function EntityDetailsModal({ open, entity, onClose }: Props) {
  if (!open || !entity) return null

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'WORKSPACE': return '🗂️'
      case 'FOLDER': return '📂'
      case 'DOCUMENT': return '📄'
      default: return '✅'
    }
  }

  const getEntityLabel = (type: string) => {
    switch (type) {
      case 'WORKSPACE': return 'Workspace'
      case 'FOLDER': return 'Folder'
      case 'DOCUMENT': return 'Page'
      default: return 'Entity'
    }
  }

  // Display in Indian Standard Time (IST, Asia/Kolkata, UTC+5:30)
  const formattedDate = new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(entity.createdAt))

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#343a40] border border-gray-200 dark:border-gray-700 rounded shadow-lg w-80 p-5 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-gray-700 pb-3">
          <span className="text-xl leading-none">{getEntityIcon(entity.type)}</span>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
            {getEntityLabel(entity.type)} Details
          </h3>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-widest mb-1">Name</label>
            <p className="text-sm text-gray-900 dark:text-gray-100 font-medium break-words">
              {entity.name}
            </p>
          </div>

          {/* Only show description block if it actually has content */}
          {entity.description && (
            <div>
              <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-widest mb-1">Description</label>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-[120px] overflow-y-auto custom-scrollbar">
                {entity.description}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-gray-500 uppercase tracking-widest mb-1">Created At</label>
            <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">
              {formattedDate}
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-5 mt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="text-xs px-4 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
