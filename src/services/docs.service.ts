import axios from 'axios'
import { config } from '../config'
import type { Workspace, TreeNode, DocumentContent, RecentDocument } from '../types'
import { store } from '../store/store'

const http = axios.create({ baseURL: config.API_URL })

// Inject auth token on every request
http.interceptors.request.use((cfg) => {
  const token = store.getState().auth.token
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Types matching backend ResponseFormatter shape
interface ApiResp<T> {
  statusCode: number
  message: string
  data: T
}

// ── Workspaces ────────────────────────────────────────────────────────────────

export async function listWorkspaces(): Promise<Workspace[]> {
  const res = await http.get<ApiResp<Workspace[]>>('/workspaces')
  return res.data.data
}

export async function createWorkspace(name: string, description?: string | null): Promise<Workspace> {
  const res = await http.post<ApiResp<Workspace>>('/workspaces', { name, description })
  return res.data.data
}

export async function renameWorkspace(id: string, name: string, description?: string | null): Promise<Workspace> {
  const res = await http.patch<ApiResp<Workspace>>(`/workspaces/${id}`, { name, description })
  return res.data.data
}

export async function deleteWorkspace(id: string): Promise<void> {
  await http.delete(`/workspaces/${id}`)
}

export async function getWorkspaceTree(workspaceId: string): Promise<TreeNode[]> {
  const res = await http.get<ApiResp<TreeNode[]>>(`/workspaces/${workspaceId}/tree`)
  return res.data.data
}

// ── Nodes ─────────────────────────────────────────────────────────────────────

export interface CreateNodePayload {
  workspaceId: string
  type: 'FOLDER' | 'DOCUMENT'
  name: string
  parentId?: string | null
}

export async function createNode(payload: CreateNodePayload): Promise<TreeNode> {
  const res = await http.post<ApiResp<TreeNode>>('/nodes', payload)
  return res.data.data
}

export async function moveNode(id: string, parentId: string | null, index: number): Promise<TreeNode> {
  const res = await http.put<ApiResp<TreeNode>>(`/nodes/${id}/move`, { parentId, index })
  return res.data.data
}

export async function renameNode(id: string, name: string): Promise<TreeNode> {
  const res = await http.patch<ApiResp<TreeNode>>(`/nodes/${id}`, { name })
  return res.data.data
}

export async function deleteNode(id: string): Promise<void> {
  await http.delete(`/nodes/${id}`)
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function getDocumentContent(nodeId: string): Promise<DocumentContent | null> {
  const res = await http.get<ApiResp<DocumentContent | null>>(`/documents/${nodeId}`)
  return res.data.data
}

export async function saveDocumentContent(
  nodeId: string,
  content: Record<string, unknown>
): Promise<DocumentContent> {
  const res = await http.put<ApiResp<DocumentContent>>(`/documents/${nodeId}/content`, {
    content,
  })
  return res.data.data
}

export async function getRecentDocuments(): Promise<RecentDocument[]> {
  const res = await http.get<ApiResp<RecentDocument[]>>('/documents/recent')
  return res.data.data
}
