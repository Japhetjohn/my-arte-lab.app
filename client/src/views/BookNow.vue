<template>
  <AppLayout>
    <div class="w-full px-8 py-8">
      <!-- Top Bar with Back Button and Progress -->
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-4">
          <button
            v-if="currentStep > 1"
            @click="previousStep"
            class="flex items-center gap-2 text-neutral-400 hover:text-white transition-all"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            <span class="text-[14px]">Back</span>
          </button>
          <h1 class="text-[48px] font-bold text-white">Book Service</h1>
        </div>

        <!-- Step Indicator -->
        <div class="flex items-center gap-3">
          <div
            v-for="step in 3"
            :key="step"
            class="flex items-center gap-2"
          >
            <div
              :class="[
                'w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all',
                currentStep >= step
                  ? 'bg-primary text-white'
                  : 'bg-neutral-700 text-neutral-400'
              ]"
            >
              {{ step }}
            </div>
            <span
              v-if="step < 3"
              :class="[
                'w-12 h-1 rounded transition-all',
                currentStep > step ? 'bg-primary' : 'bg-neutral-700'
              ]"
            ></span>
          </div>
        </div>
      </div>

      <!-- Step Content -->
      <div class="max-w-[800px] mx-auto">
        <!-- Step 1: Select Creator & Service -->
        <Card v-if="currentStep === 1" variant="bordered" padding="lg">
          <h2 class="text-white text-2xl font-bold mb-6">Select Creator & Service</h2>

          <!-- Search Creators -->
          <div class="mb-6">
            <Input
              v-model="searchQuery"
              type="text"
              placeholder="Search creators..."
              label="Find a Creator"
            >
              <template #iconLeft>
                <svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </template>
            </Input>
          </div>

          <!-- Creator Selection -->
          <div v-if="!selectedCreator" class="space-y-3 mb-6">
            <p class="text-neutral-400 text-sm mb-3">Available Creators:</p>
            <Card
              v-for="creator in filteredCreators"
              :key="creator.id"
              variant="bordered"
              hoverable
              clickable
              padding="md"
              @click="selectCreator(creator)"
            >
              <div class="flex items-center gap-4">
                <Avatar
                  :src="creator.avatar"
                  :initials="creator.name.charAt(0)"
                  size="lg"
                  shape="circle"
                  :status="creator.available ? 'online' : 'offline'"
                />
                <div class="flex-1">
                  <h3 class="text-white font-semibold mb-1">{{ creator.name }}</h3>
                  <p class="text-neutral-400 text-sm">{{ creator.category }}</p>
                </div>
                <Badge :variant="creator.available ? 'success' : 'warning'" size="sm">
                  {{ creator.available ? 'Available' : 'Busy' }}
                </Badge>
              </div>
            </Card>
          </div>

          <!-- Service Selection (after creator is selected) -->
          <div v-else>
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <Avatar
                  :src="selectedCreator.avatar"
                  :initials="selectedCreator.name.charAt(0)"
                  size="md"
                  shape="circle"
                />
                <div>
                  <p class="text-white font-semibold">{{ selectedCreator.name }}</p>
                  <p class="text-neutral-400 text-sm">{{ selectedCreator.category }}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" @click="selectedCreator = null">
                Change Creator
              </Button>
            </div>

            <p class="text-neutral-400 text-sm mb-3">Select a Service:</p>
            <div class="space-y-3">
              <Card
                v-for="service in selectedCreator.services"
                :key="service.id"
                variant="bordered"
                hoverable
                clickable
                padding="md"
                :class="selectedService?.id === service.id ? 'ring-2 ring-primary' : ''"
                @click="selectService(service)"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h3 class="text-white font-semibold mb-2">{{ service.name }}</h3>
                    <p class="text-neutral-400 text-sm mb-3">{{ service.description }}</p>
                    <div class="flex items-center gap-4 text-sm text-neutral-400">
                      <div class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {{ service.duration }}
                      </div>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-success text-xl font-bold">${{ service.price.toLocaleString() }}</p>
                    <p class="text-neutral-400 text-xs">+ ${{ service.platformFee }} fee</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <!-- Next Button -->
          <div class="mt-8">
            <Button
              variant="primary"
              size="lg"
              full-width
              :disabled="!selectedService"
              @click="nextStep"
            >
              Continue to Details
            </Button>
          </div>
        </Card>

        <!-- Step 2: Booking Details -->
        <Card v-else-if="currentStep === 2" variant="bordered" padding="lg">
          <h2 class="text-white text-2xl font-bold mb-6">Booking Details</h2>

          <!-- Selected Service Summary -->
          <Card variant="elevated" padding="md" class="mb-6">
            <div class="flex items-center gap-4">
              <Avatar
                :src="selectedCreator.avatar"
                :initials="selectedCreator.name.charAt(0)"
                size="lg"
                shape="circle"
              />
              <div class="flex-1">
                <h3 class="text-white font-semibold">{{ selectedService.name }}</h3>
                <p class="text-neutral-400 text-sm">with {{ selectedCreator.name }}</p>
              </div>
              <div class="text-right">
                <p class="text-success text-xl font-bold">${{ selectedService.price.toLocaleString() }}</p>
              </div>
            </div>
          </Card>

          <!-- Booking Form -->
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <Input
                v-model="bookingForm.date"
                type="date"
                label="Date"
                required
              />
              <Input
                v-model="bookingForm.time"
                type="time"
                label="Time"
                required
              />
            </div>

            <Input
              v-model="bookingForm.location"
              type="text"
              label="Location"
              placeholder="e.g., Lekki, Lagos"
              required
            >
              <template #iconLeft>
                <svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </template>
            </Input>

            <Textarea
              v-model="bookingForm.brief"
              label="Project Brief"
              placeholder="Describe your project requirements, style preferences, and any specific details..."
              :rows="4"
              :max-length="1000"
              required
            />

            <Input
              v-model="bookingForm.contactEmail"
              type="email"
              label="Contact Email"
              placeholder="your@email.com"
              required
            />

            <Input
              v-model="bookingForm.contactPhone"
              type="tel"
              label="Contact Phone"
              placeholder="+234 XXX XXX XXXX"
              required
            />
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3 mt-8">
            <Button
              variant="secondary"
              size="lg"
              full-width
              @click="previousStep"
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="lg"
              full-width
              :disabled="!isStep2Valid"
              @click="nextStep"
            >
              Continue to Payment
            </Button>
          </div>
        </Card>

        <!-- Step 3: Payment & Confirmation -->
        <Card v-else-if="currentStep === 3" variant="bordered" padding="lg">
          <h2 class="text-white text-2xl font-bold mb-6">Payment & Confirmation</h2>

          <!-- Booking Summary -->
          <Card variant="elevated" padding="lg" class="mb-6">
            <h3 class="text-white font-semibold mb-4">Booking Summary</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-neutral-400">Service</span>
                <span class="text-white font-semibold">{{ selectedService.name }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-neutral-400">Creator</span>
                <span class="text-white">{{ selectedCreator.name }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-neutral-400">Date & Time</span>
                <span class="text-white">{{ bookingForm.date }} at {{ bookingForm.time }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-neutral-400">Location</span>
                <span class="text-white">{{ bookingForm.location }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-neutral-400">Duration</span>
                <span class="text-white">{{ selectedService.duration }}</span>
              </div>
            </div>

            <div class="border-t border-neutral-700 my-4"></div>

            <!-- Price Breakdown -->
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-neutral-400">Service Fee</span>
                <span class="text-white">${{ selectedService.price.toLocaleString() }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-neutral-400">Platform Fee</span>
                <span class="text-white">${{ selectedService.platformFee }}</span>
              </div>
              <div class="flex items-center justify-between text-lg font-bold">
                <span class="text-white">Total</span>
                <span class="text-success">${{ totalPrice.toLocaleString() }}</span>
              </div>
            </div>
          </Card>

          <!-- Payment Method Selection -->
          <div class="mb-6">
            <p class="text-white font-semibold mb-3">Payment Method</p>
            <div class="space-y-3">
              <Card
                v-for="method in paymentMethods"
                :key="method.id"
                variant="bordered"
                hoverable
                clickable
                padding="md"
                :class="selectedPaymentMethod === method.id ? 'ring-2 ring-primary' : ''"
                @click="selectedPaymentMethod = method.id"
              >
                <div class="flex items-center gap-3">
                  <div
                    :class="[
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                      selectedPaymentMethod === method.id
                        ? 'border-primary'
                        : 'border-neutral-600'
                    ]"
                  >
                    <div
                      v-if="selectedPaymentMethod === method.id"
                      class="w-3 h-3 rounded-full bg-primary"
                    ></div>
                  </div>
                  <div class="flex-1">
                    <p class="text-white font-semibold">{{ method.name }}</p>
                    <p class="text-neutral-400 text-sm">{{ method.description }}</p>
                  </div>
                  <Badge variant="info" size="sm" v-if="method.recommended">
                    Recommended
                  </Badge>
                </div>
              </Card>
            </div>
          </div>

          <!-- Terms & Conditions -->
          <div class="flex items-start gap-3 mb-6 p-4 bg-neutral-800 rounded-lg">
            <input
              type="checkbox"
              v-model="agreedToTerms"
              id="terms"
              class="mt-1 w-4 h-4 rounded border-neutral-600 text-primary focus:ring-primary focus:ring-offset-0"
            />
            <label for="terms" class="text-sm text-neutral-300 cursor-pointer">
              I agree to the <a href="#" class="text-primary hover:underline">Terms & Conditions</a> and understand that payment will be held in escrow until project delivery is approved.
            </label>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              full-width
              @click="previousStep"
            >
              Back
            </Button>
            <Button
              variant="primary"
              size="lg"
              full-width
              :disabled="!agreedToTerms || !selectedPaymentMethod || isSubmitting"
              :loading="isSubmitting"
              @click="submitBooking"
            >
              {{ isSubmitting ? 'Processing...' : `Pay $${totalPrice.toLocaleString()}` }}
            </Button>
          </div>
        </Card>
      </div>
    </div>

    <!-- Success Modal -->
    <div
      v-if="showSuccessModal"
      class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
      @click.self="closeSuccessModal"
    >
      <Card variant="elevated" padding="lg" class="max-w-md w-full">
        <div class="text-center">
          <div class="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
            <svg class="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 class="text-white text-2xl font-bold mb-2">Booking Confirmed!</h2>
          <p class="text-neutral-300 mb-6">
            Your booking has been submitted successfully. {{ selectedCreator?.name }} will review your request and respond shortly.
          </p>
          <div class="space-y-3">
            <Button variant="primary" size="lg" full-width @click="router.push('/bookings')">
              View My Bookings
            </Button>
            <Button variant="ghost" size="lg" full-width @click="closeSuccessModal">
              Book Another Service
            </Button>
          </div>
        </div>
      </Card>
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
import { useRouter, useRoute } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import Button from '../components/design-system/Button.vue'
import Input from '../components/design-system/Input.vue'
import Select from '../components/design-system/Select.vue'
import Textarea from '../components/design-system/Textarea.vue'
import Card from '../components/design-system/Card.vue'
import Badge from '../components/design-system/Badge.vue'
import Avatar from '../components/design-system/Avatar.vue'
import AuthModal from '../components/AuthModal.vue'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const route = useRoute()
const { isAuthenticated, user, initAuth } = useAuth()

// State
const currentStep = ref(1)
const searchQuery = ref('')
const selectedCreator = ref(null)
const selectedService = ref(null)
const selectedPaymentMethod = ref(null)
const agreedToTerms = ref(false)
const isSubmitting = ref(false)
const showSuccessModal = ref(false)
const showAuthModal = ref(false)

// Store booking state for after authentication
const pendingBooking = ref(null)

const bookingForm = ref({
  date: '',
  time: '',
  location: '',
  brief: '',
  contactEmail: '',
  contactPhone: ''
})

// Mock Data - Creators with Services
const creators = ref([
  {
    id: 1,
    name: 'Ebuka Esiobu',
    category: 'Wedding Photographer',
    avatar: null,
    available: true,
    services: [
      {
        id: 1,
        name: 'Wedding Photography - Standard',
        description: 'Full day wedding coverage including ceremony and reception',
        price: 150000,
        platformFee: 15000,
        duration: '8 hours'
      },
      {
        id: 2,
        name: 'Wedding Photography - Premium',
        description: 'Full day coverage with drone shots, photo booth, and engagement session',
        price: 250000,
        platformFee: 25000,
        duration: '10 hours'
      }
    ]
  },
  {
    id: 2,
    name: 'Chiamaka Obi',
    category: 'Videographer',
    avatar: null,
    available: true,
    services: [
      {
        id: 3,
        name: 'Music Video Production',
        description: 'Professional music video with cinematic quality',
        price: 180000,
        platformFee: 18000,
        duration: '6 hours shoot + editing'
      },
      {
        id: 4,
        name: 'Event Video Coverage',
        description: 'Full event coverage with highlight reel',
        price: 120000,
        platformFee: 12000,
        duration: '5 hours'
      }
    ]
  },
  {
    id: 3,
    name: 'Tunde Bakare',
    category: 'Graphic Designer',
    avatar: null,
    available: false,
    services: [
      {
        id: 5,
        name: 'Logo & Brand Identity',
        description: 'Complete brand identity package with logo variations',
        price: 85000,
        platformFee: 8500,
        duration: '2 weeks'
      }
    ]
  }
])

const paymentMethods = [
  {
    id: 'escrow',
    name: 'Escrow Payment',
    description: 'Funds held securely until project completion',
    recommended: true
  },
  {
    id: 'card',
    name: 'Credit/Debit Card',
    description: 'Pay with Visa, Mastercard, or Verve'
  },
  {
    id: 'bank',
    name: 'Bank Transfer',
    description: 'Direct bank transfer with manual verification'
  }
]

// Computed
const filteredCreators = computed(() => {
  if (!searchQuery.value) {
    return creators.value
  }
  const query = searchQuery.value.toLowerCase()
  return creators.value.filter(creator =>
    creator.name.toLowerCase().includes(query) ||
    creator.category.toLowerCase().includes(query)
  )
})

const totalPrice = computed(() => {
  if (!selectedService.value) return 0
  return selectedService.value.price + selectedService.value.platformFee
})

const isStep2Valid = computed(() => {
  return (
    bookingForm.value.date &&
    bookingForm.value.time &&
    bookingForm.value.location &&
    bookingForm.value.brief &&
    bookingForm.value.contactEmail &&
    bookingForm.value.contactPhone
  )
})

// Methods
const checkAuthenticationAndProceed = (action) => {
  if (!isAuthenticated.value) {
    // Save current booking state
    pendingBooking.value = {
      creator: selectedCreator.value,
      service: selectedService.value,
      form: { ...bookingForm.value }
    }
    showAuthModal.value = true
    return false
  }
  return true
}

const handleAuthenticated = (userData) => {
  console.log('User authenticated:', userData)

  // Restore pending booking if exists
  if (pendingBooking.value) {
    selectedCreator.value = pendingBooking.value.creator
    selectedService.value = pendingBooking.value.service
    bookingForm.value = { ...pendingBooking.value.form }
    pendingBooking.value = null

    // Prefill contact info from user data
    if (userData.email && !bookingForm.value.contactEmail) {
      bookingForm.value.contactEmail = userData.email
    }
  }
}

const selectCreator = (creator) => {
  selectedCreator.value = creator
  selectedService.value = null
}

const selectService = (service) => {
  selectedService.value = service
}

const nextStep = () => {
  // Check authentication before proceeding to step 2 or 3
  if (currentStep.value === 1 && !checkAuthenticationAndProceed()) {
    return
  }

  if (currentStep.value < 3) {
    currentStep.value++
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const submitBooking = async () => {
  isSubmitting.value = true

  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))

    // TODO: Send booking request to API
    // const bookingData = {
    //   creatorId: selectedCreator.value.id,
    //   serviceId: selectedService.value.id,
    //   ...bookingForm.value,
    //   totalPrice: totalPrice.value,
    //   paymentMethod: selectedPaymentMethod.value
    // }

    console.log('Booking submitted:', {
      creator: selectedCreator.value,
      service: selectedService.value,
      details: bookingForm.value,
      payment: selectedPaymentMethod.value
    })

    showSuccessModal.value = true
  } catch (error) {
    console.error('Error submitting booking:', error)
    // TODO: Show error message
  } finally {
    isSubmitting.value = false
  }
}

const closeSuccessModal = () => {
  showSuccessModal.value = false
  // Reset form
  currentStep.value = 1
  selectedCreator.value = null
  selectedService.value = null
  selectedPaymentMethod.value = null
  agreedToTerms.value = false
  bookingForm.value = {
    date: '',
    time: '',
    location: '',
    brief: '',
    contactEmail: '',
    contactPhone: ''
  }
}

// Initialize authentication
onMounted(() => {
  initAuth()

  // Check if coming from a specific creator
  if (route.query.creator) {
    const creatorId = parseInt(route.query.creator)
    const creator = creators.value.find(c => c.id === creatorId)
    if (creator) {
      selectedCreator.value = creator
    }
  }

  // Prefill email if user is authenticated
  if (isAuthenticated.value && user.value) {
    bookingForm.value.contactEmail = user.value.email || ''
  }
})
</script>
