import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { Workspace, TreeNode, RecentDocument } from '../../types'

// ── Breadcrumb ──────────────────────────────────────────────────────────────
export interface BreadcrumbItem {
  label: string
  nodeId?: string
}

// ── State ────────────────────────────────────────────────────────────────────
interface DocsState {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  tree: TreeNode[]
  treeCache: Record<string, TreeNode[]>   // cached trees keyed by workspaceId
  openNodeId: string | null
  openNodeName: string | null
  breadcrumb: BreadcrumbItem[]
  recentDocuments: RecentDocument[]
  treeLoading: boolean
  error: string | null
}

const initialState: DocsState = {
  workspaces: [],
  activeWorkspaceId: null,
  tree: [],
  treeCache: {},
  openNodeId: null,
  openNodeName: null,
  breadcrumb: [],
  recentDocuments: [],
  treeLoading: false,
  error: null,
}

export const docsSlice = createSlice({
  name: 'docs',
  initialState,
  reducers: {
    setWorkspaces(state, action: PayloadAction<Workspace[]>) {
      state.workspaces = action.payload
    },

    setActiveWorkspace(state, action: PayloadAction<string>) {
      const newId = action.payload
      // If we have a cached tree for this workspace, show it immediately
      state.tree = state.treeCache[newId] ?? []
      state.activeWorkspaceId = newId
      state.openNodeId = null
      state.openNodeName = null
      state.breadcrumb = []
    },

    setTree(state, action: PayloadAction<TreeNode[]>) {
      state.tree = action.payload
      // Cache the tree for the active workspace
      if (state.activeWorkspaceId) {
        state.treeCache[state.activeWorkspaceId] = action.payload
      }
    },

    setTreeLoading(state, action: PayloadAction<boolean>) {
      state.treeLoading = action.payload
    },

    openDocument(
      state,
      action: PayloadAction<{ nodeId: string; nodeName: string; breadcrumb: BreadcrumbItem[] }>
    ) {
      state.openNodeId = action.payload.nodeId
      state.openNodeName = action.payload.nodeName
      state.breadcrumb = action.payload.breadcrumb
    },

    closeDocument(state) {
      state.openNodeId = null
      state.openNodeName = null
      state.breadcrumb = []
    },

    setRecentDocuments(state, action: PayloadAction<RecentDocument[]>) {
      state.recentDocuments = action.payload
    },

    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload
    },

    addWorkspace(state, action: PayloadAction<Workspace>) {
      state.workspaces.push(action.payload)
    },

    updateWorkspace(state, action: PayloadAction<{ id: string; name: string; description?: string | null }>) {
      const idx = state.workspaces.findIndex((w) => w.id === action.payload.id)
      if (idx !== -1) {
        state.workspaces[idx].name = action.payload.name
        if (action.payload.description !== undefined) {
          state.workspaces[idx].description = action.payload.description
        }
      }
    },

    removeWorkspace(state, action: PayloadAction<string>) {
      state.workspaces = state.workspaces.filter((w) => w.id !== action.payload)
      if (state.activeWorkspaceId === action.payload) {
        state.activeWorkspaceId = null
        state.tree = []
        state.openNodeId = null
        state.openNodeName = null
        state.breadcrumb = []
      }
    },

    addNode(state, action: PayloadAction<TreeNode>) {
      // Optimistic insert — tree will be refreshed from API after creation
      state.tree.push(action.payload)
    },

    removeNode(state, action: PayloadAction<string>) {
      const removeById = (nodes: TreeNode[], id: string): TreeNode[] =>
        nodes
          .filter((n) => n.id !== id)
          .map((n) => ({ ...n, children: removeById(n.children, id) }))
      state.tree = removeById(state.tree, action.payload)
      if (state.openNodeId === action.payload) {
        state.openNodeId = null
        state.openNodeName = null
        state.breadcrumb = []
      }
    },

    moveNodeOptimistic(
      state,
      action: PayloadAction<{ nodeId: string; newParentId: string | null; newIndex: number }>
    ) {
      const { nodeId, newParentId, newIndex } = action.payload

      let nodeToMove: TreeNode | null = null

      const extractNode = (nodes: TreeNode[]): TreeNode[] => {
        const filtered: TreeNode[] = []
        for (const n of nodes) {
          if (n.id === nodeId) {
            nodeToMove = n // capture
          } else {
            filtered.push({ ...n, children: extractNode(n.children) })
          }
        }
        return filtered
      }

      state.tree = extractNode(state.tree)

      if (!nodeToMove) return
      const targetNode = nodeToMove as unknown as TreeNode

      // Update parent binding
      targetNode.parentId = newParentId

      const insertNode = (nodes: TreeNode[], targetParentId: string | null): TreeNode[] => {
        if (targetParentId === null) {
          const updated = [...nodes]
          // Math.min guards against out-of-bounds indexing identical to the backend
          const safeIndex = Math.max(0, Math.min(newIndex, updated.length))
          updated.splice(safeIndex, 0, targetNode)
          return updated
        }

        return nodes.map((n) => {
          if (n.id === targetParentId) {
            const updatedChildren = [...n.children]
            const safeIndex = Math.max(0, Math.min(newIndex, updatedChildren.length))
            updatedChildren.splice(safeIndex, 0, targetNode)
            return { ...n, children: updatedChildren }
          }
          return { ...n, children: insertNode(n.children, targetParentId) }
        })
      }

      state.tree = insertNode(state.tree, newParentId)
    },
  },
})

export const {
  setWorkspaces,
  setActiveWorkspace,
  setTree,
  setTreeLoading,
  openDocument,
  closeDocument,
  setRecentDocuments,
  setError,
  addWorkspace,
  updateWorkspace,
  removeWorkspace,
  addNode,
  removeNode,
  moveNodeOptimistic,
} = docsSlice.actions

export default docsSlice.reducer
