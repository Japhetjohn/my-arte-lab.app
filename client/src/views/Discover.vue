<template>
  <AppLayout>
    <div class="w-full max-w-7xl mx-auto px-6 py-8">
      <!-- Header Section -->
      <div class="mb-8">
        <h1 class="text-h1-lg font-bold text-neutral-900 mb-2">Discover creators</h1>
        <p class="text-body text-neutral-600">Find the perfect creative for your next project</p>
      </div>

      <!-- Search and Filters Bar -->
      <div class="bg-white rounded-md shadow-soft p-6 mb-8">
        <!-- Search Bar -->
        <div class="mb-4">
          <Input
            v-model="searchQuery"
            type="text"
            placeholder="Search by service, city, style, e.g. wedding photographer Lagos"
          >
            <template #iconLeft>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </template>
          </Input>
        </div>

        <!-- Filters Row -->
        <div class="flex items-center gap-3 flex-wrap">
          <div class="flex items-center gap-2 text-neutral-600">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span class="text-caption-lg font-medium">Filters:</span>
          </div>

          <Select
            v-model="selectedCategory"
            placeholder="Category"
            :options="categoryOptions"
            class="w-48"
          />
          <Select
            v-model="selectedAvailability"
            placeholder="Availability"
            :options="availabilityOptions"
            class="w-48"
          />

          <!-- Location Toggle -->
          <div class="flex items-center gap-2 ml-auto">
            <svg class="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span class="text-caption-lg text-neutral-600">{{ currentLocation }}</span>
            <label class="relative inline-block w-11 h-6 cursor-pointer">
              <input type="checkbox" v-model="locationEnabled" class="sr-only">
              <span class="absolute inset-0 bg-neutral-300 rounded-full transition-all"
                    :class="locationEnabled ? 'bg-primary' : ''">
                <span class="absolute h-5 w-5 left-0.5 top-0.5 bg-white rounded-full transition-all shadow-sm"
                      :class="locationEnabled ? 'translate-x-5' : ''"></span>
              </span>
            </label>
          </div>

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
            Clear all
          </Button>
        </div>
      </div>

      <!-- Results Count -->
      <div class="flex items-center justify-between mb-6">
        <p class="text-body text-neutral-600">
          <span class="font-semibold text-neutral-900">{{ filteredCreators.length }}</span>
          {{ filteredCreators.length === 1 ? 'creator' : 'creators' }} found
        </p>
        <Select
          v-model="sortBy"
          placeholder="Sort by"
          :options="sortOptions"
          class="w-48"
        />
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <Loading variant="spinner" size="lg" text="Loading creators..." />
      </div>

      <!-- Creator Cards Grid -->
      <div v-else-if="filteredCreators.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
        <Card
          v-for="creator in filteredCreators"
          :key="creator._id"
          variant="elevated"
          padding="md"
          hoverable
          clickable
          @click="viewProfile(creator._id)"
          class="transition-all duration-200"
        >
          <!-- Profile Photo -->
          <div class="flex flex-col items-center mb-4">
            <Avatar
              :src="creator.photo"
              :alt="creator.name"
              :initials="creator.name.charAt(0).toUpperCase()"
              size="2xl"
              shape="circle"
              :status="creator.available ? 'online' : 'busy'"
              class="mb-3"
            />

            <h3 class="text-base font-semibold text-neutral-900 mb-1">{{ creator.name }}</h3>
            <p class="text-caption text-neutral-600 mb-2">{{ creator.category }}</p>
          </div>

          <!-- Rating and Reviews -->
          <div class="flex items-center justify-center gap-1 mb-3">
            <svg class="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span class="text-caption font-medium text-neutral-900">{{ creator.rating }}</span>
            <span class="text-caption text-neutral-500">({{ creator.reviews }})</span>
          </div>

          <!-- Status Badge -->
          <div class="flex justify-center mb-3">
            <Badge
              :variant="creator.available ? 'success' : 'warning'"
              size="sm"
            >
              {{ creator.available ? 'Available' : 'Booked' }}
            </Badge>
          </div>

          <!-- Location -->
          <div class="flex items-center justify-center gap-1 text-caption text-neutral-600">
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{{ creator.location }}</span>
          </div>
        </Card>
      </div>

      <!-- Empty State -->
      <div v-else class="py-16">
        <div class="text-center max-w-md mx-auto">
          <div class="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 class="text-h3 font-semibold text-neutral-900 mb-2">No creators found</h3>
          <p class="text-body text-neutral-600 mb-6">
            No creators match your search criteria. Try adjusting your filters.
          </p>
          <Button variant="secondary" @click="clearFilters">
            Clear filters
          </Button>
        </div>
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
import Card from '../components/design-system/Card.vue'
import Input from '../components/design-system/Input.vue'
import Select from '../components/design-system/Select.vue'
import Badge from '../components/design-system/Badge.vue'
import Avatar from '../components/design-system/Avatar.vue'
import Loading from '../components/design-system/Loading.vue'
import AuthModal from '../components/AuthModal.vue'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { isAuthenticated, initAuth } = useAuth()

// State
const loading = ref(true)
const creators = ref([])
const searchQuery = ref('')
const locationEnabled = ref(true)
const currentLocation = ref('Lagos, Nigeria')
const selectedCategory = ref('')
const selectedAvailability = ref('')
const sortBy = ref('')
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

const sortOptions = [
  { label: 'Relevance', value: 'relevance' },
  { label: 'Highest rated', value: 'rating' },
  { label: 'Most reviews', value: 'reviews' },
  { label: 'Newest', value: 'newest' }
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

const clearFilters = () => {
  searchQuery.value = ''
  selectedCategory.value = ''
  selectedAvailability.value = ''
}

const viewProfile = (creatorId) => {
  router.push(`/creator/${creatorId}`)
}

const handleAuthenticated = (userData) => {
  console.log('User authenticated:', userData)
}

// Lifecycle
onMounted(() => {
  initAuth()
  fetchCreators()
})
</script>
