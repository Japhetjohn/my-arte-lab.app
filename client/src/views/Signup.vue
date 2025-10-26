<template>
  <div class="min-h-screen flex overflow-hidden font-['Inter',sans-serif]">
    <!-- Left side - Form Section -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 bg-white relative">
      <!-- Logo in top left -->
      <div class="absolute top-8 left-8">
        <img src="/logo.PNG" alt="MyArteLab" class="h-12 w-auto" />
      </div>

      <!-- Form Card -->
      <div class="w-full max-w-md animate-fade-in">
        <div class="bg-white rounded-xl shadow-md p-8 space-y-6">
          <!-- Header -->
          <h1 class="text-2xl font-semibold text-gray-900 text-center font-['Inter',sans-serif]">
            Create your account
          </h1>

          <!-- Success Message -->
          <div v-if="showSuccessMessage" class="mb-8 p-4 bg-green-50 border border-green-200 rounded-2xl text-left">
            <p class="text-sm font-semibold text-green-800">
              Success! Check your email to verify your account.
            </p>
            <p class="text-xs text-green-600 mt-1">{{ formData.email }}</p>
          </div>

          <!-- Initial Buttons (shown when no step is active) -->
          <div v-if="currentStep === 0" class="flex flex-col gap-4">
            <button
              @click="handleGoogleSignup"
              type="button"
              class="w-full flex items-center justify-center gap-3 h-12 bg-white border border-gray-300 text-gray-900 font-medium text-sm rounded-lg hover:bg-gray-50 transition-all duration-200"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </button>

            <button
              @click="currentStep = 1"
              type="button"
              class="w-full h-12 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold text-sm rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-[0_2px_8px_rgba(139,92,246,0.4)]"
            >
              Sign up with Email
            </button>
          </div>

          <!-- Multi-step Form -->
          <div v-if="currentStep > 0" class="space-y-6">
            <!-- Progress Indicator -->
            <div class="flex justify-center space-x-2">
              <div v-for="step in 5" :key="step"
                :class="[
                  'w-3 h-1.5 rounded-full transition-all duration-300',
                  step === currentStep ? 'bg-purple-600' : 'bg-gray-300'
                ]"
              ></div>
            </div>

            <!-- Step 1: Email -->
            <div v-if="currentStep === 1" :class="slideDirection === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'">
              <div class="text-center space-y-1">
                <h1 class="text-2xl font-semibold text-gray-900">Create your account</h1>
                <h2 class="text-lg font-medium text-gray-800">What's your email?</h2>
                <p class="text-sm text-gray-500">We'll use this to create your account</p>
              </div>
              <div class="space-y-4 mt-6">
                <input
                  type="email"
                  v-model="formData.email"
                  @keyup.enter="handleStepContinue"
                  @input="validateEmail"
                  autofocus
                  required
                  class="w-full px-3 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="you@example.com"
                />
                <p v-if="errors.email" class="text-sm text-red-600 text-center">{{ errors.email }}</p>
                <button
                  @click="handleStepContinue"
                  type="button"
                  :disabled="!formData.email || !!errors.email"
                  :class="[
                    'w-full py-3 text-white font-medium rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 shadow-md transition-all duration-200',
                    !formData.email || errors.email ? 'opacity-60 cursor-not-allowed' : 'hover:from-purple-600 hover:to-blue-600'
                  ]"
                >
                  Continue
                </button>
              </div>
            </div>

            <!-- Step 2: Password -->
            <div v-if="currentStep === 2" :class="slideDirection === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'">
              <button @click="prevStep" class="mb-4 text-[#718096] hover:text-[#2D3748] transition-all duration-200">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <div class="text-center space-y-2 mb-6">
                <h1 class="text-2xl font-bold text-[#1A202C] font-['Poppins',sans-serif]">Create your account</h1>
                <h2 class="text-base font-medium text-[#2D3748]">Choose a password</h2>
                <p class="text-sm text-[#718096] leading-relaxed">Must be at least 6 characters</p>
              </div>
              <div class="space-y-4">
                <input
                  type="password"
                  v-model="formData.password"
                  @keyup.enter="handleStepContinue"
                  @input="validatePassword"
                  autofocus
                  required
                  aria-label="Password"
                  class="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg text-gray-900 placeholder-[#A0AEC0] focus:outline-none focus:border-[#4C51BF] focus:border-2 transition-all duration-200"
                  placeholder="••••••••"
                />
                <p v-if="errors.password" class="text-sm text-red-600">{{ errors.password }}</p>
                <button
                  @click="handleStepContinue"
                  type="button"
                  :disabled="!formData.password || !!errors.password"
                  aria-label="Continue to next step"
                  :class="[
                    'w-full py-3 px-5 text-white font-medium rounded-lg transition-all duration-200',
                    !formData.password || errors.password
                      ? 'bg-[#4C51BF] opacity-60 cursor-not-allowed'
                      : 'bg-[#4C51BF] hover:bg-[#667EEA] hover:scale-105 active:scale-100'
                  ]"
                >
                  Continue
                </button>
              </div>
            </div>

            <!-- Step 3: Name -->
            <div v-if="currentStep === 3" :class="slideDirection === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'">
              <button @click="prevStep" class="mb-4 text-[#718096] hover:text-[#2D3748] transition-all duration-200">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <div class="text-center space-y-2 mb-6">
                <h1 class="text-2xl font-bold text-[#1A202C] font-['Poppins',sans-serif]">Create your account</h1>
                <h2 class="text-base font-medium text-[#2D3748]">What's your name?</h2>
                <p class="text-sm text-[#718096] leading-relaxed">This will appear on your profile</p>
              </div>
              <div class="space-y-4">
                <input
                  type="text"
                  v-model="formData.name"
                  @keyup.enter="handleStepContinue"
                  autofocus
                  required
                  aria-label="Full name"
                  class="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg text-gray-900 placeholder-[#A0AEC0] focus:outline-none focus:border-[#4C51BF] focus:border-2 transition-all duration-200"
                  placeholder="John Doe"
                />
                <button
                  @click="handleStepContinue"
                  type="button"
                  :disabled="!formData.name"
                  aria-label="Continue to next step"
                  :class="[
                    'w-full py-3 px-5 text-white font-medium rounded-lg transition-all duration-200',
                    !formData.name
                      ? 'bg-[#4C51BF] opacity-60 cursor-not-allowed'
                      : 'bg-[#4C51BF] hover:bg-[#667EEA] hover:scale-105 active:scale-100'
                  ]"
                >
                  Continue
                </button>
              </div>
            </div>

            <!-- Step 4: Location -->
            <div v-if="currentStep === 4" :class="slideDirection === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'">
              <button @click="prevStep" class="mb-4 text-[#718096] hover:text-[#2D3748] transition-all duration-200">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <div class="text-center space-y-2 mb-6">
                <h1 class="text-2xl font-bold text-[#1A202C] font-['Poppins',sans-serif]">Create your account</h1>
                <h2 class="text-base font-medium text-[#2D3748]">Where are you located?</h2>
                <p class="text-sm text-[#718096] leading-relaxed">Select your state in Nigeria</p>
              </div>
              <div class="space-y-4">
                <select
                  v-model="formData.location"
                  autofocus
                  required
                  aria-label="Location"
                  class="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg text-gray-900 focus:outline-none focus:border-[#4C51BF] focus:border-2 appearance-none cursor-pointer transition-all duration-200"
                  style="background-image: url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%234C51BF%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e'); background-repeat: no-repeat; background-position: right 1rem center; background-size: 1.2em 1.2em;"
                >
                  <option value="">Select your state</option>
                  <option v-for="state in nigerianStates" :key="state" :value="state">{{ state }}</option>
                </select>
                <button
                  @click="handleStepContinue"
                  type="button"
                  :disabled="!formData.location"
                  aria-label="Continue to next step"
                  :class="[
                    'w-full py-3 px-5 text-white font-medium rounded-lg transition-all duration-200',
                    !formData.location
                      ? 'bg-[#4C51BF] opacity-60 cursor-not-allowed'
                      : 'bg-[#4C51BF] hover:bg-[#667EEA] hover:scale-105 active:scale-100'
                  ]"
                >
                  Continue
                </button>
              </div>
            </div>

            <!-- Step 5: Role Selection -->
            <div v-if="currentStep === 5" :class="slideDirection === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'">
              <button @click="prevStep" class="mb-4 text-[#718096] hover:text-[#2D3748] transition-all duration-200">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <div class="text-center space-y-2 mb-6">
                <h1 class="text-2xl font-bold text-[#1A202C] font-['Poppins',sans-serif]">Create your account</h1>
                <h2 class="text-base font-medium text-[#2D3748]">I am...</h2>
                <p class="text-sm text-[#718096] leading-relaxed">Select what describes you best</p>
              </div>
              <div class="space-y-3">
                <button
                  @click="selectRole('creator')"
                  type="button"
                  class="w-full p-5 border-2 border-[#E2E8F0] rounded-lg hover:border-[#4C51BF] hover:bg-[#EBF4FF] transition-all duration-200 text-left group"
                >
                  <div class="flex items-start gap-4">
                    <div class="p-3 bg-[#EBF4FF] rounded-lg group-hover:bg-[#4C51BF] transition-all duration-200">
                      <svg class="w-6 h-6 text-[#4C51BF] group-hover:text-white transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 class="font-semibold text-[#1A202C] mb-1">A Photographer</h3>
                      <p class="text-sm text-[#718096]">I create visual content and offer my services</p>
                    </div>
                  </div>
                </button>

                <button
                  @click="selectRole('creator')"
                  type="button"
                  class="w-full p-5 border-2 border-[#E2E8F0] rounded-lg hover:border-[#4C51BF] hover:bg-[#EBF4FF] transition-all duration-200 text-left group"
                >
                  <div class="flex items-start gap-4">
                    <div class="p-3 bg-[#EBF4FF] rounded-lg group-hover:bg-[#4C51BF] transition-all duration-200">
                      <svg class="w-6 h-6 text-[#4C51BF] group-hover:text-white transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
                      </svg>
                    </div>
                    <div>
                      <h3 class="font-semibold text-[#1A202C] mb-1">A Content Creator / Designer</h3>
                      <p class="text-sm text-[#718096]">I design and create digital content</p>
                    </div>
                  </div>
                </button>

                <button
                  @click="selectRole('client')"
                  type="button"
                  class="w-full p-5 border-2 border-[#E2E8F0] rounded-lg hover:border-[#4C51BF] hover:bg-[#EBF4FF] transition-all duration-200 text-left group"
                >
                  <div class="flex items-start gap-4">
                    <div class="p-3 bg-[#EBF4FF] rounded-lg group-hover:bg-[#4C51BF] transition-all duration-200">
                      <svg class="w-6 h-6 text-[#4C51BF] group-hover:text-white transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 class="font-semibold text-[#1A202C] mb-1">Looking for Creators</h3>
                      <p class="text-sm text-[#718096]">I want to hire photographers or designers</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Step 6: Final Confirmation -->
            <div v-if="currentStep === 6" class="animate-slide-in-right">
              <div class="text-center mb-8">
                <div class="w-16 h-16 bg-[#4C51BF] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <h2 class="text-2xl font-bold text-[#1A202C] mb-2 font-['Poppins',sans-serif]">You're all set!</h2>
                <p class="text-sm text-[#718096]">Ready to join MyArteLab</p>
              </div>
              <div v-if="errors.general" class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p class="text-sm text-red-800 text-center">{{ errors.general }}</p>
              </div>
              <button
                @click="handleSignup"
                :disabled="loading"
                aria-label="Create account and continue to dashboard"
                :class="[
                  'w-full py-4 px-5 text-white font-semibold rounded-lg transition-all duration-200',
                  loading
                    ? 'bg-[#4C51BF] opacity-60 cursor-not-allowed'
                    : 'bg-[#4C51BF] hover:bg-[#667EEA] hover:scale-105 active:scale-100'
                ]"
              >
                {{ loading ? 'Creating your account...' : 'Continue to Dashboard' }}
              </button>
            </div>
          </div>

          <!-- Sign in link -->
          <p class="text-xs text-[#4A5568] text-center transition-all duration-200">
            Already have an account? <router-link to="/login" class="text-[#4C51BF] hover:text-[#667EEA] hover:underline font-medium transition-all duration-200">Sign in</router-link>
          </p>

          <!-- Terms -->
          <p class="text-xs text-[#718096] text-center leading-relaxed">
            By continuing, you agree to our
            <a href="#" class="text-[#4C51BF] hover:text-[#667EEA] transition-all duration-200">Terms of Service</a>
            and
            <a href="#" class="text-[#4C51BF] hover:text-[#667EEA] transition-all duration-200">Privacy Policy</a>
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
            Connect with Africa's best creatives
          </h2>
          <p class="text-white/90 text-xl leading-relaxed drop-shadow-md">
            Join thousands of photographers and designers building amazing projects together.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

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
const showSuccessMessage = ref(false)
const showEmailForm = ref(false)
const currentStep = ref(0)
const slideDirection = ref('forward')

// Nigerian States
const nigerianStates = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT - Abuja',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara'
]

const roleLabel = computed(() => {
  return formData.value.role === 'creator' ? 'a Creator' : 'a Client'
})

onMounted(() => {
  const role = route.query.role
  if (role === 'creator' || role === 'client') {
    formData.value.role = role
  }
})

const handleGoogleSignup = () => {
  window.location.href = 'http://localhost:5000/api/auth/google'
}

const totalSteps = computed(() => 6)

const nextStep = () => {
  if (currentStep.value < totalSteps.value) {
    slideDirection.value = 'forward'
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    slideDirection.value = 'backward'
    currentStep.value--
  }
}

const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!formData.value.email) {
    errors.value.email = ''
    return false
  }
  if (!emailRegex.test(formData.value.email)) {
    errors.value.email = 'Please enter a valid email'
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

const handleStepContinue = () => {
  if (currentStep.value === 1 && !validateEmail()) return
  if (currentStep.value === 2 && !validatePassword()) return
  if (currentStep.value === 3 && !formData.value.name) return
  if (currentStep.value === 4 && !formData.value.location) return

  nextStep()
}

const selectRole = (role) => {
  formData.value.role = role
  nextStep()
}

const handleSignup = async () => {
  errors.value = { email: '', password: '', general: '' }

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
    showSuccessMessage.value = true
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    errors.value.general = error.response?.data?.message || 'Signup failed. Please try again.'
  } finally {
    loading.value = false
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

@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slide-in-left {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.5s ease-out;
}

.animate-slide-in-right {
  animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.animate-slide-in-left {
  animation: slide-in-left 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
