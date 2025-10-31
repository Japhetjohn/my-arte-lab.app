<template>
  <AppLayout>
    <div class="w-full pt-12 pb-12 px-8 sm:px-12">
      <div class="max-w-[1200px] mx-auto">
        <!-- Header Section -->
        <div class="text-center mb-8">
        <h1 class="text-[28px] font-semibold text-[#111111] mb-2 font-['Inter',sans-serif]">
          Discover Creators
        </h1>
        <p class="text-[15px] text-[#6B6B6B]">
          Browse verified creators and find the perfect match for your project
        </p>
      </div>

      <div class="h-8"></div>

      <!-- Search Bar -->
      <div class="flex justify-center mb-6">
        <div class="w-full max-w-[640px]">
          <div class="flex gap-3">
            <input
              v-model="searchQuery"
              @input="handleSearch"
              type="text"
              placeholder="Search by name, service type, or location..."
              class="flex-1 h-[56px] px-5 border-[1.5px] border-[#E8E8E8] rounded-[12px] bg-transparent placeholder-[#ACACAC] text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200"
            />
            <button
              @click="handleSearch"
              class="w-[56px] h-[56px] bg-[#9747FF] rounded-[12px] flex items-center justify-center hover:bg-[#8637EF] transition-all"
            >
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="h-8"></div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <div class="animate-spin rounded-full h-12 w-12 border-[3px] border-[#E8E8E8] border-t-[#9747FF]"></div>
      </div>

      <!-- Creator Cards Grid -->
      <div v-else-if="filteredCreators.length > 0" class="flex justify-center px-4 sm:px-8">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
          <div
            v-for="creator in filteredCreators"
            :key="creator._id"
            class="w-full max-w-[340px] bg-white border-[1.5px] border-[#E8E8E8] rounded-[14px] p-6 hover:border-[#9747FF] transition-all cursor-pointer"
            @click="viewProfile(creator._id)"
          >
            <!-- Profile Photo -->
            <div class="flex justify-center mb-4">
              <div class="w-20 h-20 rounded-full bg-gradient-to-br from-[#9747FF] to-[#C86FFF] flex items-center justify-center text-white text-[24px] font-semibold">
                {{ creator.name.charAt(0).toUpperCase() }}
              </div>
            </div>

            <!-- Name -->
            <h3 class="text-[18px] font-semibold text-[#111111] text-center mb-2">
              {{ creator.name }}
            </h3>

            <!-- Category -->
            <div class="flex justify-center mb-3">
              <div class="px-3 py-1 bg-[#F5F5F5] rounded-[6px] text-[12px] text-[#6B6B6B]">
                {{ creator.category }}
              </div>
            </div>

            <!-- Rating -->
            <div class="flex items-center justify-center gap-1 mb-4">
              <svg
                v-for="star in 5"
                :key="star"
                class="w-4 h-4"
                :class="star <= creator.rating ? 'text-[#FFB800]' : 'text-[#E8E8E8]'"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span class="text-[13px] text-[#6B6B6B] ml-1">({{ creator.reviews }})</span>
            </div>

            <!-- View Profile Button -->
            <button class="w-full h-[44px] bg-transparent border-[1.5px] border-[#9747FF] rounded-[12px] text-[#9747FF] text-[15px] font-semibold hover:bg-[#9747FF] hover:text-white transition-all flex items-center justify-center">
              View Profile
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="flex flex-col items-center justify-center py-16">
        <div class="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-[#ACACAC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p class="text-[15px] text-[#6B6B6B] mb-4">No creators found matching your criteria</p>
        <button
          @click="clearSearch"
          class="h-[44px] px-6 border-[1.5px] border-[#9747FF] rounded-[12px] text-[#9747FF] text-[15px] font-semibold hover:bg-[#9747FF] hover:text-white transition-all flex items-center justify-center"
        >
          Clear Search
        </button>
      </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api/axios'
import AppLayout from '../components/AppLayout.vue'

const router = useRouter()

// State
const loading = ref(true)
const creators = ref([])
const searchQuery = ref('')

// Mock data for testing (will be replaced with API call)
const mockCreators = [
  {
    _id: '1',
    name: 'Adebayo Johnson',
    category: 'Photographer',
    rating: 5,
    reviews: 47,
    location: 'Lagos'
  },
  {
    _id: '2',
    name: 'Ama Osei',
    category: 'Designer',
    rating: 5,
    reviews: 32,
    location: 'Accra'
  },
  {
    _id: '3',
    name: 'Kwame Mensah',
    category: 'Photographer',
    rating: 4,
    reviews: 28,
    location: 'Accra'
  },
  {
    _id: '4',
    name: 'Zuri Mwangi',
    category: 'Videographer',
    rating: 5,
    reviews: 56,
    location: 'Nairobi'
  },
  {
    _id: '5',
    name: 'Chioma Nwankwo',
    category: 'Designer',
    rating: 4,
    reviews: 41,
    location: 'Lagos'
  },
  {
    _id: '6',
    name: 'Thabo Dlamini',
    category: 'Photographer',
    rating: 5,
    reviews: 63,
    location: 'Johannesburg'
  },
  {
    _id: '7',
    name: 'Fatima Hassan',
    category: 'Designer',
    rating: 4,
    reviews: 19,
    location: 'Cairo'
  },
  {
    _id: '8',
    name: 'Kofi Asante',
    category: 'Videographer',
    rating: 5,
    reviews: 38,
    location: 'Accra'
  },
  {
    _id: '9',
    name: 'Amara Okeke',
    category: 'Photographer',
    rating: 5,
    reviews: 51,
    location: 'Lagos'
  },
  {
    _id: '10',
    name: 'Lwazi Khumalo',
    category: 'Designer',
    rating: 4,
    reviews: 24,
    location: 'Johannesburg'
  },
  {
    _id: '11',
    name: 'Yara Ibrahim',
    category: 'Photographer',
    rating: 5,
    reviews: 45,
    location: 'Cairo'
  },
  {
    _id: '12',
    name: 'Bisi Adeyemi',
    category: 'Videographer',
    rating: 4,
    reviews: 33,
    location: 'Lagos'
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
    // TODO: Replace with actual API call
    // const response = await api.get('/users/creators')
    // creators.value = response.data

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

const handleSearch = () => {
  // Trigger search filter
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
