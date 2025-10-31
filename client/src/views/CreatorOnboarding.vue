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
            Set up your creator profile to start receiving bookings
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

          <!-- Step 1: Category & Bio -->
          <div v-if="currentStep === 1">
            <h2 class="text-[20px] font-semibold text-[#111111] mb-6">Basic Information</h2>

            <!-- Category -->
            <div class="mb-6">
              <label class="block text-[14px] font-medium text-[#111111] mb-2">
                Category
              </label>
              <select
                v-model="formData.category"
                class="w-full h-[56px] px-5 border-[1.5px] border-[#E8E8E8] rounded-[12px] bg-transparent text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200"
              >
                <option value="">Select category</option>
                <option value="Photographer">Photographer</option>
                <option value="Videographer">Videographer</option>
                <option value="Designer">Designer</option>
              </select>
            </div>

            <div class="h-4"></div>

            <!-- Bio -->
            <div class="mb-6">
              <label class="block text-[14px] font-medium text-[#111111] mb-2">
                Short Bio
              </label>
              <textarea
                v-model="formData.bio"
                rows="4"
                placeholder="Tell us about yourself and your experience..."
                class="w-full px-5 py-4 border-[1.5px] border-[#E8E8E8] rounded-[12px] bg-transparent placeholder-[#ACACAC] text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200 resize-none"
              ></textarea>
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

          <!-- Step 2: Profile Photo -->
          <div v-if="currentStep === 2">
            <h2 class="text-[20px] font-semibold text-[#111111] mb-6">Profile Photo</h2>

            <div class="flex flex-col items-center mb-6">
              <!-- Profile Photo Preview -->
              <div class="w-32 h-32 rounded-full bg-gradient-to-br from-[#9747FF] to-[#C86FFF] flex items-center justify-center text-white text-[48px] font-semibold mb-4">
                {{ formData.name?.charAt(0).toUpperCase() || 'U' }}
              </div>

              <!-- Upload Button -->
              <label class="cursor-pointer">
                <input type="file" accept="image/*" class="hidden" @change="handlePhotoUpload" />
                <div class="h-[44px] px-6 border-[1.5px] border-[#9747FF] rounded-[12px] text-[#9747FF] text-[15px] font-semibold hover:bg-[#9747FF] hover:text-white transition-all flex items-center justify-center gap-2">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Upload Photo
                </div>
              </label>
              <p class="text-[13px] text-[#ACACAC] mt-2">JPG, PNG or GIF (max 5MB)</p>
            </div>
          </div>

          <!-- Step 3: Portfolio -->
          <div v-if="currentStep === 3">
            <h2 class="text-[20px] font-semibold text-[#111111] mb-6">Sample Works</h2>
            <p class="text-[14px] text-[#6B6B6B] mb-6">Upload 3-5 photos showcasing your best work</p>

            <!-- Portfolio Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <div
                v-for="(item, index) in portfolioItems"
                :key="index"
                class="aspect-square bg-gradient-to-br from-[#F5F5F5] to-[#E8E8E8] rounded-[12px] border-[1.5px] border-[#E8E8E8] hover:border-[#9747FF] transition-all cursor-pointer flex items-center justify-center relative group"
              >
                <svg class="w-12 h-12 text-[#ACACAC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <button
                  v-if="item"
                  @click="removePortfolioItem(index)"
                  class="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            </div>

            <!-- Upload Button -->
            <label class="cursor-pointer">
              <input type="file" accept="image/*" multiple class="hidden" @change="handlePortfolioUpload" />
              <div class="w-full h-[56px] border-[1.5px] border-[#9747FF] rounded-[12px] text-[#9747FF] text-[15px] font-semibold hover:bg-[#9747FF] hover:text-white transition-all flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Photos
              </div>
            </label>
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
const totalSteps = 3
const loading = ref(false)

const formData = ref({
  name: 'User',
  category: '',
  bio: '',
  location: '',
  profilePhoto: null,
  portfolio: []
})

const portfolioItems = ref(Array(6).fill(null))

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

const handlePhotoUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    formData.value.profilePhoto = file
    // TODO: Upload to server and show preview
  }
}

const handlePortfolioUpload = (event) => {
  const files = Array.from(event.target.files)
  files.forEach((file, index) => {
    const emptyIndex = portfolioItems.value.findIndex(item => item === null)
    if (emptyIndex !== -1) {
      portfolioItems.value[emptyIndex] = file
      formData.value.portfolio.push(file)
    }
  })
  // TODO: Upload to server
}

const removePortfolioItem = (index) => {
  portfolioItems.value[index] = null
  formData.value.portfolio = formData.value.portfolio.filter((_, i) => i !== index)
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
