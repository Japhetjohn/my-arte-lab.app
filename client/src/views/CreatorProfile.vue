<template>
  <AppLayout>
    <div class="w-full min-h-screen bg-neutral-50">
      <div class="max-w-7xl mx-auto px-8 py-8">
        <!-- Top Bar with Back Button and Actions -->
        <div class="flex items-center justify-between mb-8">
          <!-- Back Button -->
          <button
            @click="router.back()"
            class="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-all"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span class="text-sm font-medium">Back to Discover</span>
          </button>

          <!-- Right Actions -->
          <div class="flex items-center gap-3">
            <!-- Edit Button -->
            <Button
              v-if="isOwner"
              variant="secondary"
              @click="showEditModal = true"
            >
              <template #iconLeft>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </template>
              Edit Profile
            </Button>

            <!-- Add Button -->
            <Button
              v-if="isOwner"
              variant="primary"
              @click="showAddModal = true"
            >
              <template #iconLeft>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
              </template>
              Add Portfolio
            </Button>
          </div>
        </div>

        <!-- Profile Header Card -->
        <Card variant="elevated" padding="lg" class="mb-8">
          <div class="flex gap-8">
            <!-- Featured Work/Portfolio Image -->
            <div class="w-[320px] h-[400px] rounded-lg overflow-hidden relative group cursor-pointer shadow-soft">
              <img
                v-if="creatorData.featuredWork"
                :src="creatorData.featuredWork"
                alt="Featured Work"
                class="w-full h-full object-cover"
              />
              <div v-else class="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span class="text-white text-[80px] font-bold">{{ creatorData.name?.charAt(0).toUpperCase() }}</span>
              </div>

              <!-- Work Title Overlay -->
              <div class="absolute bottom-4 left-4 right-4">
                <div class="bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2">
                  <p class="text-white text-lg font-bold">
                    {{ creatorData.workTitle || 'Featured Work' }}
                  </p>
                </div>
              </div>
            </div>

            <!-- Profile Info -->
            <div class="flex-1">
              <!-- Location Badge -->
              <div class="mb-4">
                <Badge variant="primary" size="md">
                  {{ creatorData.location || 'LAGOS' }}
                </Badge>
              </div>

              <!-- Name -->
              <h1 class="text-h1-lg font-bold text-neutral-900 mb-2">
                {{ creatorData.name || 'Ebuka' }}
              </h1>

              <!-- Role/Category -->
              <p class="text-neutral-600 text-xl mb-6">
                {{ creatorData.category || 'Creative' }}
              </p>

              <!-- Bio -->
              <p class="text-neutral-700 text-body leading-relaxed mb-6">
                {{ creatorData.bio || 'Passionate creator specializing in bringing visions to life through art and design.' }}
              </p>

              <!-- Stats -->
              <div class="flex gap-8 mb-8">
                <div>
                  <p class="text-neutral-500 text-sm mb-1">Rating</p>
                  <div class="flex items-center gap-1">
                    <svg
                      v-for="star in 5"
                      :key="star"
                      class="w-5 h-5 text-[#FFD700]"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                </div>

                <div>
                  <p class="text-neutral-500 text-sm mb-1">Projects</p>
                  <p class="text-neutral-900 text-xl font-semibold">{{ creatorData.projectCount || 47 }}</p>
                </div>

                <div>
                  <p class="text-neutral-500 text-sm mb-1">Availability</p>
                  <Badge
                    :variant="creatorData.available ? 'success' : 'warning'"
                    size="sm"
                  >
                    {{ creatorData.available ? 'AVAILABLE' : 'BOOKED' }}
                  </Badge>
                </div>
              </div>

              <!-- Action Buttons -->
              <div v-if="!isOwner" class="flex gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  @click="bookCreator"
                >
                  Book Now
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                >
                  Message
                </Button>
              </div>
            </div>
          </div>
        </Card>

      <!-- Tabs Section -->
      <div class="mt-12">
        <!-- Tab Navigation -->
        <div class="flex items-center gap-6 border-b border-[#333333] mb-8">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'pb-4 text-[16px] font-medium transition-all relative',
              activeTab === tab.id
                ? 'text-primary'
                : 'text-neutral-400 hover:text-white'
            ]"
          >
            {{ tab.label }}
            <span
              v-if="activeTab === tab.id"
              class="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
            ></span>
          </button>
        </div>

        <!-- Tab Content -->
        <div class="min-h-[400px]">
          <!-- Portfolio Tab -->
          <div v-if="activeTab === 'portfolio'" class="grid grid-cols-3 gap-6">
            <Card
              v-for="item in portfolioItems"
              :key="item.id"
              variant="elevated"
              hoverable
              clickable
              padding="none"
              @click="viewPortfolioItem(item)"
            >
              <img
                :src="item.image"
                :alt="item.title"
                class="w-full h-64 object-cover"
              />
              <div class="p-4">
                <h3 class="text-white text-[16px] font-semibold mb-2">{{ item.title }}</h3>
                <p class="text-neutral-400 text-[14px]">{{ item.category }}</p>
              </div>
            </Card>
            <EmptyState
              v-if="portfolioItems.length === 0"
              icon="image"
              title="No portfolio items"
              description="Start showcasing your work by adding portfolio items"
              size="sm"
              class="col-span-3"
            />
          </div>

          <!-- Reviews Tab -->
          <div v-else-if="activeTab === 'reviews'" class="space-y-4">
            <Card
              v-for="review in reviews"
              :key="review.id"
              variant="bordered"
              padding="lg"
            >
              <div class="flex items-start gap-4">
                <Avatar
                  :initials="review.clientName.charAt(0)"
                  size="md"
                  shape="circle"
                />
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-2">
                    <h4 class="text-white font-semibold">{{ review.clientName }}</h4>
                    <span class="text-neutral-400 text-sm">{{ review.date }}</span>
                  </div>
                  <div class="flex items-center gap-1 mb-3">
                    <svg
                      v-for="star in 5"
                      :key="star"
                      :class="star <= review.rating ? 'text-[#FFD700]' : 'text-neutral-600'"
                      class="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <p class="text-neutral-300 text-[15px]">{{ review.comment }}</p>
                </div>
              </div>
            </Card>
            <EmptyState
              v-if="reviews.length === 0"
              icon="star"
              title="No reviews yet"
              description="Reviews from clients will appear here"
              size="sm"
            />
          </div>

          <!-- About Tab -->
          <div v-else-if="activeTab === 'about'">
            <Card variant="bordered" padding="lg">
              <div class="space-y-6">
                <div>
                  <h3 class="text-white text-[18px] font-semibold mb-3">About Me</h3>
                  <p class="text-neutral-300 text-[15px] leading-relaxed">
                    {{ creatorData.bio }}
                  </p>
                </div>
                <div>
                  <h3 class="text-white text-[18px] font-semibold mb-3">Skills</h3>
                  <div class="flex flex-wrap gap-2">
                    <Badge
                      v-for="skill in creatorData.skills"
                      :key="skill"
                      variant="secondary"
                    >
                      {{ skill }}
                    </Badge>
                  </div>
                </div>
                <div>
                  <h3 class="text-white text-[18px] font-semibold mb-3">Contact Information</h3>
                  <div class="space-y-2">
                    <div class="flex items-center gap-3 text-neutral-300">
                      <svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{{ creatorData.email || 'contact@example.com' }}</span>
                    </div>
                    <div class="flex items-center gap-3 text-neutral-300">
                      <svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{{ creatorData.location }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Item Modal -->
    <div
      v-if="showAddModal"
      class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
      @click.self="showAddModal = false"
    >
      <div class="bg-[#1a1a1a] rounded-[14px] p-8 max-w-[500px] w-full border border-[#333333] max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-[24px] font-semibold text-white">Add item</h3>
          <button @click="showAddModal = false" class="text-[#666666] hover:text-white transition-all">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Form Fields -->
        <div class="space-y-4">
          <Input
            v-model="addForm.title"
            label="Title"
            placeholder="Portfolio item title"
            required
          />

          <Select
            v-model="addForm.category"
            label="Category"
            placeholder="Select category"
            :options="categoryOptions"
            required
          />

          <div>
            <label class="text-white text-[14px] mb-2 block">Image</label>
            <div class="w-full h-[48px] px-4 bg-[#0a0a0a] border border-[#333333] rounded-[12px] flex items-center text-[#666666] text-[14px] cursor-pointer hover:border-[#9747FF] transition-all">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Choose an image...
            </div>
          </div>

          <Textarea
            v-model="addForm.description"
            label="Description"
            placeholder="Brief description of this work..."
            :rows="3"
            :max-length="500"
          />
        </div>

        <!-- Buttons -->
        <div class="flex gap-3 mt-8">
          <Button
            variant="primary"
            size="lg"
            full-width
            @click="handleSubmit"
          >
            Submit
          </Button>
          <Button
            variant="secondary"
            size="lg"
            full-width
            @click="showAddModal = false"
          >
            Cancel
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
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import Button from '../components/design-system/Button.vue'
import Input from '../components/design-system/Input.vue'
import Select from '../components/design-system/Select.vue'
import Textarea from '../components/design-system/Textarea.vue'
import Badge from '../components/design-system/Badge.vue'
import Card from '../components/design-system/Card.vue'
import Avatar from '../components/design-system/Avatar.vue'
import EmptyState from '../components/design-system/EmptyState.vue'
import AuthModal from '../components/AuthModal.vue'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const route = useRoute()
const { isAuthenticated, initAuth } = useAuth()

// State
const searchQuery = ref('')
const showAddModal = ref(false)
const showEditModal = ref(false)
const showAuthModal = ref(false)
const isOwner = ref(true) // TODO: Check if logged-in user owns this profile
const activeTab = ref('portfolio')

const tabs = [
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'about', label: 'About' }
]

