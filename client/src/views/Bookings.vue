<template>
  <AppLayout>
    <div class="w-full min-h-screen bg-neutral-50">
      <div class="max-w-7xl mx-auto px-8 py-8">
        <!-- Top Bar with Heading and Role Toggle -->
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center gap-4">
            <h1 class="text-h1 font-bold text-neutral-900">Bookings</h1>
            <!-- Role Badge -->
            <Badge :variant="userRole === 'creator' ? 'primary' : 'secondary'" size="md">
              {{ userRole === 'creator' ? 'Creator' : 'Client' }}
            </Badge>
          </div>

          <!-- Search Bar -->
          <div class="w-[400px]">
            <Input
              v-model="searchQuery"
              type="text"
              placeholder="Search bookings..."
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
            v-model="statusFilter"
            placeholder="All Statuses"
            :options="statusOptions"
            class="w-[200px]"
          />
          <Select
            v-model="dateFilter"
            placeholder="All Time"
            :options="dateOptions"
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
          <Loading variant="spinner" size="lg" text="Loading bookings..." />
        </div>

        <!-- Creator View -->
        <div v-else-if="userRole === 'creator'">
          <!-- Stats Cards -->
          <div class="grid grid-cols-4 gap-4 mb-8">
            <Card variant="elevated" padding="lg">
              <div class="text-center">
                <p class="text-neutral-600 text-sm mb-2">Pending Requests</p>
                <p class="text-neutral-900 text-3xl font-bold">{{ stats.pendingRequests }}</p>
              </div>
            </Card>
            <Card variant="elevated" padding="lg">
              <div class="text-center">
                <p class="text-neutral-600 text-sm mb-2">Upcoming Jobs</p>
                <p class="text-neutral-900 text-3xl font-bold">{{ stats.upcomingJobs }}</p>
              </div>
            </Card>
            <Card variant="elevated" padding="lg">
              <div class="text-center">
                <p class="text-neutral-600 text-sm mb-2">In Progress</p>
                <p class="text-neutral-900 text-3xl font-bold">{{ stats.inProgress }}</p>
              </div>
            </Card>
            <Card variant="elevated" padding="lg">
              <div class="text-center">
                <p class="text-neutral-600 text-sm mb-2">Pending Approval</p>
                <p class="text-neutral-900 text-3xl font-bold">{{ stats.pendingApproval }}</p>
              </div>
            </Card>
          </div>

          <!-- Bookings List -->
          <div v-if="filteredBookings.length > 0" class="space-y-4">
            <Card
              v-for="booking in filteredBookings"
              :key="booking.id"
              variant="elevated"
              padding="lg"
              hoverable
            >
            <div class="flex items-start gap-4">
              <!-- Client Avatar -->
              <Avatar
                :src="booking.clientAvatar"
                :initials="booking.clientName.charAt(0)"
                size="lg"
                shape="circle"
              />

              <!-- Booking Details -->
              <div class="flex-1">
                <div class="flex items-start justify-between mb-3">
                  <div>
                    <h3 class="text-white text-lg font-semibold mb-1">{{ booking.serviceName }}</h3>
                    <p class="text-neutral-400 text-sm mb-2">Client: {{ booking.clientName }}</p>
                    <div class="flex items-center gap-3 text-sm text-neutral-400">
                      <div class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {{ booking.date }}
                      </div>
                      <div class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {{ booking.location }}
                      </div>
                    </div>
                  </div>
                  <div class="text-right">
                    <Badge :variant="getStatusVariant(booking.status)" size="md">
                      {{ booking.status }}
                    </Badge>
                    <p class="text-success text-xl font-bold mt-2">${{ booking.earnings.toLocaleString() }}</p>
                    <p class="text-neutral-400 text-xs">Platform fee: ${{ booking.platformFee }}</p>
                  </div>
                </div>

                <!-- Brief/Description -->
                <p class="text-neutral-300 text-sm mb-4">{{ booking.brief }}</p>

                <!-- Action Buttons -->
                <div class="flex items-center gap-3">
                  <!-- Pending Request Actions -->
                  <template v-if="booking.status === 'Pending'">
                    <Button variant="primary" size="sm" @click="acceptBooking(booking.id)">
                      Accept
                    </Button>
                    <Button variant="secondary" size="sm" @click="declineBooking(booking.id)">
                      Decline
                    </Button>
                  </template>

                  <!-- In Progress Actions -->
                  <template v-else-if="booking.status === 'In Progress'">
                    <Button variant="primary" size="sm" @click="markDelivered(booking.id)">
                      Mark as Delivered
                    </Button>
                  </template>

                  <!-- Pending Approval Actions -->
                  <template v-else-if="booking.status === 'Pending Approval'">
                    <Badge variant="warning" size="sm">
                      Awaiting Client Approval
                    </Badge>
                  </template>

                  <!-- Common Actions -->
                  <Button variant="ghost" size="sm" @click="viewBookingDetails(booking.id)">
                    View Details
                  </Button>
                  <Button variant="ghost" size="sm" @click="messageClient(booking.clientId)">
                    <template #iconLeft>
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </template>
                    Message
                  </Button>
                  <Button
                    v-if="booking.status === 'Completed' && !booking.rated"
                    variant="ghost"
                    size="sm"
                    @click="rateClient(booking.id)"
                  >
                    Rate Client
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <!-- Empty State -->
        <div v-else class="flex justify-center py-16">
          <EmptyState
            icon="calendar"
            title="No bookings found"
            description="You don't have any bookings matching the selected filters"
            size="md"
          />
        </div>
      </div>

      <!-- Client View -->
      <div v-else>
          <!-- Bookings List -->
          <div v-if="filteredBookings.length > 0" class="space-y-4">
            <Card
              v-for="booking in filteredBookings"
              :key="booking.id"
              variant="elevated"
              padding="lg"
              hoverable
            >
            <div class="flex items-start gap-4">
              <!-- Creator Avatar -->
              <Avatar
                :src="booking.creatorAvatar"
                :initials="booking.creatorName.charAt(0)"
                size="lg"
                shape="circle"
                :status="booking.creatorOnline ? 'online' : 'offline'"
              />

              <!-- Booking Details -->
              <div class="flex-1">
                <div class="flex items-start justify-between mb-3">
                  <div>
                    <h3 class="text-white text-lg font-semibold mb-1">{{ booking.serviceName }}</h3>
                    <p class="text-neutral-400 text-sm mb-2">Creator: {{ booking.creatorName }}</p>
                    <div class="flex items-center gap-3 text-sm text-neutral-400">
                      <div class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {{ booking.date }}
                      </div>
                      <div class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {{ booking.duration }}
                      </div>
                      <div class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {{ booking.location }}
                      </div>
                    </div>
                  </div>
                  <div class="text-right">
                    <Badge :variant="getStatusVariant(booking.status)" size="md">
                      {{ booking.status }}
                    </Badge>
                    <p class="text-white text-xl font-bold mt-2">${{ booking.totalPrice.toLocaleString() }}</p>
                    <p class="text-neutral-400 text-xs">Incl. platform fee</p>
                  </div>
                </div>

                <!-- Brief/Description -->
                <p class="text-neutral-300 text-sm mb-4">{{ booking.brief }}</p>

                <!-- Action Buttons -->
                <div class="flex items-center gap-3">
                  <!-- Delivered - Awaiting Approval -->
                  <template v-if="booking.status === 'Delivered'">
                    <Button variant="primary" size="sm" @click="approveDelivery(booking.id)">
                      Approve & Complete
                    </Button>
                    <Button variant="secondary" size="sm" @click="requestRevision(booking.id)">
                      Request Revision
                    </Button>
                  </template>

                  <!-- Completed - Rate -->
                  <template v-else-if="booking.status === 'Completed' && !booking.rated">
                    <Button variant="primary" size="sm" @click="rateCreator(booking.id)">
                      Rate Creator
                    </Button>
                  </template>

                  <!-- Common Actions -->
                  <Button variant="ghost" size="sm" @click="viewBookingDetails(booking.id)">
                    View Details
                  </Button>
                  <Button variant="ghost" size="sm" @click="messageCreator(booking.creatorId)">
                    <template #iconLeft>
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </template>
                    Message
                  </Button>
                  <Button
                    v-if="['Accepted', 'In Progress', 'Delivered'].includes(booking.status)"
                    variant="ghost"
                    size="sm"
                    @click="viewInvoice(booking.id)"
                  >
                    View Invoice
                  </Button>
                  <Button
                    v-if="booking.status === 'Pending' || booking.status === 'Accepted'"
                    variant="danger"
                    size="sm"
                    @click="cancelBooking(booking.id)"
                  >
                    Cancel
                  </Button>
                  <Button
                    v-if="booking.status === 'Completed' && booking.canRefund"
                    variant="ghost"
                    size="sm"
                    @click="requestRefund(booking.id)"
                  >
                    Request Refund
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <!-- Empty State -->
        <div v-else class="flex justify-center py-16">
          <EmptyState
            icon="calendar"
            title="No bookings yet"
            description="Start booking talented creators to bring your projects to life"
            primary-action="Browse Creators"
            @primary-action="router.push('/discover')"
          />
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import Button from '../components/design-system/Button.vue'
import Input from '../components/design-system/Input.vue'
import Select from '../components/design-system/Select.vue'
import Card from '../components/design-system/Card.vue'
import Badge from '../components/design-system/Badge.vue'
import Avatar from '../components/design-system/Avatar.vue'
import Loading from '../components/design-system/Loading.vue'
import EmptyState from '../components/design-system/EmptyState.vue'

