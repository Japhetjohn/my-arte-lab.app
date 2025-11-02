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
          <Input
            v-model="searchQuery"
            type="text"
            placeholder="Search creators, locations..."
          >
            <template #iconLeft>
              <svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </template>
          </Input>
        </div>
      </div>

      <!-- Discover Heading -->
      <h1 class="text-[48px] font-bold text-white mb-6">Discover</h1>

      <!-- Filters Section -->
      <div class="flex items-center gap-4 mb-12">
        <Select
          v-model="selectedCategory"
          placeholder="All Categories"
          :options="categoryOptions"
          class="w-[200px]"
        />
        <Select
          v-model="selectedAvailability"
          placeholder="All Availability"
          :options="availabilityOptions"
          class="w-[200px]"
        />
        <Button
          v-if="hasActiveFilters"
          variant="ghost"
          size="sm"
          @click="clearFilters"
        >
          <template #iconLeft>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </template>
          Clear Filters
        </Button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <Loading variant="spinner" size="lg" text="Loading creators..." />
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
          <Avatar
            :src="creator.photo"
            :alt="creator.name"
            :initials="creator.name.charAt(0).toUpperCase()"
            size="2xl"
            shape="circle"
            :status="creator.available ? 'online' : 'busy'"
            class="mb-4 group-hover:ring-4 group-hover:ring-primary transition-all"
          />

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
            <Badge
              :variant="creator.available ? 'success' : 'warning'"
              size="sm"
            >
              {{ creator.available ? 'AVAILABLE' : 'BOOKED' }}
            </Badge>
          </div>

          <!-- Location -->
          <p class="text-white text-[14px]">{{ creator.location }}</p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="flex justify-center py-16">
        <EmptyState
          icon="search"
          title="No creators found"
          description="No creators match your search criteria. Try adjusting your filters."
          primary-action="Clear Search"
          @primary-action="clearSearch"
        />
      </div>

      <!-- Floating Book Now Button -->
      <div class="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-40">
        <Button
          variant="primary"
          size="lg"
          @click="handleBookNow"
          class="shadow-lg hover:shadow-xl hover:scale-105 transition-all rounded-full"
        >
          <template #iconLeft>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </template>
          Book Now
        </Button>
      </div>
    </div>

    <!-- Authentication Modal -->
    <AuthModal
      v-model="showAuthModal"
      default-mode="signup"
      @authenticated="handleAuthenticated"
    />
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import Button from '../components/design-system/Button.vue'
import Input from '../components/design-system/Input.vue'
import Select from '../components/design-system/Select.vue'
import Badge from '../components/design-system/Badge.vue'
import Avatar from '../components/design-system/Avatar.vue'
import Loading from '../components/design-system/Loading.vue'
import EmptyState from '../components/design-system/EmptyState.vue'
import AuthModal from '../components/AuthModal.vue'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { isAuthenticated, initAuth } = useAuth()

// State
const loading = ref(true)
const creators = ref([])
const searchQuery = ref('')
const locationEnabled = ref(true)
const currentLocation = ref('Ikeja,Lagos')
const selectedCategory = ref('')
const selectedAvailability = ref('')
const showAuthModal = ref(false)

// Filter options
const categoryOptions = [
  { label: 'Photographer', value: 'Photographer' },
  { label: 'Videographer', value: 'Videographer' },
  { label: 'Designer', value: 'Designer' }
]

const availabilityOptions = [
  { label: 'Available', value: 'available' },
  { label: 'Booked', value: 'booked' }
]

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

  // Category filter
  if (selectedCategory.value) {
    result = result.filter(creator => creator.category === selectedCategory.value)
  }

  // Availability filter
  if (selectedAvailability.value) {
    const isAvailable = selectedAvailability.value === 'available'
    result = result.filter(creator => creator.available === isAvailable)
  }

  return result
})

const hasActiveFilters = computed(() => {
  return selectedCategory.value || selectedAvailability.value || searchQuery.value
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

const clearFilters = () => {
  searchQuery.value = ''
  selectedCategory.value = ''
  selectedAvailability.value = ''
}

const viewProfile = (creatorId) => {
  router.push(`/creator/${creatorId}`)
}

const handleBookNow = () => {
  if (!isAuthenticated.value) {
    showAuthModal.value = true
  } else {
    router.push('/book')
  }
}

const handleAuthenticated = (userData) => {
  console.log('User authenticated:', userData)
  // Navigate to booking page after successful authentication
  router.push('/book')
}

// Lifecycle
onMounted(() => {
  initAuth()
  fetchCreators()
})
</script>
