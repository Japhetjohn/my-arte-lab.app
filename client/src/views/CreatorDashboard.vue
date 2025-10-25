<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm">
      <div class="container mx-auto px-6 py-4 flex justify-between items-center">
        <router-link to="/" class="text-2xl font-bold text-indigo-600">MyArteLab</router-link>
        <div class="flex items-center space-x-4">
          <span class="text-gray-700">{{ authStore.user?.profile?.name }}</span>
          <BaseButton @click="logout" variant="outline" size="sm">Logout</BaseButton>
        </div>
      </div>
    </header>

    <div class="container mx-auto px-6 py-8">
      <!-- Welcome Section -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Creator Dashboard</h1>
        <p class="text-gray-600 mt-2">Manage your bookings, portfolio, and earnings</p>
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
      <!-- Portfolio Tab -->
      <div v-if="activeTab === 'portfolio'">
        <BaseCard>
          <template #header>
            <div class="flex justify-between items-center">
              <h2 class="text-xl font-semibold">My Portfolio</h2>
              <BaseButton @click="showAddPortfolio = true" variant="primary" size="sm">
                + Add Work
              </BaseButton>
            </div>
          </template>

          <div class="grid md:grid-cols-3 gap-4">
            <div
              v-for="(item, index) in authStore.user?.profile?.portfolio"
              :key="index"
              class="relative group"
            >
              <img
                :src="item.url"
                :alt="item.description"
                class="w-full h-48 object-cover rounded-lg"
                @error="handleImageError"
              />
              <div class="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <p class="text-white text-sm px-4 text-center">{{ item.description }}</p>
              </div>
            </div>
          </div>

          <div v-if="!authStore.user?.profile?.portfolio?.length" class="text-center py-12 text-gray-500">
            No portfolio items yet. Add your first work!
          </div>
        </BaseCard>

        <!-- Rates/Packages -->
        <BaseCard class="mt-6">
          <template #header>
            <h2 class="text-xl font-semibold">My Packages</h2>
          </template>

          <div class="space-y-4">
            <div
              v-for="(rate, index) in authStore.user?.profile?.rates"
              :key="index"
              class="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
            >
              <div>
                <h3 class="font-semibold text-gray-900">{{ rate.name }}</h3>
              </div>
              <div class="text-lg font-bold text-indigo-600">${{ rate.price }}</div>
            </div>
          </div>

          <div v-if="!authStore.user?.profile?.rates?.length" class="text-center py-12 text-gray-500">
            No packages set up yet.
          </div>
        </BaseCard>
      </div>

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
                    Client: {{ booking.client?.profile?.name || booking.client?.email }}
                  </p>
                  <p class="text-sm text-gray-500 mt-1">
                    {{ new Date(booking.createdAt).toLocaleDateString() }}
                  </p>
                </div>
                <div class="text-right">
                  <div class="text-lg font-bold text-gray-900">${{ booking.package.price }}</div>
                  <span
                    :class="[
                      'inline-block px-2 py-1 text-xs rounded-full mt-2',
                      booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      booking.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    ]"
                  >
                    {{ booking.status }}
                  </span>
                </div>
              </div>

              <div class="mt-4 flex gap-2">
                <BaseButton
                  v-if="booking.status === 'pending'"
                  @click="updateBookingStatus(booking._id, 'accepted')"
                  variant="primary"
                  size="sm"
                >
                  Accept
                </BaseButton>
                <BaseButton
                  v-if="booking.status === 'accepted'"
                  @click="updateBookingStatus(booking._id, 'in_progress')"
                  variant="primary"
                  size="sm"
                >
                  Start Work
                </BaseButton>
                <BaseButton
                  v-if="booking.status === 'in_progress'"
                  @click="updateBookingStatus(booking._id, 'delivered')"
                  variant="primary"
                  size="sm"
                >
                  Mark as Delivered
                </BaseButton>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-12 text-gray-500">
            No bookings yet. Once clients book you, they'll appear here!
          </div>
        </BaseCard>
      </div>

      <!-- Wallet Tab -->
      <div v-if="activeTab === 'wallet'">
        <div class="grid md:grid-cols-3 gap-6 mb-6">
          <BaseCard>
            <div class="text-center py-6">
              <p class="text-gray-600 text-sm">Available Balance</p>
              <p class="text-3xl font-bold text-indigo-600 mt-2">
                ${{ wallet.balance?.toFixed(2) || '0.00' }}
              </p>
            </div>
          </BaseCard>

          <BaseCard>
            <div class="text-center py-6">
              <p class="text-gray-600 text-sm">Total Earnings</p>
              <p class="text-3xl font-bold text-green-600 mt-2">
                ${{ totalEarnings.toFixed(2) }}
              </p>
            </div>
          </BaseCard>

          <BaseCard>
            <div class="text-center py-6">
              <p class="text-gray-600 text-sm">Completed Jobs</p>
              <p class="text-3xl font-bold text-gray-900 mt-2">
                {{ completedBookings }}
              </p>
            </div>
          </BaseCard>
        </div>

        <BaseCard>
          <template #header>
            <div class="flex justify-between items-center">
              <h2 class="text-xl font-semibold">Transaction History</h2>
              <BaseButton
                v-if="wallet.balance > 0"
                @click="showWithdrawModal = true"
                variant="primary"
                size="sm"
              >
                Withdraw Funds
              </BaseButton>
            </div>
          </template>

          <div v-if="wallet.transactions?.length > 0" class="space-y-3">
            <div
              v-for="transaction in wallet.transactions"
              :key="transaction._id"
              class="flex justify-between items-center p-3 bg-gray-50 rounded"
            >
              <div>
                <p class="font-medium text-gray-900">Payment Received</p>
                <p class="text-sm text-gray-600">
                  {{ new Date(transaction.createdAt).toLocaleString() }}
                </p>
              </div>
              <div class="text-lg font-bold text-green-600">
                +${{ transaction.creatorPayout?.toFixed(2) }}
              </div>
            </div>
          </div>

          <div v-else class="text-center py-12 text-gray-500">
            No transactions yet.
          </div>
        </BaseCard>
      </div>

      <!-- Reviews Tab -->
      <div v-if="activeTab === 'reviews'">
        <BaseCard>
          <template #header>
            <div class="flex justify-between items-center">
              <h2 class="text-xl font-semibold">Client Reviews</h2>
              <div class="flex items-center">
                <div class="flex text-yellow-400 mr-2">
                  <svg v-for="i in 5" :key="i" class="w-5 h-5" :class="i <= Math.round(authStore.user?.rating || 0) ? 'fill-current' : 'fill-gray-300'" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                  </svg>
                </div>
                <span class="text-lg font-semibold">
                  {{ authStore.user?.rating?.toFixed(1) || '0.0' }}
                </span>
                <span class="text-gray-600 ml-2">
                  ({{ authStore.user?.totalReviews || 0 }} reviews)
                </span>
              </div>
            </div>
          </template>

          <div v-if="reviews.length > 0" class="space-y-4">
            <div
              v-for="review in reviews"
              :key="review._id"
              class="border-b border-gray-200 pb-4"
            >
              <div class="flex justify-between items-start mb-2">
                <div>
                  <p class="font-medium text-gray-900">
                    {{ review.client?.profile?.name || 'Anonymous' }}
                  </p>
                  <p class="text-sm text-gray-500">
                    {{ new Date(review.createdAt).toLocaleDateString() }}
                  </p>
                </div>
                <div class="flex text-yellow-400">
                  <svg v-for="i in review.rating" :key="i" class="w-4 h-4 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                  </svg>
                </div>
              </div>
              <p class="text-gray-700">{{ review.comment }}</p>
              <div v-if="review.response" class="mt-3 pl-4 border-l-2 border-indigo-200">
                <p class="text-sm text-gray-600">Your response:</p>
                <p class="text-gray-700 mt-1">{{ review.response.text }}</p>
              </div>
            </div>
          </div>

          <div v-else class="text-center py-12 text-gray-500">
            No reviews yet. Complete bookings to receive reviews!
          </div>
        </BaseCard>
      </div>
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

