import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  Folder,
  FileText,
  ChevronRight,
  LayoutDashboard,
  Briefcase,
  User,
  MoreVertical,
  Cloud,
  Key,
  Link,
  MoreHorizontal,
  ChevronLeft,
  Plus,
  Box,
  Edit2,
  Trash2,
  Info
} from 'lucide-react'
import type { RootState, AppDispatch } from '../store/store'
import type { TreeNode } from '../types'
import {
  setTree,
  setTreeLoading,
  setActiveWorkspace,
  openDocument,
  removeNode,
  setError,
  moveNodeOptimistic
} from '../store/slices/docsSlice'
import {
  getWorkspaceTree,
  createNode,
  deleteNode,
  renameNode,
  moveNode
} from '../services/docs.service'
import CreateNodeModal from './CreateNodeModal'
import RenameNodeModal from './RenameNodeModal'
import EntityDetailsModal from './EntityDetailsModal'
import ConfirmModal from './ConfirmModal'
import { config } from '../config'

// ── TreeItem ─────────────────────────────────────────────────────────────────

interface TreeItemProps {
  node: TreeNode
  depth: number
  index: number
  activeNodeId: string | null
  onOpenDoc: (node: TreeNode, breadcrumb: { label: string; nodeId: string }[]) => void
  onDeleteNode: (nodeId: string, type: 'FOLDER' | 'DOCUMENT') => void
  onRenameNode: (nodeId: string, currentName: string) => void
  onCreateChild: (parentNode: TreeNode, type: 'FOLDER' | 'DOCUMENT') => void
  onMoveNode: (nodeId: string, newParentId: string | null, newIndex: number) => void
  onShowDetails: (node: TreeNode) => void
  onDragError: (msg: string) => void
  trail: { label: string; nodeId: string }[]
  tree: TreeNode[]
}

