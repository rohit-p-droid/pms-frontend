import axios from 'axios';
import { config } from '../config';
import type { AxiosInstance } from 'axios';
import type { ApiResponse, AuthResponse } from '../types';
import type { LoginPayload, RegisterPayload } from '../schemas/auth.schema';
import { store } from '../store/store';

const API_BASE_URL = config.API_URL;

class ApiClient {
    private client: AxiosInstance

    constructor(baseURL: string) {
        this.client = axios.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
        })

        // Add token to requests
        this.client.interceptors.request.use((config) => {
            const token = store.getState().auth.token
            if (token) {
                config.headers.Authorization = `Bearer ${token}`
            }
            return config
        })

        // Handle responses
        this.client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    if (window.location.pathname !== '/login') {
                        localStorage.removeItem('access_token')
                        localStorage.removeItem('user')
                        window.location.href = '/login'
                    }
                }
                return Promise.reject(error)
            }
        )
    }

    async login(payload: LoginPayload): Promise<AuthResponse> {
        const response = await this.client.post<ApiResponse<AuthResponse>>('/auth/login', payload)
        return response.data.data!
    }

    async register(payload: RegisterPayload): Promise<AuthResponse> {
        const response = await this.client.post<ApiResponse<AuthResponse>>('/auth/register', payload)
        return response.data.data!
    }

    async getMe(): Promise<ApiResponse> {
        const response = await this.client.get<ApiResponse>('/auth/me');
        return response.data;
    }

    async verifyPassword(password: string): Promise<boolean> {
        try {
            await this.client.post('/auth/verify-password', { password });
            return true;
        } catch {
            return false;
        }
    }

    async updateSecretKey(encryptedSecretKey: string): Promise<ApiResponse> {
        const response = await this.client.patch<ApiResponse>('/auth/secret-key', { encryptedSecretKey });
        return response.data;
    }

    async changePassword(data: { oldPassword: string, newPassword: string, newEncryptedSecretKey?: string }): Promise<ApiResponse> {
        const response = await this.client.patch<ApiResponse>('/auth/change-password', data);
        return response.data;
    }

    // --- Passwords ---

    async getPasswordFolders(): Promise<import('../types/password').PasswordFolder[]> {
        const response = await this.client.get('/passwords/folders');
        return response.data.data;
    }

    async createPasswordFolder(payload: import('../types/password').CreateFolderPayload): Promise<import('../types/password').PasswordFolder> {
        const response = await this.client.post('/passwords/folders', payload);
        return response.data.data;
    }

    async deletePasswordFolder(id: string): Promise<void> {
        await this.client.delete(`/passwords/folders/${id}`);
    }

    async createPasswordCredential(payload: import('../types/password').CreateCredentialPayload): Promise<import('../types/password').PasswordCredential> {
        const response = await this.client.post('/passwords/credentials', payload);
        return response.data.data;
    }

    async updatePasswordCredential(id: string, payload: import('../types/password').UpdateCredentialPayload): Promise<import('../types/password').PasswordCredential> {
        const response = await this.client.put(`/passwords/credentials/${id}`, payload);
        return response.data.data;
    }

    async deletePasswordCredential(id: string): Promise<void> {
        await this.client.delete(`/passwords/credentials/${id}`);
    }
}

export const apiClient = new ApiClient(API_BASE_URL)
