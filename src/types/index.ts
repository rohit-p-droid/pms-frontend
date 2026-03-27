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
}

export interface AuthResponse {
  access_token: string
  user: User
}
