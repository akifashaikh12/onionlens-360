import { create } from 'zustand'
import { authAPI } from '../api/client'

const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('access_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),
  loading: false,
  error: null,

  login: async (username, password) => {
    set({ loading: true, error: null })
    try {
      const res = await authAPI.login(username, password)
      const { access_token } = res.data
      localStorage.setItem('access_token', access_token)
      set({ token: access_token, isAuthenticated: true, loading: false })
      // Fetch user profile
      const meRes = await authAPI.me()
      set({ user: meRes.data })
      return true
    } catch (err) {
      set({ error: err.response?.data?.detail || 'Login failed', loading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('access_token')
    set({ user: null, token: null, isAuthenticated: false })
  },

  fetchMe: async () => {
    try {
      const res = await authAPI.me()
      set({ user: res.data })
    } catch {
      set({ isAuthenticated: false, token: null })
      localStorage.removeItem('access_token')
    }
  },
}))

export default useAuthStore