const router = useRouter()

// State
const loading = ref(true)
const searchQuery = ref('')
const statusFilter = ref('')
const dateFilter = ref('')
const userRole = ref('creator') // 'creator' or 'client' - TODO: Get from auth context
const bookings = ref([])

// Filter Options
const statusOptions = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Accepted', value: 'Accepted' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Delivered', value: 'Delivered' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Cancelled', value: 'Cancelled' }
]

const dateOptions = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Last 3 Months', value: '3months' },
  { label: 'This Year', value: 'year' }
]

// Mock Data - Creator Bookings
const mockCreatorBookings = [
  {
    id: 1,
    clientId: 'client1',
    clientName: 'Sarah Johnson',
    clientAvatar: null,
    serviceName: 'Wedding Photography Package',
    date: 'Dec 15, 2024 • 2:00 PM',
    location: 'Lekki, Lagos',
    duration: '8 hours',
    brief: 'Full day wedding coverage including ceremony, reception, and couple portraits. Need natural lighting style with candid moments.',
    status: 'Pending',
    earnings: 150000,
    platformFee: 15000,
    totalPrice: 165000,
    rated: false
  },
  {
    id: 2,
    clientId: 'client2',
    clientName: 'Michael Chen',
    clientAvatar: null,
    serviceName: 'Brand Product Shoot',
    date: 'Dec 10, 2024 • 10:00 AM',
    location: 'Victoria Island, Lagos',
    duration: '4 hours',
    brief: 'Product photography for new fashion line. Need clean white background shots and lifestyle images.',
    status: 'In Progress',
    earnings: 80000,
    platformFee: 8000,
    totalPrice: 88000,
    rated: false
  },
  {
    id: 3,
    clientId: 'client3',
    clientName: 'Aisha Mohammed',
    clientAvatar: null,
    serviceName: 'Event Coverage',
    date: 'Dec 8, 2024 • 6:00 PM',
    location: 'Ikeja, Lagos',
    duration: '5 hours',
    brief: 'Corporate event photography with focus on keynote speakers and networking sessions.',
    status: 'Pending Approval',
    earnings: 95000,
    platformFee: 9500,
    totalPrice: 104500,
    rated: false
  },
  {
    id: 4,
    clientId: 'client4',
    clientName: 'David Okonkwo',
    clientAvatar: null,
    serviceName: 'Portrait Session',
    date: 'Nov 28, 2024 • 3:00 PM',
    location: 'Yaba, Lagos',
    duration: '2 hours',
    brief: 'Professional headshots for LinkedIn and company website.',
    status: 'Completed',
    earnings: 45000,
    platformFee: 4500,
    totalPrice: 49500,
    rated: true
  }
]

