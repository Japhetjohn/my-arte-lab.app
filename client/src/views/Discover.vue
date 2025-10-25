<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="container mx-auto px-6 py-4 flex justify-between items-center">
        <router-link to="/" class="text-2xl font-bold text-indigo-600">MyArteLab</router-link>
        <div class="space-x-4">
          <router-link to="/login">
            <BaseButton variant="outline">Log In</BaseButton>
          </router-link>
          <router-link to="/signup">
            <BaseButton variant="primary">Sign Up</BaseButton>
          </router-link>
        </div>
      </div>
    </header>

    <div class="container mx-auto px-6 py-12">
      <div class="text-center mb-12">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Discover Verified Creatives</h1>
        <p class="text-xl text-gray-600">Browse portfolios of talented African photographers and designers</p>
      </div>

      <!-- Filters -->
      <div class="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div class="grid md:grid-cols-4 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              v-model="filters.search"
              type="text"
              placeholder="Search by name..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              v-model="filters.category"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Categories</option>
              <option value="photography">Photography</option>
              <option value="design">Design</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              v-model="filters.location"
              type="text"
              placeholder="City, Country..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Min Rating</label>
            <select
              v-model="filters.minRating"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Any Rating</option>
              <option value="4">4+ Stars</option>
              <option value="4.5">4.5+ Stars</option>
              <option value="5">5 Stars</option>
            </select>
          </div>
        </div>
        <div class="mt-4">
          <BaseButton @click="applyFilters" variant="primary">Apply Filters</BaseButton>
          <BaseButton @click="resetFilters" variant="secondary" class="ml-2">Reset</BaseButton>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <p class="mt-4 text-gray-600">Loading creators...</p>
      </div>

      <!-- Creators Grid -->
      <div v-else-if="creators.length > 0" class="grid md:grid-cols-3 gap-6">
        <BaseCard
          v-for="creator in creators"
          :key="creator._id"
          hoverable
          class="cursor-pointer"
          @click="viewCreator(creator._id)"
        >
          <div class="p-6">
            <div class="flex items-center mb-4">
              <div class="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {{ creator.profile.name?.charAt(0).toUpperCase() }}
              </div>
              <div class="ml-4 flex-1">
                <h3 class="text-lg font-semibold text-gray-900">{{ creator.profile.name }}</h3>
                <p class="text-sm text-gray-600">{{ creator.profile.location }}</p>
              </div>
            </div>

            <div class="flex items-center mb-3">
              <div class="flex text-yellow-400">
                <svg v-for="i in 5" :key="i" class="w-4 h-4" :class="i <= Math.round(creator.rating) ? 'fill-current' : 'fill-gray-300'" viewBox="0 0 20 20">
                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                </svg>
              </div>
              <span class="ml-2 text-sm text-gray-600">{{ creator.rating.toFixed(1) }} ({{ creator.totalReviews }} reviews)</span>
            </div>

            <p class="text-sm text-gray-700 mb-4 line-clamp-2">{{ creator.profile.bio || 'No bio available' }}</p>

            <div class="flex items-center justify-between">
              <span class="inline-block bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                {{ creator.profile.category }}
              </span>
              <span v-if="creator.verified" class="flex items-center text-green-600 text-xs">
                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                Verified
              </span>
            </div>
          </div>
        </BaseCard>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-12">
        <p class="text-gray-600 text-lg">No creators found matching your criteria.</p>
        <BaseButton @click="resetFilters" variant="primary" class="mt-4">Clear Filters</BaseButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api/axios'
import BaseCard from '../components/BaseCard.vue'
import BaseButton from '../components/BaseButton.vue'

const router = useRouter()

const creators = ref([])
const loading = ref(false)

const filters = ref({
  search: '',
  category: '',
  location: '',
  minRating: ''
})

const fetchCreators = async () => {
  loading.value = true
  try {
    const params = {}
    if (filters.value.search) params.search = filters.value.search
    if (filters.value.category) params.category = filters.value.category
    if (filters.value.location) params.location = filters.value.location
    if (filters.value.minRating) params.minRating = filters.value.minRating

    const response = await api.get('/users/creators', { params })
    creators.value = response.data
  } catch (error) {
    console.error('Error fetching creators:', error)
  } finally {
    loading.value = false
  }
}

const applyFilters = () => {
  fetchCreators()
}

const resetFilters = () => {
  filters.value = {
    search: '',
    category: '',
    location: '',
    minRating: ''
  }
  fetchCreators()
}

const viewCreator = (creatorId) => {
  router.push(`/creator/${creatorId}`)
}

onMounted(() => {
  fetchCreators()
})
</script>
