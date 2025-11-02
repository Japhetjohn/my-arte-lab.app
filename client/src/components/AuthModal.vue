<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
    @click.self="close"
  >
    <div class="bg-[#1a1a1a] rounded-[14px] p-8 max-w-[480px] w-full border border-[#333333]">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-[28px] font-bold text-white">
          {{ isSignUp ? 'Create Account' : 'Sign In' }}
        </h2>
        <button @click="close" class="text-[#666666] hover:text-white transition-all">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Description -->
      <p class="text-neutral-400 text-sm mb-6">
        {{ isSignUp
          ? 'Join MyArteLab to book talented creators and bring your projects to life.'
          : 'Welcome back! Sign in to continue booking.'
        }}
      </p>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <!-- Name (Sign Up only) -->
        <Input
          v-if="isSignUp"
          v-model="form.name"
          type="text"
          label="Full Name"
          placeholder="e.g., John Doe"
          required
        >
          <template #iconLeft>
            <svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </template>
        </Input>

        <!-- Email -->
        <Input
          v-model="form.email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          required
        >
          <template #iconLeft>
            <svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </template>
        </Input>

        <!-- Password -->
        <Input
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          label="Password"
          :placeholder="isSignUp ? 'Create a strong password' : 'Enter your password'"
          required
        >
          <template #iconLeft>
            <svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </template>
          <template #iconRight>
            <button
              type="button"
              @click="showPassword = !showPassword"
              class="text-neutral-400 hover:text-white transition-all"
            >
              <svg v-if="!showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            </button>
          </template>
        </Input>

        <!-- Role Selection (Sign Up only) -->
        <Select
          v-if="isSignUp"
          v-model="form.role"
          label="I want to..."
          placeholder="Select your role"
          :options="roleOptions"
          required
        />

        <!-- Forgot Password (Sign In only) -->
        <div v-if="!isSignUp" class="text-right">
          <button type="button" class="text-primary text-sm hover:underline">
            Forgot Password?
          </button>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-3">
          <p class="text-red-500 text-sm">{{ errorMessage }}</p>
        </div>

        <!-- Submit Button -->
        <Button
          type="submit"
          variant="primary"
          size="lg"
          full-width
          :disabled="isLoading"
        >
          <template v-if="isLoading">
            <Loading size="sm" variant="light" />
            <span class="ml-2">{{ isSignUp ? 'Creating Account...' : 'Signing In...' }}</span>
          </template>
          <span v-else>{{ isSignUp ? 'Create Account' : 'Sign In' }}</span>
        </Button>
      </form>

      <!-- Divider -->
      <div class="relative my-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-[#333333]"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-2 bg-[#1a1a1a] text-neutral-400">or continue with</span>
        </div>
      </div>

      <!-- Social Login -->
      <div class="grid grid-cols-2 gap-3 mb-6">
        <Button variant="secondary" size="md" full-width @click="handleSocialLogin('google')">
          <template #iconLeft>
            <svg class="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          </template>
          Google
        </Button>
        <Button variant="secondary" size="md" full-width @click="handleSocialLogin('apple')">
          <template #iconLeft>
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
          </template>
          Apple
        </Button>
      </div>

      <!-- Toggle Sign In/Sign Up -->
      <div class="text-center">
        <p class="text-neutral-400 text-sm">
          {{ isSignUp ? 'Already have an account?' : "Don't have an account?" }}
          <button
            type="button"
            @click="toggleMode"
            class="text-primary font-semibold hover:underline ml-1"
          >
            {{ isSignUp ? 'Sign In' : 'Sign Up' }}
          </button>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import Button from './design-system/Button.vue'
import Input from './design-system/Input.vue'
import Select from './design-system/Select.vue'
import Loading from './design-system/Loading.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  },
  defaultMode: {
    type: String,
    default: 'signin', // 'signin' or 'signup'
    validator: (value) => ['signin', 'signup'].includes(value)
  }
})

const emit = defineEmits(['update:modelValue', 'authenticated'])

// State
const isSignUp = ref(props.defaultMode === 'signup')
const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

const form = ref({
  name: '',
  email: '',
  password: '',
  role: ''
})

const roleOptions = [
  { label: 'Book creators (Client)', value: 'client' },
  { label: 'Offer my services (Creator)', value: 'creator' }
]

// Watch for mode changes from parent
watch(() => props.defaultMode, (newMode) => {
  isSignUp.value = newMode === 'signup'
})

// Methods
const close = () => {
  emit('update:modelValue', false)
  // Reset form after a delay to prevent visible reset during close animation
  setTimeout(() => {
    form.value = {
      name: '',
      email: '',
      password: '',
      role: ''
    }
    errorMessage.value = ''
  }, 300)
}

const toggleMode = () => {
  isSignUp.value = !isSignUp.value
  errorMessage.value = ''
}

const handleSubmit = async () => {
  errorMessage.value = ''
  isLoading.value = true

  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Mock validation
    if (form.value.email === 'test@error.com') {
      throw new Error('Invalid credentials. Please try again.')
    }

    // Mock user data
    const userData = {
      id: Date.now(),
      name: isSignUp.value ? form.value.name : 'John Doe',
      email: form.value.email,
      role: isSignUp.value ? form.value.role : 'client',
      avatar: null
    }

    // Store in localStorage (temporary solution)
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('isAuthenticated', 'true')

    console.log(isSignUp.value ? 'User signed up:' : 'User signed in:', userData)

    // Emit authenticated event with user data
    emit('authenticated', userData)
    close()
  } catch (error) {
    errorMessage.value = error.message || 'An error occurred. Please try again.'
  } finally {
    isLoading.value = false
  }
}

const handleSocialLogin = async (provider) => {
  errorMessage.value = ''
  isLoading.value = true

  try {
    // Simulate social login
    await new Promise(resolve => setTimeout(resolve, 1000))

    const userData = {
      id: Date.now(),
      name: provider === 'google' ? 'Google User' : 'Apple User',
      email: `user@${provider}.com`,
      role: 'client',
      avatar: null
    }

    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('isAuthenticated', 'true')

    console.log(`Signed in with ${provider}:`, userData)

    emit('authenticated', userData)
    close()
  } catch (error) {
    errorMessage.value = `Failed to sign in with ${provider}. Please try again.`
  } finally {
    isLoading.value = false
  }
}
</script>