const addForm = ref({
  title: '',
  category: '',
  description: ''
})

const categoryOptions = [
  { label: 'Photography', value: 'Photography' },
  { label: 'Videography', value: 'Videography' },
  { label: 'Design', value: 'Design' },
  { label: 'Art', value: 'Art' }
]

// Mock creator data
const creatorData = ref({
  name: 'Ebuka',
  category: 'Creative',
  location: 'LAGOS',
  workTitle: 'MEET COLU',
  bio: 'Passionate creator specializing in bringing visions to life through art and design. With over 5 years of experience in the industry.',
  rating: 5,
  reviews: 47,
  projectCount: 47,
  available: true,
  featuredWork: null,
  email: 'ebuka@myartelab.com',
  skills: ['Photography', 'Videography', 'Creative Direction', 'Photo Editing']
})

// Portfolio items
const portfolioItems = ref([
  {
    id: 1,
    title: 'Wedding Photography',
    category: 'Photography',
    image: '/screenshot.png'
  },
  {
    id: 2,
    title: 'Brand Shoot',
    category: 'Photography',
    image: '/screenshot.png'
  },
  {
    id: 3,
    title: 'Event Coverage',
    category: 'Videography',
    image: '/screenshot.png'
  }
])

// Reviews
const reviews = ref([
  {
    id: 1,
    clientName: 'Sarah Johnson',
    rating: 5,
    date: '2 weeks ago',
    comment: 'Absolutely amazing work! Ebuka captured our wedding day perfectly. His attention to detail and creativity exceeded our expectations.'
  },
  {
    id: 2,
    clientName: 'Michael Chen',
    rating: 5,
    date: '1 month ago',
    comment: 'Professional, punctual, and talented. The photos from our brand shoot turned out stunning. Highly recommend!'
  }
])

// Methods
const bookCreator = () => {
  if (!isAuthenticated.value) {
    showAuthModal.value = true
  } else {
    // Navigate to booking page with creator pre-selected
    router.push(`/book?creator=${creator.value.id}`)
  }
}

const handleAuthenticated = (userData) => {
  console.log('User authenticated:', userData)
  // Navigate to booking page with creator pre-selected after authentication
  router.push(`/book?creator=${creator.value.id}`)
}

const handleSubmit = () => {
  console.log('Form submitted:', addForm.value)
  showAddModal.value = false
  // TODO: Save form data
}

const viewPortfolioItem = (item) => {
  console.log('Viewing portfolio item:', item)
  // TODO: Open portfolio item modal or navigate to detail page
}

// Lifecycle
onMounted(() => {
  initAuth()
})
</script>
