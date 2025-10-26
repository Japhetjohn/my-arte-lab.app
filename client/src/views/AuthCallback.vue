<template>
  <div class="min-h-screen flex items-center justify-center px-4" style="background: #4B1D80;">
    <div class="max-w-md w-full">
      <BaseCard>
        <div class="p-8 text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2" style="border-color: #9747FF;"></div>
          <h2 class="mt-4 text-xl font-semibold" style="color: #9747FF;">Completing Sign In...</h2>
          <p class="mt-2 text-gray-600">Please wait while we log you in.</p>
        </div>
      </BaseCard>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import BaseCard from '../components/BaseCard.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

onMounted(async () => {
  // Get token and role from URL params
  const token = route.query.token
  const role = route.query.role
  const error = route.query.error

  if (error) {
    alert('Google Sign In failed. Please try again.')
    router.push('/login')
    return
  }

  if (!token) {
    alert('Authentication failed. Please try again.')
    router.push('/login')
    return
  }

  try {
    // Store the token
    localStorage.setItem('token', token)

    // Fetch user data
    await authStore.fetchUser()

    // Redirect based on role
    if (authStore.isCreator) {
      router.push('/creator/dashboard')
    } else if (authStore.isClient) {
      router.push('/client/dashboard')
    } else {
      router.push('/discover')
    }
  } catch (error) {
    console.error('Auth callback error:', error)
    alert('Failed to complete sign in. Please try again.')
    router.push('/login')
  }
})
</script>
