import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Folder, Edit2, Trash2, Info } from 'lucide-react'
import type { RootState, AppDispatch } from '../../store/store'
import { addWorkspace, updateWorkspace, removeWorkspace, setActiveWorkspace, setError } from '../../store/slices/docsSlice'
import { createWorkspace, renameWorkspace, deleteWorkspace } from '../../services/docs.service'
import EntityDetailsModal from '../../layouts/EntityDetailsModal'
import ConfirmModal from '../../layouts/ConfirmModal'

export default function WorkspaceListPage() {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const { workspaces } = useSelector((state: RootState) => state.docs)

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [newWsDesc, setNewWsDesc] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [renameModalOpen, setRenameModalOpen] = useState(false)
  const [renameWsId, setRenameWsId] = useState('')
  const [renameWsName, setRenameWsName] = useState('')
  const [renameWsDesc, setRenameWsDesc] = useState('')

  const [detailsModal, setDetailsModal] = useState<{
    open: boolean
    entity: {
      name: string
      description?: string | null
      type: 'WORKSPACE' | 'FOLDER' | 'DOCUMENT'
      createdAt: string
    } | null
  }>({ open: false, entity: null })

  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean
    id: string
    name: string
  }>({ open: false, id: '', name: '' })

  // Create Workspace
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newWsName.trim()) return
    setIsSubmitting(true)
    try {
      const newWs = await createWorkspace(newWsName, newWsDesc)
      dispatch(addWorkspace(newWs))
      setCreateModalOpen(false)
      setNewWsName('')
      setNewWsDesc('')
    } catch {
      dispatch(setError('Failed to create workspace'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Rename Workspace
  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renameWsName.trim() || !renameWsId) return
    setIsSubmitting(true)
    try {
      await renameWorkspace(renameWsId, renameWsName, renameWsDesc)
      dispatch(updateWorkspace({ id: renameWsId, name: renameWsName, description: renameWsDesc }))
      setRenameModalOpen(false)
      setRenameWsId('')
      setRenameWsName('')
      setRenameWsDesc('')
    } catch {
      dispatch(setError('Failed to rename workspace'))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete Workspace — Optimistic: remove from UI instantly, call API in background
  const executeDelete = (id: string) => {
    // ① Close confirm modal & remove from Redux list immediately
    setConfirmDelete({ open: false, id: '', name: '' })
    dispatch(removeWorkspace(id))

    // ② Fire the API call in the background
    deleteWorkspace(id).catch(() => {
      // On failure: show error (workspace list will need manual refresh)
      dispatch(setError('Failed to delete workspace — please refresh the page'))
    })
  }

  // Enter Workspace
  const handleEnterWorkspace = (id: string) => {
    dispatch(setActiveWorkspace(id))
    navigate(`/workspace/${id}`)
  }

  return (
    <div className="p-4 sm:p-6 w-full max-w-[1200px] mx-auto h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mt-2 m-0">
            Workspaces
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Select a workspace to enter, or create a new one.
          </p>
        </div>
        <button 
          onClick={() => setCreateModalOpen(true)}
          className="mt-4 sm:mt-0 bg-[#007bff] hover:bg-[#0056b3] text-white px-4 py-2 rounded shadow transition-colors font-medium flex items-center gap-2"
        >
          <Folder className="w-4 h-4" />
          <span>New Workspace</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1 content-start">
        {workspaces.map((ws) => (
          <div 
            key={ws.id} 
            className="group relative bg-white dark:bg-[#343a40] border-t-[3px] border-t-indigo-500 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between min-h-[120px] transform hover:-translate-y-0.5 border border-gray-100 dark:border-[#4b545c] p-4"
            onClick={() => handleEnterWorkspace(ws.id)}
          >
            <div>
              <div className="flex items-start justify-between">
                <h3 className="text-base font-bold text-gray-800 dark:text-gray-100 line-clamp-1 pr-6 tracking-tight">
                  {ws.name}
                </h3>
              </div>
              {ws.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1.5 line-clamp-2 leading-snug">
                  {ws.description}
                </p>
              )}
              <p className="text-xs text-secondary-400 dark:text-gray-500 mt-3 font-medium">
                {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ws.createdAt))}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-indigo-600 dark:text-gray-300 transition-colors font-medium bg-gray-100 dark:bg-gray-700 px-2 py-1.5 rounded"
                onClick={(e) => {
                  e.stopPropagation()
                  setDetailsModal({
                    open: true,
                    entity: {
                      name: ws.name,
                      description: ws.description,
                      type: 'WORKSPACE',
                      createdAt: ws.createdAt
                    }
                  })
                }}
              >
                <Info className="w-3.5 h-3.5" />
                Details
              </button>
              <button 
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-[#007bff] dark:text-gray-300 transition-colors font-medium bg-gray-100 dark:bg-gray-700 px-2 py-1.5 rounded"
                onClick={(e) => {
                  e.stopPropagation()
                  setRenameWsId(ws.id)
                  setRenameWsName(ws.name)
                  setRenameWsDesc(ws.description || '')
                  setRenameModalOpen(true)
                }}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>
              <button 
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-red-600 dark:text-gray-300 transition-colors font-medium bg-gray-100 dark:bg-gray-700 px-2 py-1.5 rounded"
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmDelete({ open: true, id: ws.id, name: ws.name })
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        ))}
        {workspaces.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <Folder className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600 opacity-50" />
            <p className="text-lg font-medium text-gray-600 dark:text-gray-300">No workspaces yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">
              Workspaces help you organize your documents and projects Jira-style. Create your first workspace to get started.
            </p>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-[#343a40] rounded shadow-lg w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-[#4b545c]">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Create Workspace
              </h3>
            </div>
            <form onSubmit={handleCreate}>
              <div className="p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. Engineering, Personal Blog..."
                  className="w-full border border-gray-300 dark:border-[#4b545c] bg-white dark:bg-[#343a40] text-gray-900 dark:text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-[#007bff] focus:ring-1 focus:ring-[#007bff] transition-shadow"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="px-4 py-3 border-t border-gray-200 dark:border-[#4b545c] flex justify-end gap-2 bg-gray-50 dark:bg-gray-800/50">
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors focus:outline-none disabled:opacity-50"
                  onClick={() => setCreateModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-[#007bff] hover:bg-[#0056b3] rounded shadow transition-colors focus:outline-none disabled:opacity-50"
                  disabled={isSubmitting || !newWsName.trim()}
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENAME MODAL */}
      {renameModalOpen && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-[#343a40] rounded shadow-lg w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-[#4b545c]">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Edit Workspace
              </h3>
            </div>
            <form onSubmit={handleRename}>
              <div className="p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Workspace Name
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="e.g. Engineering..."
                  className="w-full border border-gray-300 dark:border-[#4b545c] bg-white dark:bg-[#343a40] text-gray-900 dark:text-white rounded px-3 py-2 text-sm focus:outline-none focus:border-[#007bff] focus:ring-1 focus:ring-[#007bff] transition-shadow"
                  value={renameWsName}
                  onChange={(e) => setRenameWsName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="px-4 py-3 border-t border-gray-200 dark:border-[#4b545c] flex justify-end gap-2 bg-gray-50 dark:bg-gray-800/50">
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors focus:outline-none disabled:opacity-50"
                  onClick={() => setRenameModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-[#007bff] hover:bg-[#0056b3] rounded shadow transition-colors focus:outline-none disabled:opacity-50"
                  disabled={isSubmitting || !renameWsName.trim()}
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      <EntityDetailsModal
        open={detailsModal.open}
        entity={detailsModal.entity}
        onClose={() => setDetailsModal({ open: false, entity: null })}
      />

      {/* CONFIRM DELETE MODAL */}
      <ConfirmModal
        open={confirmDelete.open}
        title="Delete Workspace"
        message={`Are you sure you want to delete workspace "${confirmDelete.name}"?\nAll folders and documents inside will be permanently lost!`}
        confirmText="Delete"
        danger={true}
        onConfirm={() => executeDelete(confirmDelete.id)}
        onCancel={() => setConfirmDelete({ open: false, id: '', name: '' })}
      />

    </div>
  )
}
