<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm">
      <div class="container mx-auto px-6 py-4 flex justify-between items-center">
        <router-link to="/" class="text-2xl font-bold text-indigo-600">MyArteLab</router-link>
        <router-link to="/discover">
          <BaseButton variant="outline">← Back to Discover</BaseButton>
        </router-link>
      </div>
    </header>

    <div v-if="loading" class="container mx-auto px-6 py-12 text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>

    <div v-else-if="creator" class="container mx-auto px-6 py-12">
      <!-- Creator Header -->
      <BaseCard class="mb-8">
        <div class="p-8">
          <div class="flex flex-col md:flex-row items-start gap-6">
            <div class="w-32 h-32 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full flex items-center justify-center text-white text-5xl font-bold flex-shrink-0">
              {{ creator.profile.name?.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <h1 class="text-3xl font-bold text-gray-900">{{ creator.profile.name }}</h1>
                <span v-if="creator.verified" class="flex items-center text-green-600">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                </span>
              </div>
              <p class="text-gray-600 mb-3">{{ creator.profile.location }}</p>
              <div class="flex items-center gap-4 mb-4">
                <div class="flex text-yellow-400">
                  <svg v-for="i in 5" :key="i" class="w-5 h-5" :class="i <= Math.round(creator.rating) ? 'fill-current' : 'fill-gray-300'" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                  </svg>
                </div>
                <span class="text-gray-700 font-medium">{{ creator.rating.toFixed(1) }} ({{ creator.totalReviews }} reviews)</span>
                <span class="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">{{ creator.profile.category }}</span>
              </div>
              <p class="text-gray-700">{{ creator.profile.bio }}</p>
            </div>
          </div>
        </div>
      </BaseCard>

      <div class="grid md:grid-cols-3 gap-8">
        <div class="md:col-span-2">
          <BaseCard class="mb-8">
            <template #header>
              <h2 class="text-2xl font-semibold">Portfolio</h2>
            </template>
            <div class="grid md:grid-cols-2 gap-4">
              <div v-for="(item, index) in creator.profile.portfolio" :key="index" class="relative group">
                <img :src="item.url" :alt="item.description" class="w-full h-64 object-cover rounded-lg" @error="handleImageError" />
                <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center p-4">
                  <p class="text-white text-sm text-center">{{ item.description }}</p>
                </div>
              </div>
            </div>
          </BaseCard>

          <BaseCard>
            <template #header>
              <h2 class="text-2xl font-semibold">Reviews</h2>
            </template>
            <div v-if="reviews.length > 0" class="space-y-4">
              <div v-for="review in reviews" :key="review._id" class="border-b pb-4 last:border-b-0">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <p class="font-medium">{{ review.client?.profile?.name || 'Anonymous' }}</p>
                    <p class="text-sm text-gray-500">{{ new Date(review.createdAt).toLocaleDateString() }}</p>
                  </div>
                  <div class="flex text-yellow-400">
                    <svg v-for="i in review.rating" :key="i" class="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                    </svg>
                  </div>
                </div>
                <p class="text-gray-700">{{ review.comment }}</p>
              </div>
            </div>
            <div v-else class="text-center py-8 text-gray-500">No reviews yet</div>
          </BaseCard>
        </div>

        <div>
          <BaseCard class="sticky top-6">
            <template #header>
              <h2 class="text-xl font-semibold">Packages</h2>
            </template>
            <div class="space-y-4 mb-6">
              <div v-for="(rate, index) in creator.profile.rates" :key="index" :class="['p-4 rounded-lg border-2 cursor-pointer transition', selectedPackage?._id === rate._id ? 'border-indigo-600 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300']" @click="selectedPackage = rate">
                <h3 class="font-semibold text-gray-900 mb-1">{{ rate.name }}</h3>
                <p class="text-2xl font-bold text-indigo-600">${{ rate.price }}</p>
              </div>
            </div>

            <div v-if="selectedPackage" class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-2">Project Brief (Optional)</label>
              <textarea v-model="customBrief" rows="3" class="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="Describe your project..."></textarea>
            </div>

            <BaseButton v-if="authStore.isAuthenticated && authStore.isClient" @click="bookNow" variant="primary" fullWidth :disabled="!selectedPackage" :loading="booking">
              Book Now - ${{ selectedPackage?.price || 0 }}
            </BaseButton>
            <router-link v-else to="/signup?role=client">
              <BaseButton variant="primary" fullWidth>Sign Up to Book</BaseButton>
            </router-link>
          </BaseCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api/axios'
import BaseCard from '../components/BaseCard.vue'
import BaseButton from '../components/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const creator = ref(null)
const reviews = ref([])
const loading = ref(false)
const selectedPackage = ref(null)
const customBrief = ref('')
const booking = ref(false)

const fetchCreator = async () => {
  loading.value = true
  try {
    const response = await api.get(`/users/creator/${route.params.id}`)
    creator.value = response.data
    if (creator.value.profile.rates?.length > 0) {
      selectedPackage.value = creator.value.profile.rates[0]
    }
  } catch (error) {
    console.error('Error fetching creator:', error)
  } finally {
    loading.value = false
  }
}

const fetchReviews = async () => {
  try {
    const response = await api.get(`/reviews/creator/${route.params.id}`)
    reviews.value = response.data
  } catch (error) {
    console.error('Error fetching reviews:', error)
  }
}

const bookNow = async () => {
  booking.value = true
  try {
    await api.post('/bookings', {
      creatorId: creator.value._id,
      package: {
        name: selectedPackage.value.name,
        price: selectedPackage.value.price
      },
      customBrief: customBrief.value
    })
    alert('Booking created successfully!')
    router.push('/client/dashboard')
  } catch (error) {
    console.error('Error creating booking:', error)
    alert(error.response?.data?.message || 'Failed to create booking')
  } finally {
    booking.value = false
  }
}

const handleImageError = (event) => {
  event.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found'
}

onMounted(async () => {
  await fetchCreator()
  await fetchReviews()
})
</script>
