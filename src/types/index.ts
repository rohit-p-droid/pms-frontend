// API Response types
export interface ApiResponse<T = any> {
  statusCode: number
  message: string
  data?: T
  error?: boolean
  details?: any[]
  timestamp?: string
}

// Auth types
export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  encryptedSecretKey?: string | null
}

export interface AuthResponse {
  access_token: string
  user: User
}

// ── Docs types ────────────────────────────────────────────────────────────────

export interface Workspace {
  id: string
  name: string
  description?: string | null
  userId: string
  createdAt: string
  updatedAt: string
}

export type NodeType = 'FOLDER' | 'DOCUMENT'

export interface TreeNode {
  id: string
  type: NodeType
  name: string
  parentId: string | null
  workspaceId: string
  ordering: number
  createdAt: string
  updatedAt: string
  children: TreeNode[]
}

export interface DocumentContent {
  id: string
  nodeId: string
  content: Record<string, unknown> | null
  updatedAt: string
}

export interface RecentDocument {
  nodeId: string
  name: string
  workspaceId: string
  workspaceName: string
  updatedAt: string
}

