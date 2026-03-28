import { useState } from 'react'

interface Props {
  open: boolean
  parentName: string
  fixedType?: 'FOLDER' | 'DOCUMENT'
  onClose: () => void
  onConfirm: (name: string, type: 'FOLDER' | 'DOCUMENT', description?: string) => Promise<void>
}

export default function CreateNodeModal({ open, parentName, fixedType, onClose, onConfirm }: Props) {
  const [name, setName] = useState('')
  const [type, setType] = useState<'FOLDER' | 'DOCUMENT'>(fixedType || 'DOCUMENT')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      await onConfirm(name.trim(), type)
      setName('')
      setType(fixedType || 'DOCUMENT')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg w-80 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
          {fixedType ? (fixedType === 'FOLDER' ? 'Create Folder' : 'Create Page') : 'New item'}
        </h3>
        <p className="text-xs text-secondary-500 dark:text-gray-500 mb-4">
          Inside: <span className="font-medium">{parentName}</span>
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Type selector (only show if fixedType is not provided) */}
          {!fixedType && (
            <div className="flex gap-2">
              {(['DOCUMENT', 'FOLDER'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`flex-1 py-1.5 text-xs border rounded transition-colors ${
                    type === t
                      ? 'border-primary-500 text-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400'
                      : 'border-gray-200 dark:border-gray-700 text-secondary-500 dark:text-gray-500 hover:border-gray-300'
                  }`}
                  onClick={() => setType(t)}
                >
                  {t === 'DOCUMENT' ? 'Document' : 'Folder'}
                </button>
              ))}
            </div>
          )}

          {/* Name input */}
          <input
            id="create-node-name-input"
            autoFocus
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded text-secondary-600 dark:text-gray-400 hover:border-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="text-xs px-3 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
