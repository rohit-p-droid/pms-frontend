

interface Props {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  onConfirm,
  onCancel
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 overflow-hidden">
      <div className="bg-white dark:bg-[#343a40] rounded shadow-lg w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-[#4b545c]">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        </div>
        <div className="p-4">
          <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
            {message}
          </p>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 dark:border-[#4b545c] flex justify-end gap-2 bg-gray-50 dark:bg-gray-800/50">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors focus:outline-none"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm font-medium text-white rounded shadow transition-colors focus:outline-none ${
              danger 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-[#007bff] hover:bg-[#0056b3]'
            }`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
