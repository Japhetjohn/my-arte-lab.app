<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center px-4 py-12">
    <div class="max-w-md w-full">
      <BaseCard>
        <div class="p-8">
          <div class="text-center mb-8">
            <h2 class="text-3xl font-bold text-gray-900">Create Account</h2>
            <p class="text-gray-600 mt-2">
              Sign up as {{ roleLabel }}
            </p>
          </div>

          <form @submit.prevent="handleSignup">
            <div class="space-y-4">
              <BaseInput
                id="name"
                type="text"
                label="Full Name"
                v-model="formData.name"
                placeholder="Enter your full name"
                required
              />

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
                placeholder="Create a password (min 6 characters)"
                required
                :error="errors.password"
                hint="At least 6 characters"
              />

              <BaseInput
                id="location"
                type="text"
                label="Location"
                v-model="formData.location"
                placeholder="e.g., Lagos, Nigeria"
                required
              />

              <div v-if="formData.role === 'creator'">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Category <span class="text-red-500">*</span>
                </label>
                <select
                  v-model="formData.category"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="">Select category</option>
                  <option value="photography">Photography</option>
                  <option value="design">Design</option>
                </select>
              </div>

              <div v-if="errors.general" class="text-red-600 text-sm">
                {{ errors.general }}
              </div>

              <BaseButton
                type="submit"
                variant="primary"
                fullWidth
                :loading="loading"
              >
                Create Account
              </BaseButton>
            </div>
          </form>

          <div class="mt-6 text-center">
            <p class="text-gray-600">
              Already have an account?
              <router-link to="/login" class="text-indigo-600 hover:underline font-semibold">
                Log in
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
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import BaseCard from '../components/BaseCard.vue'
import BaseInput from '../components/BaseInput.vue'
import BaseButton from '../components/BaseButton.vue'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formData = ref({
  name: '',
  email: '',
  password: '',
  location: '',
  role: 'client',
  category: ''
})

const errors = ref({
  email: '',
  password: '',
  general: ''
})

const loading = ref(false)

const roleLabel = computed(() => {
  return formData.value.role === 'creator' ? 'a Creator' : 'a Client'
})

onMounted(() => {
  // Get role from query params
  const role = route.query.role
  if (role === 'creator' || role === 'client') {
    formData.value.role = role
  }
})

const handleSignup = async () => {
  errors.value = { email: '', password: '', general: '' }

  // Validation
  if (formData.value.password.length < 6) {
    errors.value.password = 'Password must be at least 6 characters'
    return
  }

  if (formData.value.role === 'creator' && !formData.value.category) {
    errors.value.general = 'Please select a category'
    return
  }

  loading.value = true

  try {
    const userData = {
      email: formData.value.email,
      password: formData.value.password,
      role: formData.value.role,
      name: formData.value.name,
      location: formData.value.location
    }

    await authStore.register(userData)

    // Redirect to onboarding based on role
    if (formData.value.role === 'creator') {
      router.push('/creator/onboarding')
    } else {
      router.push('/client/dashboard')
    }
  } catch (error) {
    errors.value.general = error.response?.data?.message || 'Signup failed. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>
