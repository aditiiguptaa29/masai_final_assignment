import axios from 'axios'
import { getSession } from 'next-auth/react'

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL as string
if (!API_URL) {
  throw new Error('Missing NEXT_PUBLIC_BACKEND_URL environment variable')
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const session = await getSession()
      const token = (session?.user as any)?.backendToken
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch {}
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Let NextAuth handle session state; redirect to sign-in
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login'
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  register: (data: any) => apiClient.post('/auth/register', data),
  login: (data: any) => apiClient.post('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  getProfile: () => apiClient.get('/auth/profile'),
  updateProfile: (data: any) => apiClient.put('/auth/profile', data),
  changePassword: (data: any) => apiClient.put('/auth/change-password', data),
}

// User API
export const userApi = {
  getDrivers: (vehicleId?: string) => apiClient.get('/users/drivers', { params: vehicleId ? { vehicleId } : undefined }),
  getAll: (params?: any) => apiClient.get('/users', { params }),
  getById: (id: string) => apiClient.get(`/users/${id}`),
  update: (id: string, data: any) => apiClient.put(`/users/${id}`, data),
  delete: (id: string) => apiClient.delete(`/users/${id}`),
  registerDriverToVehicle: (vehicleId: string) => apiClient.post('/users/driver/register', { vehicleId }),
}

// Vehicle API
export const vehicleApi = {
  getAll: (params?: any) => apiClient.get('/vehicles', { params }),
  getById: (id: string) => apiClient.get(`/vehicles/${id}`),
  getMyVehicles: () => apiClient.get('/vehicles/owner/my-vehicles'),
  create: (data: any) => apiClient.post('/vehicles', data),
  update: (id: string, data: any) => apiClient.put(`/vehicles/${id}`, data),
  delete: (id: string) => apiClient.delete(`/vehicles/${id}`),
}

// Booking API
export const bookingApi = {
  getAll: (params?: any) => apiClient.get('/bookings', { params }),
  getMyBookings: () => apiClient.get('/bookings/my-bookings'),
  getOwnerBookings: () => apiClient.get('/bookings/owner/bookings'),
  getDriverBookings: (params?: any) => apiClient.get('/bookings/driver/bookings', { params }),
  getById: (id: string) => apiClient.get(`/bookings/${id}`),
  create: (data: any) => apiClient.post('/bookings', data),
  update: (id: string, data: any) => apiClient.put(`/bookings/${id}`, data),
  cancel: (id: string, cancelReason?: string) => apiClient.put(`/bookings/${id}/cancel`, { cancelReason }),
  startTrip: (id: string) => apiClient.put(`/bookings/${id}/start`),
  completeTrip: (id: string) => apiClient.put(`/bookings/${id}/complete`),
}

// Trip API
export const tripApi = {
  getAll: (params?: any) => apiClient.get('/trips', { params }),
  getDriverTrips: (params?: any) => apiClient.get('/trips/driver/trips', { params }),
  getById: (id: string) => apiClient.get(`/trips/${id}`),
  create: (data: any) => apiClient.post('/trips', data),
  start: (id: string, data: any) => apiClient.put(`/trips/${id}/start`, data),
  complete: (id: string, data: any) => apiClient.put(`/trips/${id}/complete`, data),
  update: (id: string, data: any) => apiClient.put(`/trips/${id}`, data),
}

// Analytics API
export const analyticsApi = {
  getDashboard: () => apiClient.get('/analytics/dashboard'),
  getRevenue: (params?: any) => apiClient.get('/analytics/revenue', { params }),
  getVehiclePerformance: (id: string) => apiClient.get(`/analytics/vehicles/${id}/performance`),
  getTripAnalytics: (params?: any) => apiClient.get('/analytics/trips', { params }),
}