function TreeItem({
  node,
  depth,
  index,
  activeNodeId,
  onOpenDoc,
  onDeleteNode,
  onRenameNode,
  onCreateChild,
  onMoveNode,
  onShowDetails,
  onDragError,
  trail,
  tree,
}: TreeItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [dragOverPos, setDragOverPos] = useState<'BEFORE' | 'AFTER' | 'INSIDE' | null>(null)
  const currentTrail = [...trail, { label: node.name, nodeId: node.id }]

  const handleClick = () => {
    if (node.type === 'FOLDER') {
      setExpanded((p) => !p)
    } else {
      onOpenDoc(node, currentTrail)
    }
  }

  // ── Drag & Drop ──────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation()
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify({ nodeId: node.id, type: node.type }))
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'

    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const height = rect.height

    let pos: 'BEFORE' | 'AFTER' | 'INSIDE'
    const isFolder = node.type === 'FOLDER'

    if (isFolder) {
      if (y < height * 0.25) pos = 'BEFORE'
      else if (y > height * 0.75) pos = 'AFTER'
      else pos = 'INSIDE'
    } else {
      if (y < height * 0.5) pos = 'BEFORE'
      else pos = 'AFTER'
    }
    setDragOverPos(pos)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation()
    setDragOverPos(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const pos = dragOverPos
    setDragOverPos(null)

    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'))
      const draggedId = data.nodeId
      const draggedType = data.type
      if (!draggedId || draggedId === node.id) return

      let newParentId = node.parentId || null
      if (pos === 'INSIDE') {
        newParentId = node.id
      }

      // Enforce: Documents cannot be placed at the absolute root directly, they need a Space
      if (!newParentId && draggedType === 'DOCUMENT') {
        onDragError("Pages must be placed inside a Space.")
        return
      }

      const newIndex = pos === 'INSIDE' ? node.children.length : (pos === 'BEFORE' ? index : index + 1)
      onMoveNode(draggedId, newParentId, newIndex)
    } catch (err) { }
  }
  // ─────────────────────────────────────────────────────────

  const isActive = activeNodeId === node.id

  return (
    <div>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group relative flex items-center justify-between py-2 pr-3 mx-2 my-[2px] cursor-pointer text-sm transition-all rounded-md ${dragOverPos === 'INSIDE'
            ? 'bg-indigo-500/20 shadow-inner text-white'
            : isActive
              ? 'bg-indigo-500/15 text-indigo-100 font-semibold shadow-sm'
              : 'text-gray-300 hover:bg-white/5 hover:text-white'
          }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={handleClick}
        onMouseLeave={() => setMenuOpen(false)}
        title={node.name}
      >
        {dragOverPos === 'BEFORE' && (
          <div className="absolute top-[-2px] left-[10px] right-2 h-[2px] bg-indigo-500 z-10 pointer-events-none rounded-full shadow-[0_0_5px_rgba(99,102,241,0.6)]" />
        )}
        {dragOverPos === 'AFTER' && (
          <div className="absolute bottom-[-2px] left-[10px] right-2 h-[2px] bg-indigo-500 z-10 pointer-events-none rounded-full shadow-[0_0_5px_rgba(99,102,241,0.6)]" />
        )}
        <span className="flex items-center gap-2.5 min-w-0 flex-1">
          {node.type === 'FOLDER' && (
            <span className={`transition-transform duration-200 shrink-0 ${expanded ? 'rotate-90' : ''}`}>
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          )}
          {node.type === 'DOCUMENT' && (
            <span className="w-3.5 shrink-0 opacity-0" />
          )}
          {node.type === 'FOLDER' ? (
            depth === 0 ? (
              <Box className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-indigo-400' : 'text-indigo-400/70 group-hover:text-indigo-400'}`} />
            ) : (
              <Folder className={`w-[18px] h-[18px] shrink-0 fill-current ${isActive ? 'text-amber-400' : 'text-amber-400/70 group-hover:text-amber-400'}`} />
            )
          ) : (
            <FileText className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-emerald-400' : 'text-emerald-400/80 group-hover:text-emerald-400'}`} />
          )}
          <span className="truncate">{node.name}</span>
        </span>

        <span className="hidden group-hover:flex items-center shrink-0">
          <button
            className={`p-1 rounded transition-colors ${isActive
                ? 'text-white hover:bg-white/20'
                : 'text-[#c2c7d0] hover:bg-white/20 hover:text-white'
              }`}
            title="Options"
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen(!menuOpen)
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </span>

        {menuOpen && (
          <div
            className="absolute right-4 top-full mt-[-4px] w-40 bg-white border border-gray-200 shadow-xl rounded py-1 z-50 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {node.type === 'FOLDER' && (
              <>
                <button
                  className="w-full flex items-center gap-2 text-xs text-left px-3 py-1.5 text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onCreateChild(node, 'FOLDER')
                  }}
                >
                  <Folder className="w-3.5 h-3.5 text-amber-500" />
                  Create folder
                </button>
                <button
                  className="w-full flex items-center gap-2 text-xs text-left px-3 py-1.5 text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    onCreateChild(node, 'DOCUMENT')
                  }}
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  Create page
                </button>
              </>
            )}
            <button
              className="w-full flex items-center gap-2 text-xs text-left px-3 py-1.5 text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(false)
                onRenameNode(node.id, node.name)
              }}
            >
              <Edit2 className="w-3.5 h-3.5 text-blue-500" />
              Rename
            </button>
            <button
              className="w-full flex items-center gap-2 text-xs text-left px-3 py-1.5 text-gray-700 hover:bg-gray-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(false)
                onShowDetails(node)
              }}
            >
              <Info className="w-3.5 h-3.5 text-indigo-500" />
              Details
            </button>
            <button
              className="w-full flex items-center gap-2 text-xs text-left px-3 py-1.5 text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 mt-0.5 pt-1.5"
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(false)
                onDeleteNode(node.id, node.type)
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </div>
        )}
      </div>

      {node.type === 'FOLDER' && expanded && node.children.length > 0 && (
        <div>
          {node.children.map((child, childIdx) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              index={childIdx}
              activeNodeId={activeNodeId}
              onOpenDoc={onOpenDoc}
              onDeleteNode={onDeleteNode}
              onRenameNode={onRenameNode}
              onCreateChild={onCreateChild}
              onMoveNode={onMoveNode}
              onShowDetails={onShowDetails}
              onDragError={onDragError}
              trail={currentTrail}
              tree={tree}
            />
          ))}
        </div>
      )}

      {node.type === 'FOLDER' && expanded && node.children.length === 0 && (
        <p
          className="text-xs text-[#869099] italic py-1"
          style={{ paddingLeft: `${24 + depth * 12}px` }}
        >
          Empty folder
        </p>
      )}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const isDashboard = location.pathname.startsWith('/dashboard')
  const isWorkspaceList = location.pathname === '/workspace'
  const isCloudStorage = location.pathname.startsWith('/cloud-storage')
  const isPasswordManager = location.pathname.startsWith('/password-manager')
  const isConnections = location.pathname.startsWith('/connections')
  const isOther = location.pathname.startsWith('/other')

  // Workspace Context Mode Check (Jiri-style contextual sidebar)
  const isWorkspaceContext = location.pathname.startsWith('/workspace/') && location.pathname !== '/workspace'

  const dispatch = useDispatch<AppDispatch>()
  const { workspaces, activeWorkspaceId, tree, treeCache, treeLoading, openNodeId } = useSelector(
    (state: RootState) => state.docs
  )
  const { user } = useSelector((state: RootState) => state.auth)

  const [createModal, setCreateModal] = useState<{
    open: boolean
    parentNode: TreeNode | null
    fixedType?: 'FOLDER' | 'DOCUMENT'
  }>({ open: false, parentNode: null })

  const [renameModal, setRenameModal] = useState<{
    open: boolean
    nodeId: string
    initialName: string
  }>({ open: false, nodeId: '', initialName: '' })

  const [detailsModal, setDetailsModal] = useState<{
    open: boolean
    entity: {
      name: string
      type: 'WORKSPACE' | 'FOLDER' | 'DOCUMENT'
      createdAt: string
    } | null
  }>({ open: false, entity: null })

  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean
    nodeId: string
    type: 'FOLDER' | 'DOCUMENT' | null
  }>({ open: false, nodeId: '', type: null })

  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)

  // Ensure routing URL /workspace/:workspaceId matches Redux activeWorkspaceId
  const urlWorkspaceId = isWorkspaceContext ? location.pathname.replace('/workspace/', '').split('/')[0] : null

  useEffect(() => {
    if (urlWorkspaceId && activeWorkspaceId !== urlWorkspaceId) {
      dispatch(setActiveWorkspace(urlWorkspaceId))
    }
  }, [urlWorkspaceId, activeWorkspaceId, dispatch])

  // Fetch Tree when entering a workspace
  // - If cached: show immediately + silently refresh in background
  // - If not cached: show spinner + load
  useEffect(() => {
    if (!activeWorkspaceId || treeLoading) return

    const hasCached = (treeCache[activeWorkspaceId]?.length ?? 0) > 0

    if (!hasCached) {
      // First visit — show the spinner
      dispatch(setTreeLoading(true))
    }
    // Always fetch fresh data; silently updates in the background if cached
    getWorkspaceTree(activeWorkspaceId)
      .then((fetchedTree) => {
        dispatch(setTree(fetchedTree))
      })
      .catch(() => {
        if (!hasCached) dispatch(setError('Failed to load workspace tree'))
      })
      .finally(() => {
        dispatch(setTreeLoading(false))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId])

  // Open Document
  const handleOpenDoc = useCallback(
    (node: TreeNode, trail: { label: string; nodeId: string }[]) => {
      if (!activeWorkspaceId) return
      const ws = workspaces.find((w) => w.id === activeWorkspaceId)
      dispatch(
        openDocument({
          nodeId: node.id,
          nodeName: node.name,
          breadcrumb: [
            { label: ws?.name ?? 'Workspace', nodeId: undefined as any },
            ...trail,
          ],
        })
      )
    },
    [dispatch, activeWorkspaceId, workspaces]
  )

  // Delete Node — Optimistic: remove from UI instantly, call API in background
  const executeDeleteNode = useCallback(
    (nodeId: string) => {
      // ① Close modal & remove from tree immediately (no waiting)
      setConfirmDelete({ open: false, nodeId: '', type: null })
      dispatch(removeNode(nodeId))

      // ② Fire the API call in the background
      deleteNode(nodeId).catch(() => {
        // On failure: show error and refetch tree to restore the node
        dispatch(setError('Failed to delete — item has been restored'))
        if (activeWorkspaceId) {
          getWorkspaceTree(activeWorkspaceId)
            .then((refreshed) => dispatch(setTree(refreshed)))
            .catch(() => { })
        }
      })
    },
    [dispatch, activeWorkspaceId]
  )

  const handleDeleteNode = useCallback(
    (nodeId: string, type: 'FOLDER' | 'DOCUMENT') => {
      setConfirmDelete({ open: true, nodeId, type })
    },
    []
  )

  // Create Node
  const handleCreateNode = useCallback(
    async (name: string, type: 'FOLDER' | 'DOCUMENT') => {
      if (!activeWorkspaceId) return
      try {
        await createNode({
          workspaceId: activeWorkspaceId,
          type,
          name,
          parentId: createModal.parentNode?.id ?? null,
        })
        const refreshed = await getWorkspaceTree(activeWorkspaceId)
        dispatch(setTree(refreshed))
      } catch {
        dispatch(setError('Failed to create node'))
      }
    },
    [dispatch, activeWorkspaceId, createModal.parentNode]
  )

  // Rename Node
  const handleRenameNode = useCallback(
    async (nodeId: string, newName: string) => {
      if (!activeWorkspaceId) return
      try {
        await renameNode(nodeId, newName)
        const refreshed = await getWorkspaceTree(activeWorkspaceId)
        dispatch(setTree(refreshed))
      } catch {
        dispatch(setError('Failed to rename node'))
      }
    },
    [dispatch, activeWorkspaceId]
  )

  // Move Node
  const handleMoveNode = useCallback(
    async (nodeId: string, newParentId: string | null, newIndex: number) => {
      if (!activeWorkspaceId) return

      // Optimistic instant UI update
      dispatch(moveNodeOptimistic({ nodeId, newParentId, newIndex }))

      try {
        await moveNode(nodeId, newParentId, newIndex)
        // Ensure consistency with the source of truth quietly
        const refreshed = await getWorkspaceTree(activeWorkspaceId)
        dispatch(setTree(refreshed))
      } catch {
        dispatch(setError('Failed to move node'))
        // Revert UI on failure by refetching original state
        const refreshed = await getWorkspaceTree(activeWorkspaceId)
        dispatch(setTree(refreshed))
      }
    },
    [dispatch, activeWorkspaceId]
  )

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId)

  // --------------------------------------------------------------------------
  // WORKSPACE CONTEXT SIDEBAR
  // --------------------------------------------------------------------------
  if (isWorkspaceContext) {
    return (
      <aside className="flex flex-col h-full bg-[#20252b] shadow-2xl text-[#c2c7d0] z-[1038] border-r border-[#2b3035]">
        {/* Back Link */}
        <div className="p-3 border-b border-[#2b3035] bg-[#20252b]">
          <button
            onClick={() => navigate('/workspace')}
            className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-white transition-colors w-full px-2 py-2 bg-transparent hover:bg-white/5 rounded-md"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Workspaces
          </button>
        </div>

        {/* Workspace Title */}
        <div className="px-4 py-4 border-b border-[#2b3035] shrink-0 bg-gradient-to-r from-indigo-500/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Briefcase className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-0.5">Current Workspace</p>
              <h2 className="text-sm font-bold text-[#f8f9fa] truncate leading-tight">
                {activeWorkspace?.name || 'Loading...'}
              </h2>
            </div>
          </div>
        </div>

        {/* Tree Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2b3035] bg-[#20252b]/50 shrink-0 relative">
          <span className="text-[11px] uppercase font-bold tracking-widest text-gray-400/80">
            Spaces
          </span>
          <button
            className="p-1 rounded transition-colors text-[#c2c7d0] hover:bg-white/20 hover:text-white"
            title="New"
            onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
          >
            <Plus className="w-4 h-4" />
          </button>
          {headerMenuOpen && (
            <div
              className="absolute right-4 top-10 w-44 bg-white border border-gray-200 shadow-xl rounded py-1 z-50 flex flex-col"
            >
              <button
                className="w-full flex items-center gap-2.5 text-xs text-left px-3 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => {
                  setHeaderMenuOpen(false)
                  setCreateModal({ open: true, parentNode: null, fixedType: 'FOLDER' })
                }}
              >
                <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Create space
              </button>
              <button
                className="w-full flex items-center gap-2.5 text-xs text-left px-3 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                onClick={() => {
                  setHeaderMenuOpen(false)
                  setCreateModal({ open: true, parentNode: null, fixedType: 'DOCUMENT' })
                }}
              >
                <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Create page
              </button>
            </div>
          )}
        </div>

        {/* Tree Content */}
        <div className="flex-1 overflow-y-auto py-2 custom-scrollbar">
          {treeLoading && (
            <p className="text-xs text-[#869099] text-center mt-8">Loading...</p>
          )}

          {!treeLoading && tree.length === 0 && (
            <p className="text-xs text-[#869099] text-center mt-8 px-4">
              This workspace is empty.
              <br />
              <button
                className="text-[#007bff] hover:underline mt-2"
                onClick={() => setCreateModal({ open: true, parentNode: null, fixedType: 'DOCUMENT' })}
              >
                Create a page
              </button>
            </p>
          )}

          {!treeLoading &&
            tree.map((node, i) => (
              <TreeItem
                key={node.id}
                node={node}
                depth={0}
                index={i}
                activeNodeId={openNodeId}
                onOpenDoc={handleOpenDoc}
                onDeleteNode={handleDeleteNode}
                onRenameNode={(nodeId, currentName) => setRenameModal({ open: true, nodeId, initialName: currentName })}
                onCreateChild={(parentNode, type) => setCreateModal({ open: true, parentNode, fixedType: type })}
                onMoveNode={handleMoveNode}
                onShowDetails={(node) => setDetailsModal({ open: true, entity: node })}
                onDragError={(msg) => dispatch(setError(msg))}
                trail={[]}
                tree={tree}
              />
            ))}
        </div>

        {/* Create Node Modal */}
        <CreateNodeModal
          open={createModal.open}
          fixedType={createModal.fixedType}
          title={createModal.parentNode === null && createModal.fixedType === 'FOLDER' ? 'Create space' : undefined}
          parentName={createModal.parentNode?.name ?? activeWorkspace?.name ?? 'Root'}
          onClose={() => setCreateModal({ open: false, parentNode: null })}
          onConfirm={handleCreateNode}
        />

        {/* Rename Node Modal */}
        <RenameNodeModal
          open={renameModal.open}
          nodeId={renameModal.nodeId}
          initialName={renameModal.initialName}
          onClose={() => setRenameModal({ open: false, nodeId: '', initialName: '' })}
          onConfirm={handleRenameNode}
        />

        {/* Details Modal */}
        <EntityDetailsModal
          open={detailsModal.open}
          entity={detailsModal.entity}
          onClose={() => setDetailsModal({ open: false, entity: null })}
        />

        {/* Confirm Delete Modal */}
        <ConfirmModal
          open={confirmDelete.open}
          title={confirmDelete.type === 'FOLDER' ? 'Delete Folder' : 'Delete Page'}
          message={`Are you sure you want to delete this ${confirmDelete.type === 'FOLDER' ? 'folder and all its contents' : 'page'}? This cannot be undone.`}
          confirmText="Delete"
          danger={true}
          onConfirm={() => executeDeleteNode(confirmDelete.nodeId)}
          onCancel={() => setConfirmDelete({ open: false, nodeId: '', type: null })}
        />
      </aside>
    )
  }

  // --------------------------------------------------------------------------
  // GLOBAL CONTEXT SIDEBAR
  // --------------------------------------------------------------------------
  return (
    <aside className="flex flex-col h-full bg-[#20252b] shadow-2xl text-gray-300 z-[1038] border-r border-[#2b3035]">
      {/* ── Brand Logo ── */}
      <div className="h-[56px] flex items-center px-6 border-b border-[#2b3035] shrink-0 bg-gradient-to-r from-indigo-500/20 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-wide truncate">{config.APP_NAME}</span>
        </div>
      </div>

      {/* ── User Panel ── */}
      {user && (
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#2b3035] shrink-0">
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-sm">
            <User className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm text-gray-100 truncate font-semibold">
              {user.firstName} {user.lastName}
            </span>
            <span className="text-xs text-gray-500 truncate font-medium">Free Plan</span>
          </div>
        </div>
      )}

      {/* ── Main Navigation ── */}
      <nav className="p-3 flex flex-col gap-1.5 shrink-0 overflow-y-auto custom-scrollbar">
        <div className="text-[11px] uppercase font-bold tracking-widest text-gray-500 px-3 py-2 mt-2">
          General
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className={`flex items-center gap-3 text-left text-[14px] px-3 py-2.5 rounded-lg transition-all border ${isDashboard
              ? 'bg-indigo-500/15 text-indigo-400 font-medium shadow-inner border-indigo-500/20'
              : 'hover:bg-white/5 hover:text-white text-gray-400 font-medium border-transparent'
            }`}
        >
          <LayoutDashboard className={`w-5 h-5 ${isDashboard ? 'text-indigo-400' : 'text-purple-400/80'}`} />
          Dashboard
        </button>
        <button
          onClick={() => navigate('/workspace')}
          className={`flex items-center gap-3 text-left text-[14px] px-3 py-2.5 rounded-lg transition-all border ${isWorkspaceList
              ? 'bg-indigo-500/15 text-indigo-400 font-medium shadow-inner border-indigo-500/20'
              : 'hover:bg-white/5 hover:text-white text-gray-400 font-medium border-transparent'
            }`}
        >
          <Briefcase className={`w-5 h-5 ${isWorkspaceList ? 'text-indigo-400' : 'text-indigo-400/80'}`} />
          Workspaces
        </button>

        <div className="text-[11px] uppercase font-bold tracking-widest text-gray-500 px-3 py-2 mt-4">
          Services
        </div>
        <button
          onClick={() => navigate('/cloud-storage')}
          className={`flex items-center gap-3 text-left text-[14px] px-3 py-2.5 rounded-lg transition-all border ${isCloudStorage
              ? 'bg-indigo-500/15 text-indigo-400 font-medium shadow-inner border-indigo-500/20'
              : 'hover:bg-white/5 hover:text-white text-gray-400 font-medium border-transparent'
            }`}
        >
          <Cloud className={`w-5 h-5 ${isCloudStorage ? 'text-indigo-400' : 'text-sky-400/80'}`} />
          Cloud Storage
        </button>
        <button
          onClick={() => navigate('/password-manager')}
          className={`flex items-center gap-3 text-left text-[14px] px-3 py-2.5 rounded-lg transition-all border ${isPasswordManager
              ? 'bg-indigo-500/15 text-indigo-400 font-medium shadow-inner border-indigo-500/20'
              : 'hover:bg-white/5 hover:text-white text-gray-400 font-medium border-transparent'
            }`}
        >
          <Key className={`w-5 h-5 ${isPasswordManager ? 'text-indigo-400' : 'text-amber-400/80'}`} />
          Password Manager
        </button>
        <button
          onClick={() => navigate('/connections')}
          className={`flex items-center gap-3 text-left text-[14px] px-3 py-2.5 rounded-lg transition-all border ${isConnections
              ? 'bg-indigo-500/15 text-indigo-400 font-medium shadow-inner border-indigo-500/20'
              : 'hover:bg-white/5 hover:text-white text-gray-400 font-medium border-transparent'
            }`}
        >
          <Link className={`w-5 h-5 ${isConnections ? 'text-indigo-400' : 'text-emerald-400/80'}`} />
          Connections
        </button>
        <button
          onClick={() => navigate('/other')}
          className={`flex items-center gap-3 text-left text-[14px] px-3 py-2.5 rounded-lg transition-all border ${isOther
              ? 'bg-indigo-500/15 text-indigo-400 font-medium shadow-inner border-indigo-500/20'
              : 'hover:bg-white/5 hover:text-white text-gray-400 font-medium border-transparent'
            }`}
        >
          <MoreHorizontal className={`w-5 h-5 ${isOther ? 'text-indigo-400' : 'text-gray-400/80'}`} />
          Other
        </button>
      </nav>
    </aside>
  )
}