const activeTab = ref('portfolio')
const loading = ref(false)
const bookings = ref([])
const wallet = ref({ balance: 0, transactions: [] })
const reviews = ref([])
const showAddPortfolio = ref(false)
const showWithdrawModal = ref(false)

const tabs = [
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'reviews', label: 'Reviews' }
]

const totalEarnings = computed(() => {
  return bookings.value
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + (b.package?.price || 0) * 0.92, 0)
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

const fetchWallet = async () => {
  try {
    const response = await api.get('/users/wallet')
    wallet.value = response.data
  } catch (error) {
    console.error('Error fetching wallet:', error)
  }
}

const fetchReviews = async () => {
  try {
    const response = await api.get(`/reviews/creator/${authStore.user._id}`)
    reviews.value = response.data
  } catch (error) {
    console.error('Error fetching reviews:', error)
  }
}

const updateBookingStatus = async (bookingId, status) => {
  try {
    await api.put(`/bookings/${bookingId}/status`, { status })
    await fetchBookings()
  } catch (error) {
    console.error('Error updating booking:', error)
  }
}

const handleImageError = (event) => {
  event.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found'
}

const logout = () => {
  authStore.logout()
  router.push('/')
}

onMounted(async () => {
  await fetchBookings()
  await fetchWallet()
  await fetchReviews()
})
</script>
