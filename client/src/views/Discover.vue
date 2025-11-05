<template>
  <AppLayout>
    <div class="w-full min-h-screen bg-neutral-50">
      <div class="max-w-7xl mx-auto px-8 py-8">
        <!-- Top Bar with Search -->
        <div class="flex items-center justify-between mb-8">
          <!-- Discover Heading -->
          <div>
            <h1 class="text-h1 font-bold text-neutral-900 mb-2">Discover Creators</h1>
            <p class="text-neutral-600">Find talented creative professionals for your project</p>
          </div>

          <!-- Search Bar -->
          <div class="w-[400px]">
            <Input
              v-model="searchQuery"
              type="text"
              placeholder="Search by service, city, style..."
            >
              <template #iconLeft>
                <svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </template>
            </Input>
          </div>
        </div>

        <!-- Filters Section -->
        <div class="flex items-center gap-4 mb-8">
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
        <div v-else-if="filteredCreators.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card
            v-for="creator in filteredCreators"
            :key="creator._id"
            variant="elevated"
            padding="lg"
            hoverable
            clickable
            @click="viewProfile(creator._id)"
            class="group"
          >
            <div class="text-center">
              <!-- Circular Profile Photo -->
              <div class="mb-4 relative inline-block">
                <div class="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-soft">
                  {{ creator.name.charAt(0).toUpperCase() }}
                </div>
                <div :class="[
                  'absolute bottom-0 right-0 w-6 h-6 rounded-full border-4 border-white',
                  creator.available ? 'bg-success' : 'bg-warning'
                ]"></div>
              </div>

              <!-- Creator Name -->
              <h3 class="text-lg font-semibold text-neutral-900 mb-1">{{ creator.name }}</h3>
              <p class="text-sm text-neutral-600 mb-3">{{ creator.category }}</p>

              <!-- Star Rating -->
              <div class="flex items-center justify-center gap-1 mb-3">
                <svg
                  v-for="star in 5"
                  :key="star"
                  class="w-4 h-4 text-[#FFD700]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span class="text-sm text-neutral-600 ml-1">({{ creator.reviews }})</span>
              </div>

              <!-- Status Badge -->
              <div class="mb-3">
                <Badge
                  :variant="creator.available ? 'success' : 'warning'"
                  size="sm"
                >
                  {{ creator.available ? 'AVAILABLE' : 'BOOKED' }}
                </Badge>
              </div>

              <!-- Location -->
              <div class="flex items-center justify-center gap-1 text-neutral-600 text-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {{ creator.location }}
              </div>
            </div>
          </Card>
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
