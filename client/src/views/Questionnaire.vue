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

          <!-- Progress Indicator -->
          <div class="flex items-center justify-center gap-2 mb-8">
            <div
              class="h-2 w-2 rounded-full transition-all duration-300"
              :class="currentStep === 1 ? 'bg-[#9747FF] w-8' : 'bg-[#E8E8E8]'"
            ></div>
            <div
              class="h-2 w-2 rounded-full transition-all duration-300"
              :class="currentStep === 2 ? 'bg-[#9747FF] w-8' : 'bg-[#E8E8E8]'"
            ></div>
          </div>

          <!-- Question Container with Slide Transitions -->
          <div class="relative" style="min-height: 420px; max-height: 520px; overflow-y: auto;">
            <!-- Step 1: Role Selection -->
            <transition
              name="slide"
              @before-leave="disablePointer = true"
              @after-enter="disablePointer = false"
            >
              <div
                v-if="currentStep === 1"
                class="absolute inset-0"
                :class="{ 'pointer-events-none': disablePointer }"
              >
                <h2 class="text-2xl font-semibold text-[#111111] mb-2 font-['Inter',sans-serif]">
                  What best describes you?
                </h2>
                <p class="text-sm text-[#6B6B6B] mb-8">
                  Select what best describes you
                </p>

                <!-- Role Options -->
                <div>
                  <!-- Client -->
                  <button
                    @click="selectRole('client')"
                    type="button"
                    class="w-full h-[56px] px-5 border-[1.5px] rounded-[12px] bg-transparent text-[#111111] text-[15px] font-medium flex items-center justify-between transition-all duration-200 hover:border-[#9747FF] hover:bg-[#9747FF]/5 animate-slide-in-option"
                    :class="selectedRole === 'client' ? 'border-[#9747FF] bg-[#9747FF]/10' : 'border-[#E8E8E8]'"
                  >
                    <span>Client</span>
                    <svg
                      v-if="selectedRole === 'client'"
                      class="w-5 h-5 text-[#9747FF]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>

                  <!-- Spacer -->
                  <div class="h-6"></div>

                  <!-- Photographer -->
                  <button
                    @click="selectRole('photographer')"
                    type="button"
                    class="w-full h-[56px] px-5 border-[1.5px] rounded-[12px] bg-transparent text-[#111111] text-[15px] font-medium flex items-center justify-between transition-all duration-200 hover:border-[#9747FF] hover:bg-[#9747FF]/5 animate-slide-in-option"
                    :class="selectedRole === 'photographer' ? 'border-[#9747FF] bg-[#9747FF]/10' : 'border-[#E8E8E8]'"
                    style="animation-delay: 50ms"
                  >
                    <span>Photographer</span>
                    <svg
                      v-if="selectedRole === 'photographer'"
                      class="w-5 h-5 text-[#9747FF]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>

                  <!-- Spacer -->
                  <div class="h-6"></div>

                  <!-- Creator -->
                  <button
                    @click="selectRole('creator')"
                    type="button"
                    class="w-full h-[56px] px-5 border-[1.5px] rounded-[12px] bg-transparent text-[#111111] text-[15px] font-medium flex items-center justify-between transition-all duration-200 hover:border-[#9747FF] hover:bg-[#9747FF]/5 animate-slide-in-option"
                    :class="selectedRole === 'creator' ? 'border-[#9747FF] bg-[#9747FF]/10' : 'border-[#E8E8E8]'"
                    style="animation-delay: 100ms"
                  >
                    <span>Creator</span>
                    <svg
                      v-if="selectedRole === 'creator'"
                      class="w-5 h-5 text-[#9747FF]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </div>

                <!-- Spacer -->
                <div class="h-8"></div>

                <!-- Continue Button -->
                <button
                  @click="goToStep2"
                  :disabled="!selectedRole"
                  type="button"
                  class="w-full h-[56px] bg-gradient-to-r from-[#9747FF] to-[#C86FFF] text-white font-semibold text-base rounded-[10px] shadow-[0_10px_28px_rgba(151,71,255,0.34)] hover:shadow-[0_14px_34px_rgba(151,71,255,0.40)] hover:-translate-y-[3px] active:scale-[0.985] active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  Continue
                </button>
              </div>
            </transition>

            <!-- Step 2: Source Selection -->
            <transition
              name="slide"
              @before-leave="disablePointer = true"
              @after-enter="disablePointer = false"
            >
              <div
                v-if="currentStep === 2"
                class="absolute inset-0"
                :class="{ 'pointer-events-none': disablePointer }"
              >
                <h2 class="text-2xl font-semibold text-[#111111] mb-2 font-['Inter',sans-serif]">
                  Where did you hear about us?
                </h2>
                <p class="text-sm text-[#6B6B6B] mb-8">
                  Help us improve our outreach
                </p>

                <!-- Source Options -->
                <div>
                  <!-- Social Media -->
                  <button
                    @click="selectSource('social_media')"
                    type="button"
                    class="w-full h-[56px] px-5 border-[1.5px] rounded-[12px] bg-transparent text-[#111111] text-[15px] font-medium flex items-center justify-between transition-all duration-200 hover:border-[#9747FF] hover:bg-[#9747FF]/5 animate-slide-in-option"
                    :class="selectedSource === 'social_media' ? 'border-[#9747FF] bg-[#9747FF]/10' : 'border-[#E8E8E8]'"
                  >
                    <span>Social Media</span>
                    <svg
                      v-if="selectedSource === 'social_media'"
                      class="w-5 h-5 text-[#9747FF]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>

                  <!-- Spacer -->
                  <div class="h-6"></div>

                  <!-- Friend / Referral -->
                  <button
                    @click="selectSource('friend')"
                    type="button"
                    class="w-full h-[56px] px-5 border-[1.5px] rounded-[12px] bg-transparent text-[#111111] text-[15px] font-medium flex items-center justify-between transition-all duration-200 hover:border-[#9747FF] hover:bg-[#9747FF]/5 animate-slide-in-option"
                    :class="selectedSource === 'friend' ? 'border-[#9747FF] bg-[#9747FF]/10' : 'border-[#E8E8E8]'"
                    style="animation-delay: 50ms"
                  >
                    <span>Friend / Referral</span>
                    <svg
                      v-if="selectedSource === 'friend'"
                      class="w-5 h-5 text-[#9747FF]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>

                  <!-- Spacer -->
                  <div class="h-6"></div>

                  <!-- Search Engine -->
                  <button
                    @click="selectSource('search_engine')"
                    type="button"
                    class="w-full h-[56px] px-5 border-[1.5px] rounded-[12px] bg-transparent text-[#111111] text-[15px] font-medium flex items-center justify-between transition-all duration-200 hover:border-[#9747FF] hover:bg-[#9747FF]/5 animate-slide-in-option"
                    :class="selectedSource === 'search_engine' ? 'border-[#9747FF] bg-[#9747FF]/10' : 'border-[#E8E8E8]'"
                    style="animation-delay: 100ms"
                  >
                    <span>Search Engine</span>
                    <svg
                      v-if="selectedSource === 'search_engine'"
                      class="w-5 h-5 text-[#9747FF]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>

                  <!-- Spacer -->
                  <div class="h-6"></div>

                  <!-- Event / Conference -->
                  <button
                    @click="selectSource('event')"
                    type="button"
                    class="w-full h-[56px] px-5 border-[1.5px] rounded-[12px] bg-transparent text-[#111111] text-[15px] font-medium flex items-center justify-between transition-all duration-200 hover:border-[#9747FF] hover:bg-[#9747FF]/5 animate-slide-in-option"
                    :class="selectedSource === 'event' ? 'border-[#9747FF] bg-[#9747FF]/10' : 'border-[#E8E8E8]'"
                    style="animation-delay: 150ms"
                  >
                    <span>Event / Conference</span>
                    <svg
                      v-if="selectedSource === 'event'"
                      class="w-5 h-5 text-[#9747FF]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>

                  <!-- Spacer -->
                  <div class="h-6"></div>

                  <!-- Other -->
                  <button
                    @click="selectSource('other')"
                    type="button"
                    class="w-full h-[56px] px-5 border-[1.5px] rounded-[12px] bg-transparent text-[#111111] text-[15px] font-medium flex items-center justify-between transition-all duration-200 hover:border-[#9747FF] hover:bg-[#9747FF]/5 animate-slide-in-option"
                    :class="selectedSource === 'other' ? 'border-[#9747FF] bg-[#9747FF]/10' : 'border-[#E8E8E8]'"
                    style="animation-delay: 200ms"
                  >
                    <span>Other (please specify)</span>
                    <svg
                      v-if="selectedSource === 'other'"
                      class="w-5 h-5 text-[#9747FF]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>

                  <!-- Other Input Field (appears when "Other" is selected) -->
                  <transition name="fade">
                    <div v-if="selectedSource === 'other'">
                      <!-- Spacer -->
                      <div class="h-6"></div>

                      <input
                        v-model="otherSourceText"
                        type="text"
                        placeholder="Please specify..."
                        class="w-full h-[56px] px-5 border-[1.5px] border-[#E8E8E8] rounded-[12px] bg-transparent placeholder-[#ACACAC] text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200"
                      />
                    </div>
                  </transition>
                </div>

                <!-- Spacer -->
                <div class="h-8"></div>

                <!-- Action Buttons -->
                <div class="space-y-4">
                  <button
                    @click="submitQuestionnaire"
                    :disabled="!selectedSource || (selectedSource === 'other' && !otherSourceText)"
                    type="button"
                    class="w-full h-[56px] bg-gradient-to-r from-[#9747FF] to-[#C86FFF] text-white font-semibold text-base rounded-[10px] shadow-[0_10px_28px_rgba(151,71,255,0.34)] hover:shadow-[0_14px_34px_rgba(151,71,255,0.40)] hover:-translate-y-[3px] active:scale-[0.985] active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    <span v-if="!loading">Complete Setup</span>
                    <span v-else class="flex items-center justify-center gap-2">
                      <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </span>
                  </button>

                  <button
                    @click="goBackToStep1"
                    type="button"
                    class="w-full text-[13px] text-[#6B6B6B] hover:text-[#9747FF] font-medium transition-colors duration-200"
                  >
                    ← Back
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>

    <!-- Right side - Visual Section -->
    <div class="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-white via-purple-50 to-[#9747FF]">
      <!-- Geometric shapes -->
      <div class="absolute top-20 right-20 w-96 h-96 bg-[#9747FF]/20 rounded-full blur-3xl animate-pulse"></div>
      <div class="absolute bottom-40 left-20 w-80 h-80 bg-white/30 rounded-full blur-2xl"></div>
      <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-[#9747FF]/10 to-transparent rounded-full blur-3xl"></div>

      <!-- Content -->
      <div class="relative z-10 flex flex-col items-center justify-center w-full p-12">
        <div class="max-w-lg text-center">
          <div class="mb-8 flex justify-center">
            <div class="w-40 h-40 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center shadow-[0_0_60px_rgba(151,71,255,0.5)] p-6">
              <img src="/logo.PNG" alt="MyArteLab" class="w-full h-full object-contain" />
            </div>
          </div>
          <h2 class="text-white text-5xl font-bold mb-6 leading-tight drop-shadow-lg">
            Connect with Africa's best creatives
          </h2>
          <p class="text-white/90 text-xl leading-relaxed drop-shadow-md">
            Join a community of photographers and designers building amazing projects together.
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

// State
const currentStep = ref(1)
const selectedRole = ref('')
const selectedSource = ref('')
const otherSourceText = ref('')
const disablePointer = ref(false)
const loading = ref(false)

// Options
const roleOptions = [
  { value: 'client', label: 'Client' },
  { value: 'photographer', label: 'Photographer' },
  { value: 'creator', label: 'Creator' }
]

const sourceOptions = [
  { value: 'social_media', label: 'Social Media' },
  { value: 'friend', label: 'Friend / Referral' },
  { value: 'search_engine', label: 'Search Engine' },
  { value: 'event', label: 'Event / Conference' },
  { value: 'other', label: 'Other (please specify)' }
]

// Methods
const selectRole = (role) => {
  selectedRole.value = role
}

const selectSource = (source) => {
  selectedSource.value = source
  if (source !== 'other') {
    otherSourceText.value = ''
  }
}

const goToStep2 = () => {
  if (selectedRole.value) {
    currentStep.value = 2
  }
}

const goBackToStep1 = () => {
  currentStep.value = 1
}

const submitQuestionnaire = async () => {
  if (!selectedSource.value || (selectedSource.value === 'other' && !otherSourceText.value)) {
    return
  }

  loading.value = true

  try {
    const payload = {
      role: selectedRole.value,
      source: selectedSource.value === 'other' ? otherSourceText.value : selectedSource.value
    }

    // Submit to backend
    const response = await fetch('http://localhost:5000/api/users/questionnaire', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      // Update user role in store
      if (authStore.user) {
        authStore.user.role = selectedRole.value
      }

      // Redirect based on role
      if (selectedRole.value === 'creator' || selectedRole.value === 'photographer') {
        router.push('/creator/onboarding')
      } else if (selectedRole.value === 'client') {
        router.push('/discover')
      } else {
        router.push('/discover')
      }
    } else {
      console.error('Failed to submit questionnaire')
    }
  } catch (error) {
    console.error('Error submitting questionnaire:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Slide transitions */
.slide-enter-active,
.slide-leave-active {
  transition: transform 300ms ease, opacity 300ms ease;
}

.slide-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-enter-to,
.slide-leave-from {
  transform: translateX(0);
  opacity: 1;
}

/* Fade transition for other input */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Fade in animation */
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

/* Staggered option animation */
@keyframes slide-in-option {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-in-option {
  animation: slide-in-option 300ms ease-out both;
}

/* Focus state */
button:focus-visible {
  outline: 2px solid #9747FF;
  outline-offset: 2px;
}

input:focus {
  transform: translateY(-1px);
}
</style>
