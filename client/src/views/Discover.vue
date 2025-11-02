<template>
  <AppLayout>
    <div class="w-full px-8 py-8">
      <!-- Top Bar with Location and Search -->
      <div class="flex items-center justify-between mb-8">
        <!-- Location Toggle -->
        <div class="flex items-center gap-2 text-[#999999] cursor-pointer hover:text-white transition-all">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="text-[14px]">{{ currentLocation }}</span>
          <label class="relative inline-block w-12 h-6">
            <input type="checkbox" v-model="locationEnabled" class="opacity-0 w-0 h-0">
            <span class="absolute cursor-pointer inset-0 bg-[#333333] rounded-full transition-all"
                  :class="locationEnabled ? 'bg-[#9747FF]' : ''">
              <span class="absolute h-4 w-4 left-1 bottom-1 bg-white rounded-full transition-all"
                    :class="locationEnabled ? 'translate-x-6' : ''"></span>
            </span>
          </label>
        </div>

        <!-- Search Bar -->
        <div class="w-[320px]">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search"
              class="w-full h-[44px] px-4 pl-10 bg-[#1a1a1a] border border-[#333333] rounded-[12px] text-white text-[14px] placeholder-[#666666] focus:outline-none focus:border-[#9747FF] transition-all"
            />
            <svg class="w-5 h-5 text-[#666666] absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Discover Heading -->
      <h1 class="text-[48px] font-bold text-white mb-12">Discover</h1>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="animate-spin rounded-full h-12 w-12 border-[3px] border-[#333333] border-t-[#9747FF]"></div>
      </div>

      <!-- Creator Cards Grid -->
      <div v-else-if="filteredCreators.length > 0" class="grid grid-cols-4 gap-8 mb-16">
        <div
          v-for="creator in filteredCreators"
          :key="creator._id"
          class="flex flex-col items-center cursor-pointer group"
          @click="viewProfile(creator._id)"
        >
          <!-- Circular Profile Photo -->
          <div class="w-[200px] h-[200px] rounded-full overflow-hidden mb-4 group-hover:ring-4 group-hover:ring-[#9747FF] transition-all">
            <img
              v-if="creator.photo"
              :src="creator.photo"
              :alt="creator.name"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full bg-gradient-to-br from-[#9747FF] to-[#D946EF] flex items-center justify-center text-white text-[64px] font-semibold">
              {{ creator.name.charAt(0).toUpperCase() }}
            </div>
          </div>

          <!-- Star Rating -->
          <div class="flex items-center gap-1 mb-2">
            <svg
              v-for="star in 5"
              :key="star"
              class="w-4 h-4 text-[#FFD700]"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>

          <!-- Status Badge -->
          <div class="mb-2">
            <span
              :class="[
                'text-[12px] font-bold uppercase tracking-wider',
                creator.available ? 'text-[#9747FF]' : 'text-[#9747FF]'
              ]"
            >
              {{ creator.available ? 'AVAILABLE' : 'BOOKED' }}
            </span>
          </div>

          <!-- Location -->
          <p class="text-white text-[14px]">{{ creator.location }}</p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="flex flex-col items-center justify-center py-16">
        <div class="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p class="text-[15px] text-[#999999] mb-4">No creators found matching your criteria</p>
        <button
          @click="clearSearch"
          class="h-[44px] px-6 bg-gradient-to-r from-[#9747FF] to-[#D946EF] rounded-[12px] text-white text-[15px] font-semibold hover:opacity-90 transition-all"
        >
          Clear Search
        </button>
      </div>

      <!-- Floating Book Now Button -->
      <div class="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
        <button
          @click="router.push('/book')"
          class="flex items-center gap-2 bg-gradient-to-r from-[#9747FF] to-[#D946EF] text-white px-8 py-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span class="font-semibold">Book Now</span>
        </button>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'

const router = useRouter()

// State
const loading = ref(true)
const creators = ref([])
const searchQuery = ref('')
const locationEnabled = ref(true)
const currentLocation = ref('Ikeja,Lagos')

// Mock data matching Glide screenshots
const mockCreators = [
  {
    _id: '1',
    name: 'Ikeja',
    category: 'Photographer',
    rating: 5,
    reviews: 47,
    location: 'Ikeja, Lagos',
    available: true,
    photo: null
  },
  {
    _id: '2',
    name: 'Yaba',
    category: 'Photographer',
    rating: 5,
    reviews: 32,
    location: 'Yaba, Lagos',
    available: false,
    photo: null
  },
  {
    _id: '3',
    name: 'Ota',
    category: 'Photographer',
    rating: 5,
    reviews: 28,
    location: 'Ota',
    available: true,
    photo: null
  },
  {
    _id: '4',
    name: 'Gbagada',
    category: 'Designer',
    rating: 5,
    reviews: 56,
    location: 'Gbagada',
    available: true,
    photo: null
  },
  {
    _id: '5',
    name: 'Calabar',
    category: 'Videographer',
    rating: 5,
    reviews: 41,
    location: 'Calabar',
    available: false,
    photo: null
  },
  {
    _id: '6',
    name: 'Abuja',
    category: 'Photographer',
    rating: 5,
    reviews: 63,
    location: 'Abuja',
    available: false,
    photo: null
  },
  {
    _id: '7',
    name: 'Jos',
    category: 'Designer',
    rating: 5,
    reviews: 19,
    location: 'Jos',
    available: true,
    photo: null
  },
  {
    _id: '8',
    name: 'Bariga',
    category: 'Videographer',
    rating: 5,
    reviews: 38,
    location: 'Bariga',
    available: false,
    photo: null
  }
]

// Computed
const filteredCreators = computed(() => {
  let result = creators.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(creator =>
      creator.name.toLowerCase().includes(query) ||
      creator.category.toLowerCase().includes(query) ||
      creator.location.toLowerCase().includes(query)
    )
  }

  return result
})

// Methods
const fetchCreators = async () => {
  loading.value = true
  try {
    // Using mock data for now
    setTimeout(() => {
      creators.value = mockCreators
      loading.value = false
    }, 600)
  } catch (error) {
    console.error('Error fetching creators:', error)
    loading.value = false
  }
}

const clearSearch = () => {
  searchQuery.value = ''
}

const viewProfile = (creatorId) => {
  router.push(`/creator/${creatorId}`)
}

// Lifecycle
onMounted(() => {
  fetchCreators()
})
</script>