// Mock Data - Client Bookings
const mockClientBookings = [
  {
    id: 5,
    creatorId: 'creator1',
    creatorName: 'Ebuka Esiobu',
    creatorAvatar: null,
    creatorOnline: true,
    serviceName: 'Wedding Photography Premium',
    date: 'Dec 20, 2024 • 11:00 AM',
    location: 'Abuja',
    duration: '10 hours',
    brief: 'Complete wedding day coverage with drone shots and photo booth setup.',
    status: 'Accepted',
    totalPrice: 250000,
    rated: false,
    canRefund: false
  },
  {
    id: 6,
    creatorId: 'creator2',
    creatorName: 'Chiamaka Obi',
    creatorAvatar: null,
    creatorOnline: false,
    serviceName: 'Music Video Production',
    date: 'Dec 12, 2024 • 9:00 AM',
    location: 'Surulere, Lagos',
    duration: '6 hours',
    brief: 'Music video shoot with cinematic feel, 3 location changes.',
    status: 'Delivered',
    totalPrice: 180000,
    rated: false,
    canRefund: false
  },
  {
    id: 7,
    creatorId: 'creator3',
    creatorName: 'Tunde Bakare',
    creatorAvatar: null,
    creatorOnline: true,
    serviceName: 'Logo Design & Branding',
    date: 'Nov 25, 2024',
    location: 'Remote',
    duration: '2 weeks',
    brief: 'Complete brand identity including logo, color palette, and brand guidelines.',
    status: 'Completed',
    totalPrice: 120000,
    rated: true,
    canRefund: false
  },
  {
    id: 8,
    creatorId: 'creator4',
    creatorName: 'Ngozi Eze',
    creatorAvatar: null,
    creatorOnline: false,
    serviceName: 'Fashion Lookbook Shoot',
    date: 'Dec 18, 2024 • 1:00 PM',
    location: 'Ikoyi, Lagos',
    duration: '5 hours',
    brief: 'Fashion photography for new collection launch with 3 models.',
    status: 'Pending',
    totalPrice: 95000,
    rated: false,
    canRefund: true
  }
]

