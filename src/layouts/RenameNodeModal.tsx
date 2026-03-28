import { useState, useEffect } from 'react'

interface Props {
  open: boolean
  initialName: string
  nodeId: string
  onClose: () => void
  onConfirm: (nodeId: string, newName: string) => Promise<void>
}

export default function RenameNodeModal({ open, initialName, nodeId, onClose, onConfirm }: Props) {
  const [name, setName] = useState(initialName)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) setName(initialName)
  }, [open, initialName])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || name === initialName) { onClose(); return }
    setLoading(true)
    try {
      await onConfirm(nodeId, name.trim())
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
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg w-80 p-5 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">Rename</h3>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            autoFocus
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#007bff]"
          />

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded text-secondary-600 dark:text-gray-400 hover:border-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || name === initialName}
              className="text-xs px-3 py-1.5 bg-[#007bff] text-white rounded hover:bg-[#0056b3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
