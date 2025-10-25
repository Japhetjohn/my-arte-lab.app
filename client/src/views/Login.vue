<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center px-4">
    <div class="max-w-md w-full">
      <BaseCard>
        <div class="p-8">
          <div class="text-center mb-8">
            <h2 class="text-3xl font-bold text-gray-900">Welcome Back</h2>
            <p class="text-gray-600 mt-2">Log in to your MyArteLab account</p>
          </div>

          <form @submit.prevent="handleLogin">
            <div class="space-y-4">
              <BaseInput
                id="email"
                type="email"
                label="Email"
                v-model="formData.email"
                placeholder="Enter your email"
                required
                :error="errors.email"
              />

              <BaseInput
                id="password"
                type="password"
                label="Password"
                v-model="formData.password"
                placeholder="Enter your password"
                required
                :error="errors.password"
              />

              <div v-if="errors.general" class="text-red-600 text-sm">
                {{ errors.general }}
              </div>

              <BaseButton
                type="submit"
                variant="primary"
                fullWidth
                :loading="loading"
              >
                Log In
              </BaseButton>
            </div>
          </form>

          <div class="mt-6 text-center">
            <p class="text-gray-600">
              Don't have an account?
              <router-link to="/signup" class="text-indigo-600 hover:underline font-semibold">
                Sign up
              </router-link>
            </p>
          </div>

          <div class="mt-4 text-center">
            <router-link to="/" class="text-gray-500 hover:text-gray-700 text-sm">
              ← Back to home
            </router-link>
          </div>
        </div>
      </BaseCard>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import BaseCard from '../components/BaseCard.vue'
import BaseInput from '../components/BaseInput.vue'
import BaseButton from '../components/BaseButton.vue'

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

const handleLogin = async () => {
  errors.value = { email: '', password: '', general: '' }
  loading.value = true

  try {
    await authStore.login(formData.value)

    // Redirect based on role
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
</script>