// Stats for Creator View
const stats = ref({
  pendingRequests: 0,
  upcomingJobs: 0,
  inProgress: 0,
  pendingApproval: 0
})

// Computed
const filteredBookings = computed(() => {
  let result = bookings.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(booking =>
      booking.serviceName.toLowerCase().includes(query) ||
      (booking.clientName && booking.clientName.toLowerCase().includes(query)) ||
      (booking.creatorName && booking.creatorName.toLowerCase().includes(query)) ||
      booking.brief.toLowerCase().includes(query)
    )
  }

  // Status filter
  if (statusFilter.value) {
    result = result.filter(booking => booking.status === statusFilter.value)
  }

  // Date filter (simplified - would need actual date logic)
  // if (dateFilter.value) {
  //   // TODO: Implement date filtering based on booking.date
  // }

  return result
})

const hasActiveFilters = computed(() => {
  return statusFilter.value || dateFilter.value || searchQuery.value
})

// Methods
const fetchBookings = async () => {
  loading.value = true
  try {
    // Simulate API call
    setTimeout(() => {
      bookings.value = userRole.value === 'creator' ? mockCreatorBookings : mockClientBookings

      // Calculate stats for creator view
      if (userRole.value === 'creator') {
        stats.value = {
          pendingRequests: bookings.value.filter(b => b.status === 'Pending').length,
          upcomingJobs: bookings.value.filter(b => b.status === 'Accepted').length,
          inProgress: bookings.value.filter(b => b.status === 'In Progress').length,
          pendingApproval: bookings.value.filter(b => b.status === 'Pending Approval').length
        }
      }

      loading.value = false
    }, 600)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    loading.value = false
  }
}

const getStatusVariant = (status) => {
  switch (status) {
    case 'Pending':
      return 'warning'
    case 'Accepted':
    case 'In Progress':
      return 'primary'
    case 'Delivered':
    case 'Pending Approval':
      return 'info'
    case 'Completed':
      return 'success'
    case 'Cancelled':
      return 'error'
    default:
      return 'default'
  }
}

const clearFilters = () => {
  searchQuery.value = ''
  statusFilter.value = ''
  dateFilter.value = ''
}

// Creator Actions
const acceptBooking = (bookingId) => {
  console.log('Accept booking:', bookingId)
  // TODO: API call to accept booking
}

const declineBooking = (bookingId) => {
  console.log('Decline booking:', bookingId)
  // TODO: Show decline reason modal, then API call
}

const markDelivered = (bookingId) => {
  console.log('Mark delivered:', bookingId)
  // TODO: Show delivery notes modal, then API call
}

const rateClient = (bookingId) => {
  console.log('Rate client:', bookingId)
  // TODO: Show rating modal
}

// Client Actions
const approveDelivery = (bookingId) => {
  console.log('Approve delivery:', bookingId)
  // TODO: API call to approve and complete booking
}

const requestRevision = (bookingId) => {
  console.log('Request revision:', bookingId)
  // TODO: Show revision request modal
}

const rateCreator = (bookingId) => {
  console.log('Rate creator:', bookingId)
  // TODO: Show rating modal
}

const cancelBooking = (bookingId) => {
  console.log('Cancel booking:', bookingId)
  // TODO: Show cancel confirmation modal with reason
}

const requestRefund = (bookingId) => {
  console.log('Request refund:', bookingId)
  // TODO: Show refund request modal with reason
}

const viewInvoice = (bookingId) => {
  console.log('View invoice:', bookingId)
  // TODO: Open invoice modal or navigate to invoice page
}

// Common Actions
const viewBookingDetails = (bookingId) => {
  console.log('View booking details:', bookingId)
  // TODO: Navigate to booking detail page or open modal
  router.push(`/booking/${bookingId}`)
}

const messageClient = (clientId) => {
  console.log('Message client:', clientId)
  // TODO: Navigate to messaging page or open chat
  router.push(`/messages?user=${clientId}`)
}

const messageCreator = (creatorId) => {
  console.log('Message creator:', creatorId)
  // TODO: Navigate to messaging page or open chat
  router.push(`/messages?user=${creatorId}`)
}

// Lifecycle
onMounted(() => {
  fetchBookings()
})
</script>
