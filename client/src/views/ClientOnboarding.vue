<template>
  <div class="min-h-screen bg-white font-['Inter',sans-serif]">
    <!-- Logo -->
    <div class="absolute top-4 left-4 sm:top-8 sm:left-8 z-10">
      <img src="/logo.PNG" alt="MyArteLab" class="h-8 sm:h-12 w-auto" />
    </div>

    <!-- Main Content -->
    <div class="w-full pt-20 sm:pt-24 pb-12 px-4 sm:px-8">
      <div class="max-w-[600px] mx-auto">

        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-[28px] font-semibold text-[#111111] mb-2">
            Complete Your Profile
          </h1>
          <p class="text-[15px] text-[#6B6B6B]">
            Set up your profile to start hiring talented creators
          </p>
        </div>

        <div class="h-6"></div>

        <!-- Progress Steps -->
        <div class="mb-8">
          <div class="flex items-center justify-center gap-2">
            <div
              v-for="step in totalSteps"
              :key="step"
              class="h-2 rounded-full transition-all"
              :class="step <= currentStep ? 'w-12 bg-[#9747FF]' : 'w-8 bg-[#E8E8E8]'"
            ></div>
          </div>
          <p class="text-center text-[13px] text-[#6B6B6B] mt-3">
            Step {{ currentStep }} of {{ totalSteps }}
          </p>
        </div>

        <div class="h-6"></div>

        <!-- Form Card -->
        <div class="bg-white border-[1.5px] border-[#E8E8E8] rounded-[14px] p-6 sm:p-8">

          <!-- Step 1: Business Name & Location -->
          <div v-if="currentStep === 1">
            <h2 class="text-[20px] font-semibold text-[#111111] mb-6">Basic Information</h2>

            <!-- Business Name -->
            <div class="mb-6">
              <label class="block text-[14px] font-medium text-[#111111] mb-2">
                Business Name
              </label>
              <input
                v-model="formData.businessName"
                type="text"
                placeholder="Enter your business name"
                class="w-full h-[56px] px-5 border-[1.5px] border-[#E8E8E8] rounded-[12px] bg-transparent placeholder-[#ACACAC] text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200"
              />
            </div>

            <div class="h-4"></div>

            <!-- Location -->
            <div class="mb-6">
              <label class="block text-[14px] font-medium text-[#111111] mb-2">
                Location
              </label>
              <input
                v-model="formData.location"
                type="text"
                placeholder="e.g., Lagos, Nigeria"
                class="w-full h-[56px] px-5 border-[1.5px] border-[#E8E8E8] rounded-[12px] bg-transparent placeholder-[#ACACAC] text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200"
              />
            </div>
          </div>

          <!-- Step 2: About Your Brand -->
          <div v-if="currentStep === 2">
            <h2 class="text-[20px] font-semibold text-[#111111] mb-6">About Your Brand</h2>
            <p class="text-[14px] text-[#6B6B6B] mb-6">Tell creators about your business (optional)</p>

            <!-- Brand Description -->
            <div class="mb-6">
              <label class="block text-[14px] font-medium text-[#111111] mb-2">
                Brand Description
              </label>
              <textarea
                v-model="formData.brandDescription"
                rows="5"
                placeholder="Describe your business, what you do, and what kind of creative work you typically need..."
                class="w-full px-5 py-4 border-[1.5px] border-[#E8E8E8] rounded-[12px] bg-transparent placeholder-[#ACACAC] text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200 resize-none"
              ></textarea>
            </div>

            <div class="h-4"></div>

            <!-- Industry -->
            <div class="mb-6">
              <label class="block text-[14px] font-medium text-[#111111] mb-2">
                Industry
              </label>
              <select
                v-model="formData.industry"
                class="w-full h-[56px] px-5 border-[1.5px] border-[#E8E8E8] rounded-[12px] bg-transparent text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200"
              >
                <option value="">Select industry</option>
                <option value="Technology">Technology</option>
                <option value="Fashion">Fashion</option>
                <option value="Food & Beverage">Food & Beverage</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Education">Education</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div class="h-8"></div>

          <!-- Navigation Buttons -->
          <div class="flex gap-3">
            <button
              v-if="currentStep > 1"
              @click="prevStep"
              class="flex-1 h-[56px] border-[1.5px] border-[#E8E8E8] rounded-[12px] text-[#6B6B6B] text-[15px] font-semibold hover:border-[#9747FF] hover:text-[#9747FF] transition-all flex items-center justify-center"
            >
              Back
            </button>
            <button
              v-if="currentStep < totalSteps"
              @click="nextStep"
              class="flex-1 h-[56px] bg-[#9747FF] rounded-[12px] text-white text-[15px] font-semibold hover:bg-[#8637EF] transition-all flex items-center justify-center"
            >
              Continue
            </button>
            <button
              v-if="currentStep === totalSteps"
              @click="completeOnboarding"
              :disabled="loading"
              class="flex-1 h-[56px] bg-[#9747FF] rounded-[12px] text-white text-[15px] font-semibold hover:bg-[#8637EF] transition-all flex items-center justify-center disabled:opacity-50"
            >
              {{ loading ? 'Saving...' : 'Complete Profile' }}
            </button>
          </div>

          <!-- Skip Option -->
          <div class="text-center mt-4">
            <button
              @click="skipOnboarding"
              class="text-[14px] text-[#ACACAC] hover:text-[#9747FF] transition-all"
            >
              Skip for now
            </button>
          </div>

        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// State
const currentStep = ref(1)
const totalSteps = 2
const loading = ref(false)

const formData = ref({
  businessName: '',
  location: '',
  brandDescription: '',
  industry: ''
})

// Methods
const nextStep = () => {
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const completeOnboarding = () => {
  loading.value = true

  // Simulate API call
  setTimeout(() => {
    loading.value = false
    router.push('/discover')
  }, 1000)
}

const skipOnboarding = () => {
  router.push('/discover')
}
</script>

<style scoped>
/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #F5F5F5;
}

::-webkit-scrollbar-thumb {
  background: #E8E8E8;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #9747FF;
}
</style>
