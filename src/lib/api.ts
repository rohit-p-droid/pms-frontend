import axios from 'axios';
import { config } from '../config';
import type { AxiosInstance } from 'axios';
import type { ApiResponse, AuthResponse } from '../types';
import type { LoginPayload, RegisterPayload } from '../schemas/auth.schema';

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
            const token = localStorage.getItem('access_token')
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
                    localStorage.removeItem('access_token')
                    localStorage.removeItem('user')
                    window.location.href = '/login'
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
        const response = await this.client.get<ApiResponse>('/auth/me')
        return response.data
    }
}

export const apiClient = new ApiClient(API_BASE_URL)
