import { ref, computed } from 'vue'

// Shared authentication state
const user = ref(null)
const isAuthenticated = ref(false)

// Initialize from localStorage on app load
const initAuth = () => {
  const storedUser = localStorage.getItem('user')
  const storedAuthStatus = localStorage.getItem('isAuthenticated')

  if (storedAuthStatus === 'true' && storedUser) {
    try {
      user.value = JSON.parse(storedUser)
      isAuthenticated.value = true
    } catch (error) {
      console.error('Error parsing stored user data:', error)
      logout()
    }
  }
}

// Login function
const login = (userData) => {
  user.value = userData
  isAuthenticated.value = true
  localStorage.setItem('user', JSON.stringify(userData))
  localStorage.setItem('isAuthenticated', 'true')
}

// Logout function
const logout = () => {
  user.value = null
  isAuthenticated.value = false
  localStorage.removeItem('user')
  localStorage.removeItem('isAuthenticated')
}

// Update user function
const updateUser = (updates) => {
  if (user.value) {
    user.value = { ...user.value, ...updates }
    localStorage.setItem('user', JSON.stringify(user.value))
  }
}

// Check if user has specific role
const hasRole = (role) => {
  return computed(() => user.value?.role === role)
}

// Composable hook
export const useAuth = () => {
  return {
    user: computed(() => user.value),
    isAuthenticated: computed(() => isAuthenticated.value),
    isClient: hasRole('client'),
    isCreator: hasRole('creator'),
    login,
    logout,
    updateUser,
    initAuth
  }
}
