<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="container mx-auto px-6 py-4 flex justify-between items-center">
        <router-link to="/" class="text-2xl font-bold text-indigo-600">MyArteLab</router-link>
        <div class="flex items-center space-x-4">
          <router-link to="/discover">
            <BaseButton variant="outline" size="sm">Discover Creatives</BaseButton>
          </router-link>
          <span class="text-gray-700">{{ authStore.user?.profile?.name }}</span>
          <BaseButton @click="logout" variant="outline" size="sm">Logout</BaseButton>
        </div>
      </div>
    </header>

    <div class="container mx-auto px-6 py-8">
      <!-- Welcome Section -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Client Dashboard</h1>
        <p class="text-gray-600 mt-2">Manage your bookings and find new creatives</p>
      </div>

      <!-- Tabs -->
      <div class="mb-6">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              :class="[
                'py-4 px-1 border-b-2 font-medium text-sm',
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              ]"
            >
              {{ tab.label }}
            </button>
          </nav>
        </div>
      </div>

      <!-- Tab Content -->
      <!-- Bookings Tab -->
      <div v-if="activeTab === 'bookings'">
        <BaseCard>
          <template #header>
            <h2 class="text-xl font-semibold">My Bookings</h2>
          </template>

          <div v-if="loading" class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>

          <div v-else-if="bookings.length > 0" class="space-y-4">
            <div
              v-for="booking in bookings"
              :key="booking._id"
              class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-900">{{ booking.package.name }}</h3>
                  <p class="text-sm text-gray-600 mt-1">
                    Creator: {{ booking.creator?.profile?.name || booking.creator?.email }}
                  </p>
                  <p class="text-sm text-gray-500 mt-1">
                    Booked on: {{ new Date(booking.createdAt).toLocaleDateString() }}
                  </p>
                  <p v-if="booking.customBrief" class="text-sm text-gray-700 mt-2">
                    Brief: {{ booking.customBrief }}
                  </p>
                </div>
                <div class="text-right">
                  <div class="text-lg font-bold text-gray-900">${{ booking.package.price }}</div>
                  <span
                    :class="[
                      'inline-block px-2 py-1 text-xs rounded-full mt-2',
                      booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      booking.status === 'delivered' ? 'bg-blue-100 text-blue-800' :
                      booking.status === 'in_progress' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    ]"
                  >
                    {{ booking.status }}
                  </span>
                </div>
              </div>

              <!-- Deliverables -->
              <div v-if="booking.deliverables?.length > 0" class="mt-4 border-t pt-4">
                <h4 class="font-medium text-gray-900 mb-2">Deliverables:</h4>
                <div class="space-y-2">
                  <div v-for="(item, index) in booking.deliverables" :key="index" class="flex items-center text-sm">
                    <svg class="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                    <a :href="item.url" target="_blank" class="text-indigo-600 hover:underline">
                      {{ item.description || 'View deliverable' }}
                    </a>
                  </div>
                </div>
              </div>

              <div class="mt-4 flex gap-2">
                <BaseButton
                  v-if="booking.status === 'delivered'"
                  @click="completeBooking(booking._id)"
                  variant="primary"
                  size="sm"
                >
                  Approve & Release Payment
                </BaseButton>
                <BaseButton
                  v-if="booking.status === 'completed' && !booking.review"
                  @click="openReviewModal(booking)"
                  variant="outline"
                  size="sm"
                >
                  Leave Review
                </BaseButton>
                <router-link
                  v-if="booking.status === 'completed' && booking.review"
                  :to="`/review/${booking.review}`"
                >
                  <BaseButton variant="outline" size="sm">
                    View Review
                  </BaseButton>
                </router-link>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-12 text-gray-500">
            No bookings yet.
            <router-link to="/discover" class="text-indigo-600 hover:underline ml-1">
              Browse creators to make your first booking!
            </router-link>
          </div>
        </BaseCard>
      </div>

      <!-- Payments Tab -->
      <div v-if="activeTab === 'payments'">
        <div class="grid md:grid-cols-3 gap-6 mb-6">
          <BaseCard>
            <div class="text-center py-6">
              <p class="text-gray-600 text-sm">Total Spent</p>
              <p class="text-3xl font-bold text-indigo-600 mt-2">
                ${{ totalSpent.toFixed(2) }}
              </p>
            </div>
          </BaseCard>

          <BaseCard>
            <div class="text-center py-6">
              <p class="text-gray-600 text-sm">Active Bookings</p>
              <p class="text-3xl font-bold text-blue-600 mt-2">
                {{ activeBookings }}
              </p>
            </div>
          </BaseCard>

          <BaseCard>
            <div class="text-center py-6">
              <p class="text-gray-600 text-sm">Completed Projects</p>
              <p class="text-3xl font-bold text-green-600 mt-2">
                {{ completedBookings }}
              </p>
            </div>
          </BaseCard>
        </div>

        <BaseCard>
          <template #header>
            <h2 class="text-xl font-semibold">Payment History</h2>
          </template>

          <div v-if="bookings.length > 0" class="space-y-3">
            <div
              v-for="booking in bookings.filter(b => b.transaction)"
              :key="booking._id"
              class="flex justify-between items-center p-3 bg-gray-50 rounded"
            >
              <div>
                <p class="font-medium text-gray-900">{{ booking.package.name }}</p>
                <p class="text-sm text-gray-600">
                  {{ new Date(booking.createdAt).toLocaleString() }}
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  Status: {{ booking.paymentStatus }}
                </p>
              </div>
              <div class="text-lg font-bold text-gray-900">
                ${{ booking.package.price }}
              </div>
            </div>
          </div>

          <div v-else class="text-center py-12 text-gray-500">
            No payment history yet.
          </div>
        </BaseCard>
      </div>

      <!-- Discover Tab -->
      <div v-if="activeTab === 'discover'">
        <div class="text-center py-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Find Your Next Creative</h2>
          <p class="text-gray-600 mb-6">Browse verified photographers and designers</p>
          <router-link to="/discover">
            <BaseButton variant="primary" size="lg">
              Browse All Creators →
            </BaseButton>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Review Modal -->
    <div
      v-if="showReviewModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="showReviewModal = false"
    >
      <BaseCard class="max-w-md w-full">
        <div class="p-6">
          <h2 class="text-2xl font-bold mb-4">Leave a Review</h2>
          <p class="text-gray-600 mb-4">
            How was your experience with {{ selectedBooking?.creator?.profile?.name }}?
          </p>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Rating</label>
            <div class="flex gap-2">
              <button
                v-for="star in 5"
                :key="star"
                @click="reviewForm.rating = star"
                class="text-3xl focus:outline-none"
              >
                <span :class="star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-300'">★</span>
              </button>
            </div>
          </div>

          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">Comment</label>
            <textarea
              v-model="reviewForm.comment"
              rows="4"
              class="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Share your experience..."
            ></textarea>
          </div>

          <div class="flex gap-2">
            <BaseButton @click="submitReview" variant="primary" fullWidth :loading="submitting">
              Submit Review
            </BaseButton>
            <BaseButton @click="showReviewModal = false" variant="outline" fullWidth>
              Cancel
            </BaseButton>
          </div>
        </div>
      </BaseCard>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import api from '../api/axios'
