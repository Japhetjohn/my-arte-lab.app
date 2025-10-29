<template>
  <div class="min-h-screen flex overflow-hidden font-['Inter',sans-serif] bg-white">
    <!-- Questionnaire Section -->
    <div class="w-full flex items-center justify-center p-4 sm:p-8 relative">
      <!-- Logo in top left -->
      <div class="absolute top-4 left-4 sm:top-8 sm:left-8">
        <img src="/logo.PNG" alt="MyArteLab" class="h-8 sm:h-12 w-auto" />
      </div>

      <!-- Questionnaire Card -->
      <div class="w-full max-w-[420px] mt-16 sm:mt-0">
        <div class="bg-white rounded-[20px] px-6 sm:px-8 py-10 sm:py-12 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">

          <!-- Progress Indicator -->
          <div class="flex items-center justify-center gap-3 mb-12">
            <div
              class="h-2 w-2 rounded-full transition-all duration-300"
              :class="currentStep === 1 ? 'bg-[#9747FF] w-12' : 'bg-[#E8E8E8]'"
            ></div>
            <div
              class="h-2 w-2 rounded-full transition-all duration-300"
              :class="currentStep === 2 ? 'bg-[#9747FF] w-12' : 'bg-[#E8E8E8]'"
            ></div>
            <div
              class="h-2 w-2 rounded-full transition-all duration-300"
              :class="currentStep === 3 ? 'bg-[#9747FF] w-12' : 'bg-[#E8E8E8]'"
            ></div>
          </div>

          <!-- Question Container -->
          <div class="relative overflow-hidden" style="min-height: 500px;">
            <!-- Step 1: Role -->
            <transition name="slide" @before-leave="disablePointer = true" @after-enter="disablePointer = false">
              <div v-if="currentStep === 1" class="absolute inset-0" :class="{ 'pointer-events-none': disablePointer }">
                <h2 class="text-2xl font-semibold text-[#111111] mb-3">Are you looking for...</h2>
                <p class="text-sm text-[#6B6B6B] mb-12">Select what best describes you</p>

                <!-- Options Box -->
                <div class="bg-[#F9F9F9] rounded-[16px] p-6 space-y-6">
                  <button
                    v-for="(option, index) in roleOptions"
                    :key="option.value"
                    @click="selectRole(option.value)"
                    class="w-full h-[58px] px-6 border-[1.5px] rounded-[14px] bg-white text-[#111111] text-[15px] font-medium flex items-center justify-between transition-all duration-200 hover:border-[#9747FF] hover:bg-[#9747FF]/5"
                    :class="[selectedRole === option.value ? 'border-[#9747FF] bg-[#9747FF]/10' : 'border-[#E8E8E8]', 'animate-slide-in-option']"
                    :style="{ 'animation-delay': `${index * 70}ms` }"
                  >
                    <span>{{ option.label }}</span>
                    <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                         :class="selectedRole === option.value ? 'border-[#9747FF] bg-[#9747FF]' : 'border-[#E8E8E8]'">
                      <div v-if="selectedRole === option.value" class="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </button>
                </div>

                <div class="h-10"></div>

                <button @click="goToStep2" :disabled="!selectedRole"
                  class="w-full h-[56px] bg-gradient-to-r from-[#9747FF] to-[#C86FFF] text-white font-semibold text-base rounded-[14px] shadow-[0_10px_28px_rgba(151,71,255,0.34)] hover:shadow-[0_14px_34px_rgba(151,71,255,0.40)] hover:-translate-y-1 active:scale-[0.985] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                  Continue
                </button>
              </div>
            </transition>

            <!-- Step 2: Source -->
            <transition name="slide" @before-leave="disablePointer = true" @after-enter="disablePointer = false">
              <div v-if="currentStep === 2" class="absolute inset-0" :class="{ 'pointer-events-none': disablePointer }">
                <h2 class="text-2xl font-semibold text-[#111111] mb-3">Where did you hear about us?</h2>
                <p class="text-sm text-[#6B6B6B] mb-12">Help us improve our outreach</p>

                <div class="bg-[#F9F9F9] rounded-[16px] p-6 space-y-6">
                  <button
                    v-for="(option, index) in sourceOptions"
                    :key="option.value"
                    @click="selectSource(option.value)"
                    class="w-full h-[58px] px-6 border-[1.5px] rounded-[14px] bg-white text-[#111111] text-[15px] font-medium flex items-center justify-between transition-all duration-200 hover:border-[#9747FF] hover:bg-[#9747FF]/5"
                    :class="[selectedSource === option.value ? 'border-[#9747FF] bg-[#9747FF]/10' : 'border-[#E8E8E8]', 'animate-slide-in-option']"
                    :style="{ 'animation-delay': `${index * 70}ms` }"
                  >
                    <span>{{ option.label }}</span>
                    <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                         :class="selectedSource === option.value ? 'border-[#9747FF] bg-[#9747FF]' : 'border-[#E8E8E8]'">
                      <div v-if="selectedSource === option.value" class="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </button>

                  <transition name="fade">
                    <div v-if="selectedSource === 'other'" class="mt-6">
                      <input v-model="otherSourceText" type="text" placeholder="Please specify..."
                        class="w-full h-[56px] px-6 border-[1.5px] border-[#E8E8E8] rounded-[14px] bg-white placeholder-[#ACACAC] text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200" />
                    </div>
                  </transition>
                </div>

                <div class="h-10"></div>

                <div class="space-y-4">
                  <button @click="goToStep3" :disabled="!selectedSource || (selectedSource === 'other' && !otherSourceText)"
                    class="w-full h-[56px] bg-gradient-to-r from-[#9747FF] to-[#C86FFF] text-white font-semibold text-base rounded-[14px] shadow-[0_10px_28px_rgba(151,71,255,0.34)] hover:shadow-[0_14px_34px_rgba(151,71,255,0.40)] hover:-translate-y-1 active:scale-[0.985] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                    Continue
                  </button>
                  <button @click="goBackToStep1" class="w-full text-[14px] text-[#6B6B6B] hover:text-[#9747FF] font-medium transition-colors duration-200">
                    Back
                  </button>
                </div>
              </div>
            </transition>

            <!-- Step 3: State -->
            <transition name="slide" @before-leave="disablePointer = true" @after-enter="disablePointer = false">
              <div v-if="currentStep === 3" class="absolute inset-0" :class="{ 'pointer-events-none': disablePointer }">
                <h2 class="text-2xl font-semibold text-[#111111] mb-3">Where are you from?</h2>
                <p class="text-sm text-[#6B6B6B] mb-10">Select your state in Nigeria</p>

                <!-- Search Box -->
                <div class="relative mb-6">
                  <svg class="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9E9E9E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input v-model="stateSearch" type="text" placeholder="Search your state..."
                    class="w-full h-[56px] pl-14 pr-6 border-[1.5px] border-[#E8E8E8] rounded-[14px] bg-white placeholder-[#ACACAC] text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200" />
                </div>

                <!-- State List -->
                <div class="bg-[#F9F9F9] rounded-[16px] p-6 space-y-6 max-h-[340px] overflow-y-auto">
                  <button
                    v-for="(state, index) in filteredStates"
                    :key="state"
                    @click="selectState(state)"
                    class="w-full h-[58px] px-6 border-[1.5px] rounded-[14px] bg-white text-[#111111] text-[15px] font-medium flex items-center justify-between transition-all duration-200 hover:border-[#9747FF] hover:bg-[#9747FF]/5"
                    :class="[selectedState === state ? 'border-[#9747FF] bg-[#9747FF]/10' : 'border-[#E8E8E8]', 'animate-slide-in-option']"
                    :style="{ 'animation-delay': `${index * 40}ms` }"
                  >
                    <span>{{ state }}</span>
                    <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                         :class="selectedState === state ? 'border-[#9747FF] bg-[#9747FF]' : 'border-[#E8E8E8]'">
                      <div v-if="selectedState === state" class="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  </button>
                </div>

                <div class="h-10"></div>

                <div class="space-y-4">
                  <button @click="submitQuestionnaire" :disabled="!selectedState"
                    class="w-full h-[56px] bg-gradient-to-r from-[#9747FF] to-[#C86FFF] text-white font-semibold text-base rounded-[14px] shadow-[0_10px_28px_rgba(151,71,255,0.34)] hover:shadow-[0_14px_34px_rgba(151,71,255,0.40)] hover:-translate-y-1 active:scale-[0.985] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                    <span v-if="!loading">Complete Setup</span>
                    <span v-else class="flex items-center justify-center gap-2">
                      <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </span>
                  </button>
                  <button @click="goBackToStep2" class="w-full text-[14px] text-[#6B6B6B] hover:text-[#9747FF] font-medium transition-colors duration-200">
                    Back
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// State
const currentStep = ref(1)
const selectedRole = ref('')
const selectedSource = ref('')
const otherSourceText = ref('')
const selectedState = ref('')
const stateSearch = ref('')
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

