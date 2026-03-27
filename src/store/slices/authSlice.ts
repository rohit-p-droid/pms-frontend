import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User, AuthResponse } from '../../types';

interface AuthState {
    user: User | null
    token: string | null
    isLoading: boolean
    error: string | null
}

const initialState: AuthState = {
    user: null,
    token: null,
    isLoading: false,
    error: null,
}

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // Set auth data after successful login/register
        setAuth: (state, action: PayloadAction<AuthResponse>) => {
            state.user = action.payload.user
            state.token = action.payload.access_token
            state.error = null
        },

        // Logout and clear auth data
        logout: (state) => {
            state.user = null
            state.token = null
            state.error = null
        },

        // Set loading state
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload
        },

        // Set error message
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload
        },

        // Clear error
        clearError: (state) => {
            state.error = null
        },

        // Restore auth from localStorage (for hydration)
        restoreAuth: (state, action: PayloadAction<{ user: User | null; token: string | null }>) => {
            state.user = action.payload.user
            state.token = action.payload.token
        },
    },
})

export const { setAuth, logout, setLoading, setError, clearError, restoreAuth } = authSlice.actions
export default authSlice.reducer