import BaseCard from '../components/BaseCard.vue'
import BaseButton from '../components/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref('bookings')
const loading = ref(false)
const bookings = ref([])
const showReviewModal = ref(false)
const selectedBooking = ref(null)
const submitting = ref(false)

const reviewForm = ref({
  rating: 5,
  comment: ''
})

const tabs = [
  { id: 'bookings', label: 'My Bookings' },
  { id: 'payments', label: 'Payments' },
  { id: 'discover', label: 'Discover' }
]

const totalSpent = computed(() => {
  return bookings.value
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + (b.package?.price || 0), 0)
})

const activeBookings = computed(() => {
  return bookings.value.filter(b =>
    ['pending', 'accepted', 'in_progress', 'delivered'].includes(b.status)
  ).length
})

const completedBookings = computed(() => {
  return bookings.value.filter(b => b.status === 'completed').length
})

const fetchBookings = async () => {
  loading.value = true
  try {
    const response = await api.get('/bookings')
    bookings.value = response.data
  } catch (error) {
    console.error('Error fetching bookings:', error)
  } finally {
    loading.value = false
  }
}

const completeBooking = async (bookingId) => {
  try {
    await api.put(`/bookings/${bookingId}/complete`)
    await fetchBookings()
  } catch (error) {
    console.error('Error completing booking:', error)
  }
}

const openReviewModal = (booking) => {
  selectedBooking.value = booking
  showReviewModal.value = true
  reviewForm.value = { rating: 5, comment: '' }
}

const submitReview = async () => {
  if (!reviewForm.value.comment.trim()) {
    alert('Please add a comment')
    return
  }

  submitting.value = true
  try {
    await api.post('/reviews', {
      bookingId: selectedBooking.value._id,
      rating: reviewForm.value.rating,
      comment: reviewForm.value.comment
    })
    showReviewModal.value = false
    await fetchBookings()
  } catch (error) {
    console.error('Error submitting review:', error)
    alert(error.response?.data?.message || 'Failed to submit review')
  } finally {
    submitting.value = false
  }
}

const logout = () => {
  authStore.logout()
  router.push('/')
}

onMounted(() => {
  fetchBookings()
})
</script>