const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
]

// Computed
const filteredStates = computed(() => {
  if (!stateSearch.value) return nigerianStates
  return nigerianStates.filter(state =>
    state.toLowerCase().includes(stateSearch.value.toLowerCase())
  )
})

// Methods
const selectRole = (role) => { selectedRole.value = role }
const selectSource = (source) => {
  selectedSource.value = source
  if (source !== 'other') otherSourceText.value = ''
}
const selectState = (state) => { selectedState.value = state }

const goToStep2 = () => { if (selectedRole.value) currentStep.value = 2 }
const goToStep3 = () => {
  if (selectedSource.value && (selectedSource.value !== 'other' || otherSourceText.value)) {
    currentStep.value = 3
  }
}
const goBackToStep1 = () => { currentStep.value = 1 }
const goBackToStep2 = () => { currentStep.value = 2 }

const submitQuestionnaire = async () => {
  if (!selectedState.value) return
  loading.value = true

  try {
    const payload = {
      role: selectedRole.value,
      source: selectedSource.value === 'other' ? otherSourceText.value : selectedSource.value,
      state: selectedState.value
    }

    const response = await fetch('http://localhost:5001/api/users/questionnaire', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(payload)
    })

    if (response.ok) {
      if (authStore.user) {
        authStore.user.role = selectedRole.value
        authStore.user.state = selectedState.value
      }
      if (['creator', 'photographer'].includes(selectedRole.value)) {
        router.push('/creator/onboarding')
      } else if (selectedRole.value === 'client') {
        router.push('/client/onboarding')
      } else {
        router.push('/discover')
      }
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Transitions */
.slide-enter-active, .slide-leave-active { transition: transform 300ms ease, opacity 300ms ease; }
.slide-enter-from { transform: translateX(100%); opacity: 0; }
.slide-leave-to { transform: translateX(-100%); opacity: 0; }
.slide-enter-to, .slide-leave-from { transform: translateX(0); opacity: 1; }

.fade-enter-active, .fade-leave-active { transition: opacity 200ms ease, transform 200ms ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-10px); }

@keyframes slide-in-option {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-slide-in-option { animation: slide-in-option 300ms ease-out both; }

/* Scrollbar */
.max-h-\[340px\]::-webkit-scrollbar { width: 6px; }
.max-h-\[340px\]::-webkit-scrollbar-track { background: transparent; }
.max-h-\[340px\]::-webkit-scrollbar-thumb { background: #D4D4D4; border-radius: 3px; }
.max-h-\[340px\]::-webkit-scrollbar-thumb:hover { background: #B0B0B0; }

/* Focus */
button:focus-visible { outline: 2px solid #9747FF; outline-offset: 2px; }
input:focus { transform: translateY(-1px); }

/* Smooth */
* { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

/* Responsive */
@media (max-width: 640px) {
  .px-6 { padding-left: 1.25rem; padding-right: 1.25rem; }
  .py-10 { padding-top: 2.5rem; padding-bottom: 2.5rem; }
  .space-y-6 > * + * { margin-top: 1.25rem; }
  .h-10 { height: 2rem; }
}
</style>