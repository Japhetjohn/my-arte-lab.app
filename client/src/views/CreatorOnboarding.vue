<template>
  <div class="min-h-screen bg-gray-50 py-12">
    <div class="container mx-auto px-6 max-w-3xl">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-900 mb-2">Complete Your Creator Profile</h1>
        <p class="text-gray-600">Let's set up your profile to start receiving bookings</p>
      </div>

      <!-- Progress Steps -->
      <div class="mb-8">
        <div class="flex items-center justify-center space-x-4">
          <div v-for="(stepItem, index) in steps" :key="index" class="flex items-center">
            <div
              :class="[
                'w-10 h-10 rounded-full flex items-center justify-center font-semibold',
                currentStep > index ? 'bg-green-500 text-white' :
                currentStep === index ? 'bg-indigo-600 text-white' :
                'bg-gray-300 text-gray-600'
              ]"
            >
              {{ index + 1 }}
            </div>
            <div v-if="index < steps.length - 1" class="w-12 h-1 bg-gray-300 mx-2"></div>
          </div>
        </div>
        <div class="text-center mt-4 text-sm text-gray-600">
          Step {{ currentStep + 1 }} of {{ steps.length }}: {{ steps[currentStep] }}
        </div>
      </div>

      <BaseCard>
        <div class="p-8">
          <!-- Step 1: Basic Info -->
          <form v-if="currentStep === 0" @submit.prevent="nextStep">
            <h2 class="text-2xl font-bold mb-6">Basic Information</h2>
            <div class="space-y-4">
              <BaseInput
                id="category"
                label="Category"
                disabled
                :model-value="formData.profile.category"
              />

              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Bio / About Me <span class="text-red-500">*</span>
                </label>
                <textarea
                  v-model="formData.profile.bio"
                  rows="4"
                  class="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Tell clients about your work, experience, and style..."
                  required
                ></textarea>
                <p class="mt-1 text-sm text-gray-500">{{ formData.profile.bio?.length || 0 }}/500 characters</p>
              </div>

              <div v-if="errors.general" class="text-red-600 text-sm">{{ errors.general }}</div>
            </div>

            <div class="mt-6 flex justify-end">
              <BaseButton type="submit" variant="primary">Next</BaseButton>
            </div>
          </form>

          <!-- Step 2: Portfolio -->
          <div v-if="currentStep === 1">
            <h2 class="text-2xl font-bold mb-6">Portfolio</h2>
            <p class="text-gray-600 mb-4">Add your best work (you can add more later)</p>

            <div class="space-y-4 mb-6">
              <div v-for="(item, index) in formData.profile.portfolio" :key="index" class="flex gap-4 items-start border-b pb-4">
                <div class="flex-1">
                  <BaseInput
                    :id="`portfolio-url-${index}`"
                    label="Image URL"
                    v-model="item.url"
                    placeholder="https://example.com/image.jpg"
                  />
                  <BaseInput
                    :id="`portfolio-desc-${index}`"
                    label="Description"
                    v-model="item.description"
                    placeholder="Description of this work"
                    class="mt-2"
                  />
                </div>
                <BaseButton
                  v-if="formData.profile.portfolio.length > 1"
                  @click="removePortfolioItem(index)"
                  variant="danger"
                  size="sm"
                  class="mt-6"
                >
                  Remove
                </BaseButton>
              </div>
            </div>

            <BaseButton @click="addPortfolioItem" variant="outline" class="mb-6">
              + Add Another Portfolio Item
            </BaseButton>

            <div class="mt-6 flex justify-between">
              <BaseButton @click="prevStep" variant="secondary">Back</BaseButton>
              <BaseButton @click="nextStep" variant="primary">Next</BaseButton>
            </div>
          </div>

          <!-- Step 3: Rates/Packages -->
          <div v-if="currentStep === 2">
            <h2 class="text-2xl font-bold mb-6">Rates & Packages</h2>
            <p class="text-gray-600 mb-4">Set your pricing (you can add more packages later)</p>

            <div class="space-y-4 mb-6">
              <div v-for="(rate, index) in formData.profile.rates" :key="index" class="flex gap-4 items-start border-b pb-4">
                <div class="flex-1 space-y-2">
                  <BaseInput
                    :id="`rate-name-${index}`"
                    label="Package Name"
                    v-model="rate.name"
                    placeholder="e.g., Portrait Session"
                  />
                  <BaseInput
                    :id="`rate-price-${index}`"
                    label="Price (USD)"
                    type="number"
                    v-model.number="rate.price"
                    placeholder="100"
                  />
                </div>
                <BaseButton
                  v-if="formData.profile.rates.length > 1"
                  @click="removeRate(index)"
                  variant="danger"
                  size="sm"
                  class="mt-6"
                >
                  Remove
                </BaseButton>
              </div>
            </div>

            <BaseButton @click="addRate" variant="outline" class="mb-6">
              + Add Another Package
            </BaseButton>

            <div v-if="errors.general" class="text-red-600 text-sm mb-4">{{ errors.general }}</div>

            <div class="mt-6 flex justify-between">
              <BaseButton @click="prevStep" variant="secondary">Back</BaseButton>
              <BaseButton @click="completeOnboarding" variant="primary" :loading="loading">
                Complete Setup
              </BaseButton>
            </div>
          </div>
        </div>
      </BaseCard>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api/axios'
import BaseCard from '../components/BaseCard.vue'
import BaseInput from '../components/BaseInput.vue'
import BaseButton from '../components/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()

const steps = ['Basic Info', 'Portfolio', 'Rates & Packages']
const currentStep = ref(0)
const loading = ref(false)

const formData = ref({
  profile: {
    category: '',
    bio: '',
    portfolio: [{ url: '', description: '' }],
    rates: [{ name: '', price: 0 }]
  }
})

const errors = ref({
  general: ''
})

onMounted(() => {
  if (authStore.user) {
    formData.value.profile.category = authStore.user.profile.category || 'photography'
  }
})

const nextStep = () => {
  if (currentStep.value === 0 && !formData.value.profile.bio) {
    errors.value.general = 'Please add a bio'
    return
  }
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
    errors.value.general = ''
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
    errors.value.general = ''
  }
}

const addPortfolioItem = () => {
  formData.value.profile.portfolio.push({ url: '', description: '' })
}

const removePortfolioItem = (index) => {
  formData.value.profile.portfolio.splice(index, 1)
}

const addRate = () => {
  formData.value.profile.rates.push({ name: '', price: 0 })
}

const removeRate = (index) => {
  formData.value.profile.rates.splice(index, 1)
}

const completeOnboarding = async () => {
  // Validate
  if (!formData.value.profile.bio) {
    errors.value.general = 'Please add a bio'
    return
  }

  // Filter out empty portfolio items
  formData.value.profile.portfolio = formData.value.profile.portfolio.filter(
    item => item.url && item.url.trim() !== ''
  )

  // Filter out empty rates
  formData.value.profile.rates = formData.value.profile.rates.filter(
    rate => rate.name && rate.price > 0
  )

  if (formData.value.profile.rates.length === 0) {
    errors.value.general = 'Please add at least one package with a price'
    return
  }

  loading.value = true

  try {
    await api.put('/users/profile', formData.value)
    await authStore.fetchUser()
    router.push('/creator/dashboard')
  } catch (error) {
    errors.value.general = error.response?.data?.message || 'Failed to update profile'
  } finally {
    loading.value = false
  }
}
</script>
