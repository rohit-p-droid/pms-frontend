import type { RootState, AppDispatch } from '../store';
import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';

// Custom typed dispatch hook
export const useAppDispatch = () => useDispatch<AppDispatch>()

// Custom typed selector hook
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// Auth selectors
export const useAuthUser = () => useAppSelector((state) => state.auth.user)
export const useAuthToken = () => useAppSelector((state) => state.auth.token)
export const useAuthLoading = () => useAppSelector((state) => state.auth.isLoading)
export const useAuthError = () => useAppSelector((state) => state.auth.error)

// Combined auth selector for convenience
export const useAuth = () => useAppSelector((state) => state.auth)

// Check if authenticated
export const useIsAuthenticated = () => {
  const token = useAuthToken()
  return !!token
}
