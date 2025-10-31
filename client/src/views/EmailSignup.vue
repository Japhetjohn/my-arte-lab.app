<template>
  <div class="min-h-screen flex overflow-hidden font-['Inter',sans-serif]">
    <!-- Left side - Form Section -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-16 bg-white relative min-h-screen">
      <!-- Logo in top left -->
      <div class="absolute top-4 left-4 sm:top-8 sm:left-8">
        <img src="/logo.PNG" alt="MyArteLab" class="h-8 sm:h-12 w-auto" />
      </div>

      <!-- Form Card -->
      <div class="w-full max-w-[420px] animate-fade-in px-2 sm:px-0" style="margin-top: 60px; margin-bottom: 48px;">
        <div class="bg-white rounded-[14px] px-4 sm:px-8 py-8 sm:py-12">
          <!-- Header -->
          <h1 class="text-2xl font-semibold text-[#111111] mb-8 font-['Inter',sans-serif]">
            Create your account
          </h1>

          <!-- Spacer 1 -->
          <div class="h-6"></div>

          <!-- Form Inputs -->
          <form @submit.prevent="handleSignup" class="space-y-8">
            <!-- Email Address -->
            <div>
              <label for="email" class="sr-only">Email Address</label>
              <input
                id="email"
                type="email"
                v-model="formData.email"
                @input="validateEmail"
                placeholder="Email Address"
                required
                class="w-full h-[56px] px-5 border-[1.5px] border-[#E8E8E8] rounded-[12px] bg-transparent placeholder-[#ACACAC] text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200"
                :class="errors.email ? 'border-red-400' : 'border-[#E4E4E4]'"
              />
              <p v-if="errors.email" class="text-xs text-[#E55353] mt-2">{{ errors.email }}</p>
            </div>

            <!-- Spacer -->
            <div class="h-6"></div>

            <!-- Username -->
            <div>
              <label for="username" class="sr-only">Username</label>
              <input
                id="username"
                type="text"
                v-model="formData.username"
                placeholder="Username"
                required
                class="w-full h-[56px] px-5 border-[1.5px] border-[#E8E8E8] rounded-[12px] bg-transparent placeholder-[#ACACAC] text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200"
              />
            </div>

            <!-- Spacer -->
            <div class="h-6"></div>

            <!-- Password -->
            <div class="relative">
              <label for="password" class="sr-only">Password</label>
              <input
                id="password"
                :type="showPassword ? 'text' : 'password'"
                v-model="formData.password"
                @input="validatePassword"
                placeholder="Password"
                required
                class="w-full h-[56px] px-5 pr-14 border-[1.5px] border-[#E4E4E4] rounded-[12px] bg-white placeholder-[#ACACAC] text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200"
                :class="errors.password ? 'border-red-400' : 'border-[#E4E4E4]'"
              />
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-[#9E9E9E] hover:text-[#9747FF] transition-colors duration-200"
                aria-label="Toggle password visibility"
              >
                <svg v-if="!showPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
              </button>
              <p v-if="errors.password" class="text-xs text-[#E55353] mt-2">{{ errors.password }}</p>
            </div>

            <!-- Spacer -->
            <div class="h-6"></div>

            <!-- Confirm Password -->
            <div class="relative">
              <label for="confirmPassword" class="sr-only">Confirm Password</label>
              <input
                id="confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                v-model="formData.confirmPassword"
                @input="validateConfirmPassword"
                placeholder="Confirm Password"
                required
                class="w-full h-[56px] px-5 pr-14 border-[1.5px] border-[#E4E4E4] rounded-[12px] bg-white placeholder-[#ACACAC] text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200"
                :class="errors.confirmPassword ? 'border-red-400' : 'border-[#E4E4E4]'"
              />
              <button
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="absolute right-4 top-1/2 -translate-y-1/2 text-[#9E9E9E] hover:text-[#9747FF] transition-colors duration-200"
                aria-label="Toggle confirm password visibility"
              >
                <svg v-if="!showConfirmPassword" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
              </button>
              <p v-if="errors.confirmPassword" class="text-xs text-[#E55353] mt-2">{{ errors.confirmPassword }}</p>
            </div>

            <!-- Error Message -->
            <div v-if="errors.general" class="p-4 bg-red-50 border border-red-200 rounded-[12px] mb-6">
              <p class="text-sm text-[#E55353]">{{ errors.general }}</p>
            </div>

            <!-- Spacer before button -->
            <div class="h-8"></div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="loading"
              class="w-full h-[58px] bg-gradient-to-r from-[#9747FF] to-[#C86FFF] text-white font-semibold text-base rounded-[12px] shadow-[0_10px_28px_rgba(151,71,255,0.34)] hover:shadow-[0_14px_34px_rgba(151,71,255,0.40)] hover:-translate-y-[3px] active:scale-[0.985] active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="!loading">Sign Up</span>
              <span v-else class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating account...
              </span>
            </button>
          </form>

          <!-- Spacer after button -->
          <div class="h-10"></div>

          <!-- Sign in link -->
          <p class="text-[14px] text-[#6B6B6B] text-center">
            Already have an account? <router-link to="/login" class="text-[#9747FF] hover:underline font-medium transition-colors">Sign in</router-link>
          </p>

          <!-- Spacer before terms -->
          <div class="h-6"></div>

          <!-- Terms -->
          <p class="text-xs text-[#A1A1A1] text-center leading-relaxed">
            By continuing, you agree to our
            <a href="#" class="text-[#9747FF] hover:underline">Terms of Service</a>
            and
            <a href="#" class="text-[#9747FF] hover:underline">Privacy Policy</a>
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
            <div class="w-40 h-40 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-[0_0_60px_rgba(151,71,255,0.5)] p-6" style="filter: drop-shadow(0 0 15px rgba(255,255,255,0.4))">
              <img src="/logo.PNG" alt="MyArteLab" class="w-full h-full object-contain" />
            </div>
          </div>

          <h2 class="text-white text-5xl font-bold mb-6 leading-tight drop-shadow-lg">
            Connect with Africa's best creatives
          </h2>
          <p class="text-[#EDEDED] text-xl leading-relaxed drop-shadow-md" style="line-height: 1.6">
            Join thousands of photographers and designers building amazing projects together.
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

const router = useRouter()
const authStore = useAuthStore()

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const loading = ref(false)

const formData = ref({
  email: '',
  username: '',
  password: '',
  confirmPassword: ''
})

const errors = ref({
  email: '',
  password: '',
  confirmPassword: '',
  general: ''
})

const validateEmail = () => {
  if (!formData.value.email) {
    errors.value.email = ''
    return false
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(formData.value.email)) {
    errors.value.email = 'Please enter a valid email address'
    return false
  }
  errors.value.email = ''
  return true
}

const validatePassword = () => {
  if (!formData.value.password) {
    errors.value.password = ''
    return false
  }
  if (formData.value.password.length < 6) {
    errors.value.password = 'Password must be at least 6 characters'
    return false
  }
  errors.value.password = ''
  return true
}

const validateConfirmPassword = () => {
  if (!formData.value.confirmPassword) {
    errors.value.confirmPassword = ''
    return false
  }
  if (formData.value.password !== formData.value.confirmPassword) {
    errors.value.confirmPassword = 'Passwords do not match'
    return false
  }
  errors.value.confirmPassword = ''
  return true
}

const handleSignup = async () => {
  errors.value = { email: '', password: '', confirmPassword: '', general: '' }

  if (!validateEmail() || !validatePassword() || !validateConfirmPassword()) {
    return
  }

  loading.value = true

  // Simulate loading for better UX
  setTimeout(() => {
    loading.value = false
    // Bypass authentication - just redirect to questionnaire for now
    router.push('/questionnaire')
  }, 800)
}
</script>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 360ms ease-out;
}

/* Focus state with subtle lift */
input:focus {
  transform: translateY(-1px);
}

/* Responsive adjustments */
@media (max-width: 880px) {
  .min-h-screen {
    flex-direction: column;
  }

  .max-w-\[420px\] {
    max-width: 92%;
  }

  .bg-white.rounded-\[14px\] {
    padding: 2rem;
  }

  input {
    height: 52px !important;
  }

  .space-y-8 > * + * {
    margin-top: 2rem;
  }

  .h-6 { height: 1.5rem; }
  .h-8 { height: 2rem; }
  .h-10 { height: 2.5rem; }
}
</style>