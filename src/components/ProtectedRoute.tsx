import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../store/store'
import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * Redirects unauthenticated users to /login.
 * Reads token from Redux (which is persisted in localStorage via redux-persist).
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { token } = useSelector((state: RootState) => state.auth)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
