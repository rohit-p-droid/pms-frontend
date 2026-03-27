import { apiClient } from '../lib/api'
import type { LoginPayload, RegisterPayload } from '../schemas/auth.schema'
import type { AuthResponse, ApiResponse } from '../types'

/**
 * Auth Service - Handles all authentication-related API calls
 */

export const authService = {
  /**
   * Login user with email and password
   */
  login: async (credentials: LoginPayload): Promise<AuthResponse> => {
    try {
      const response = await apiClient.login(credentials)
      return response
    } catch (error) {
      throw error
    }
  },

  /**
   * Register new user
   */
  register: async (userData: RegisterPayload): Promise<AuthResponse> => {
    try {
      const response = await apiClient.register(userData)
      return response
    } catch (error) {
      throw error
    }
  },

  /**
   * Get current authenticated user
   */
  getMe: async (): Promise<ApiResponse> => {
    try {
      const response = await apiClient.getMe()
      return response
    } catch (error) {
      throw error
    }
  },

  /**
   * Logout user (client-side only, clears Redux state)
   */
  logout: (): void => {
    // Redux will handle the actual state clearing
    // This is mainly for any cleanup needed
    console.log('User logged out')
  },

  /**
   * Refresh auth token (if needed)
   */
  refreshToken: async (): Promise<string> => {
    try {
      const response = await apiClient.getMe()
      return response.data?.token || ''
    } catch (error) {
      throw error
    }
  },
}
