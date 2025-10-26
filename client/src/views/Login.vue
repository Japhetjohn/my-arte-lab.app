<template>
  <div class="min-h-screen flex overflow-hidden font-['Inter',sans-serif]">
    <!-- Left side - Form Section -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-white relative">
      <!-- Logo in top left -->
      <div class="absolute top-8 left-8">
        <img src="/logo.PNG" alt="MyArteLab" class="h-12 w-auto" />
      </div>

      <!-- Form Card -->
      <div class="w-full max-w-[440px] animate-fade-in">
        <div class="text-center">
          <!-- Header -->
          <h1 class="text-3xl font-semibold text-gray-900 mb-10 tracking-normal font-['Inter',sans-serif]">
            Welcome back
          </h1>
          <p class="text-gray-600 mb-10 text-base">
            Sign in to continue your creative journey.
          </p>

          <!-- Email Verification Warning -->
          <div v-if="showVerificationWarning" class="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-2xl text-left">
            <p class="text-sm font-semibold text-orange-800">
              Email not verified.
              <button @click="resendVerification" :disabled="resendLoading" class="underline hover:text-orange-900 ml-1">
                {{ resendLoading ? 'Sending...' : 'Resend email' }}
              </button>
            </p>
          </div>

          <!-- Initial Buttons (shown when form is hidden) -->
          <div v-if="!showEmailForm" class="flex flex-col gap-4 mb-8">
            <button
              @click="handleGoogleLogin"
              type="button"
              class="w-full flex items-center justify-center gap-3 px-8 py-4 bg-white border border-gray-200 text-gray-900 font-medium text-base rounded-full hover:shadow-[0px_4px_12px_rgba(0,0,0,0.08)] transition-all duration-300"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>

            <button
              @click="showEmailForm = true"
              type="button"
              class="w-full flex items-center justify-center gap-3 px-8 py-4 bg-[#9747FF] text-white font-medium text-base rounded-full hover:bg-[#8636ef] transition-all duration-300"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              Sign in with Email
            </button>
          </div>

          <!-- Form (shown when "Sign in with Email" is clicked) -->
          <form v-if="showEmailForm" @submit.prevent="handleLogin" class="space-y-4">
            <div>
              <input
                type="email"
                v-model="formData.email"
                required
                class="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#9747FF] focus:ring-2 focus:ring-[#9747FF]/20 transition-all"
                placeholder="Email address"
              />
              <p v-if="errors.email" class="mt-1.5 text-sm text-red-600">{{ errors.email }}</p>
            </div>

            <div>
              <input
                type="password"
                v-model="formData.password"
                required
                class="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#9747FF] focus:ring-2 focus:ring-[#9747FF]/20 transition-all"
                placeholder="Password"
              />
              <p v-if="errors.password" class="mt-1.5 text-sm text-red-600">{{ errors.password }}</p>
            </div>

            <div v-if="errors.general" class="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p class="text-sm text-red-800">{{ errors.general }}</p>
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="w-full bg-[#9747FF] hover:bg-[#8636ef] text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#9747FF]/30"
            >
              {{ loading ? 'Signing in...' : 'Sign in with Email' }}
            </button>
          </form>

          <!-- Sign up link -->
          <p class="text-gray-500 text-sm mt-6">
            Don't have an account? <router-link to="/signup?role=client" class="text-[#9747FF] hover:underline font-medium transition-all">Sign up</router-link>
          </p>

          <!-- Terms -->
          <p class="text-gray-400 text-xs mt-6 leading-relaxed">
            By continuing, you agree to our
            <a href="#" class="text-gray-500 hover:text-[#9747FF] transition-colors">Terms of Service</a>
            and
            <a href="#" class="text-gray-500 hover:text-[#9747FF] transition-colors">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>

    <!-- Right side - Visual Section -->
    <div class="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-white via-purple-50 to-[#9747FF]">
      <!-- Geometric shapes -->
      <div class="absolute top-20 right-20 w-96 h-96 bg-[#9747FF]/20 rounded-full blur-3xl animate-pulse"></div>
      <div class="absolute bottom-40 left-20 w-80 h-80 bg-white/30 rounded-full blur-2xl"></div>
      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-[#9747FF]/10 to-transparent rounded-full blur-3xl"></div>

      <!-- Abstract 3D shapes -->
      <div class="absolute top-1/4 left-1/4 w-32 h-32 bg-[#9747FF]/30 backdrop-blur-xl rounded-3xl rotate-12 shadow-2xl"></div>
      <div class="absolute bottom-1/3 right-1/4 w-40 h-40 bg-white/40 backdrop-blur-xl rounded-3xl -rotate-12 shadow-2xl"></div>

      <!-- Center content -->
      <div class="relative z-10 flex items-center justify-center w-full h-full p-16">
        <div class="text-center max-w-lg">
          <!-- Glowing logo -->
          <div class="mb-12 inline-block">
            <div class="w-40 h-40 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-[0_0_60px_rgba(151,71,255,0.5)] p-6">
              <img src="/logo.PNG" alt="MyArteLab" class="w-full h-full object-contain" />
            </div>
          </div>

          <h2 class="text-white text-5xl font-bold mb-6 leading-tight drop-shadow-lg">
            Welcome back to MyArteLab
          </h2>
          <p class="text-white/90 text-xl leading-relaxed drop-shadow-md">
            Continue connecting with Africa's most talented photographers and designers.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api/axios'

const router = useRouter()
const authStore = useAuthStore()

const formData = ref({
  email: '',
  password: ''
})

const errors = ref({
  email: '',
  password: '',
  general: ''
})

const loading = ref(false)
const showVerificationWarning = ref(false)
const resendLoading = ref(false)
const showEmailForm = ref(false)

const handleLogin = async () => {
  errors.value = { email: '', password: '', general: '' }
  showVerificationWarning.value = false
  loading.value = true

  try {
    await authStore.login(formData.value)

    if (authStore.user && !authStore.user.emailVerified) {
      showVerificationWarning.value = true
      loading.value = false
      return
    }

    if (authStore.isCreator) {
      router.push('/creator/dashboard')
    } else if (authStore.isClient) {
      router.push('/client/dashboard')
    } else if (authStore.isAdmin) {
      router.push('/admin')
    }
  } catch (error) {
    errors.value.general = error.response?.data?.message || 'Login failed. Please try again.'
  } finally {
    loading.value = false
  }
}

const handleGoogleLogin = () => {
  window.location.href = 'http://localhost:5000/api/auth/google'
}

const resendVerification = async () => {
  resendLoading.value = true
  try {
    await api.post('/auth/resend-verification')
    alert('Verification email sent! Please check your inbox.')
  } catch (error) {
    alert('Failed to send verification email. Please try again.')
  } finally {
    resendLoading.value = false
  }
}
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}
</style>
