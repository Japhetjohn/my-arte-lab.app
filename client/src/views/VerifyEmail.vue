<template>
  <div class="min-h-screen flex items-center justify-center px-4" style="background: #4B1D80;">
    <div class="max-w-md w-full">
      <BaseCard>
        <div class="p-8">
          <!-- Loading State -->
          <div v-if="loading" class="text-center">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style="border-color: #9747FF;"></div>
            <p class="mt-4 text-gray-600">Verifying your email...</p>
          </div>

          <!-- Success State -->
          <div v-else-if="success" class="text-center">
            <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full" style="background-color: #e8f5e9;">
              <svg class="h-10 w-10" style="color: #4caf50;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 class="mt-6 text-3xl font-bold" style="color: #9747FF;">Email Verified!</h2>
            <p class="mt-3 text-gray-600">
              Your email has been successfully verified. You can now access all features of MyArteLab.
            </p>
            <BaseButton
              @click="goToDashboard"
              variant="primary"
              fullWidth
              class="mt-6"
            >
              Go to Dashboard
            </BaseButton>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="text-center">
            <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full" style="background-color: #ffebee;">
              <svg class="h-10 w-10" style="color: #f44336;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h2 class="mt-6 text-3xl font-bold text-gray-900">Verification Failed</h2>
            <p class="mt-3 text-gray-600">
              {{ errorMessage }}
            </p>
            <div class="mt-6 space-y-3">
              <BaseButton
                @click="goToLogin"
                variant="primary"
                fullWidth
              >
                Go to Login
              </BaseButton>
              <p class="text-sm text-gray-500">
                Need help? Contact support
              </p>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api/axios'
import BaseCard from '../components/BaseCard.vue'
import BaseButton from '../components/BaseButton.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loading = ref(true)
const success = ref(false)
const error = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  const token = route.params.token

  if (!token) {
    error.value = true
    errorMessage.value = 'Invalid verification link.'
    loading.value = false
    return
  }

  try {
    const response = await api.get(`/auth/verify-email/${token}`)

    if (response.data.success) {
      success.value = true

      // Update auth store if user is logged in
      if (authStore.isAuthenticated) {
        await authStore.fetchUser()
      }
    }
  } catch (err) {
    error.value = true
    errorMessage.value = err.response?.data?.message || 'The verification link is invalid or has expired. Please request a new verification email.'
  } finally {
    loading.value = false
  }
})

const goToDashboard = () => {
  if (authStore.isAuthenticated) {
    if (authStore.isCreator) {
      router.push('/creator/dashboard')
    } else if (authStore.isClient) {
      router.push('/client/dashboard')
    }
  } else {
    router.push('/login')
  }
}

const goToLogin = () => {
  router.push('/login')
}
</script>
