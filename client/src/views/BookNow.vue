<template>
  <AppLayout>
    <div class="w-full pt-12 pb-12 px-8 sm:px-12">
      <div class="max-w-[640px] mx-auto">

        <!-- Success State -->
        <div v-if="bookingConfirmed">
          <div class="text-center mb-8">
            <h1 class="text-[28px] font-semibold text-[#111111] mb-2 font-['Inter',sans-serif]">
              Booking Confirmed!
            </h1>
            <p class="text-[15px] text-[#6B6B6B]">
              Your payment has been secured in escrow
            </p>
          </div>

          <div class="h-8"></div>

          <div class="bg-white border-[1.5px] border-[#E8E8E8] rounded-[14px] p-6 sm:p-8">

            <!-- Success Icon -->
            <div class="flex justify-center mb-6">
              <div class="w-20 h-20 rounded-full bg-[#F5F5F5] flex items-center justify-center">
                <svg class="w-10 h-10 text-[#9747FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            <!-- Transaction Details -->
            <div class="text-center mb-6">
              <p class="text-[13px] text-[#6B6B6B] mb-2">Transaction ID</p>
              <p class="text-[18px] font-semibold text-[#111111]">{{ transactionId }}</p>
            </div>

            <div class="h-6"></div>

            <div class="text-center pb-6 border-b-[1.5px] border-[#E8E8E8]">
              <p class="text-[13px] text-[#6B6B6B] mb-1">Amount Paid</p>
              <p class="text-[32px] font-bold text-[#111111]">${{ formData.budget }}</p>
            </div>

            <div class="h-6"></div>

            <!-- Buttons -->
            <button
              @click="router.push('/discover')"
              class="w-full h-[56px] bg-[#9747FF] rounded-[12px] text-white text-[15px] font-semibold hover:bg-[#8637EF] transition-all duration-200 flex items-center justify-center mb-3"
            >
              Return to Discover
            </button>

            <button
              @click="router.push('/wallet')"
              class="w-full h-[56px] border-[1.5px] border-[#E8E8E8] rounded-[12px] text-[#6B6B6B] text-[15px] font-semibold hover:border-[#9747FF] hover:text-[#9747FF] transition-all duration-200 flex items-center justify-center"
            >
              View Wallet
            </button>

          </div>
        </div>

        <!-- Booking Form -->
        <div v-else>
          <div class="text-center mb-8">
            <h1 class="text-[28px] font-semibold text-[#111111] mb-2 font-['Inter',sans-serif]">
              Book Now
            </h1>
            <p class="text-[15px] text-[#6B6B6B]">
              Complete the form to book {{ creatorName }}
            </p>
          </div>

          <div class="h-8"></div>

          <div class="bg-white border-[1.5px] border-[#E8E8E8] rounded-[14px] p-6 sm:p-8">

            <!-- Service Type -->
            <div>
              <label class="sr-only">Service Type</label>
              <select
                v-model="formData.serviceType"
                class="w-full h-[56px] px-5 border-[1.5px] border-[#E8E8E8] rounded-[12px] bg-transparent text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200"
              >
                <option value="">Select service type</option>
                <option value="Photography">Photography</option>
                <option value="Videography">Videography</option>
                <option value="Design">Design</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div class="h-6"></div>

            <!-- Project Description -->
            <div>
              <label class="sr-only">Project Description</label>
              <textarea
                v-model="formData.description"
                rows="4"
                placeholder="Describe your project requirements..."
                class="w-full px-5 py-4 border-[1.5px] border-[#E8E8E8] rounded-[12px] bg-transparent placeholder-[#ACACAC] text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200 resize-none"
              ></textarea>
            </div>

            <div class="h-6"></div>

            <!-- Location -->
            <div>
              <label class="sr-only">Location</label>
              <input
                v-model="formData.location"
                type="text"
                placeholder="Project location"
                class="w-full h-[56px] px-5 border-[1.5px] border-[#E8E8E8] rounded-[12px] bg-transparent placeholder-[#ACACAC] text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200"
              />
            </div>

            <div class="h-6"></div>

            <!-- Date -->
            <div>
              <label class="sr-only">Project Date</label>
              <input
                v-model="formData.date"
                type="date"
                class="w-full h-[56px] px-5 border-[1.5px] border-[#E8E8E8] rounded-[12px] bg-transparent text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200"
              />
            </div>

            <div class="h-6"></div>

            <!-- Budget -->
            <div>
              <label class="sr-only">Budget</label>
              <div class="relative">
                <span class="absolute left-5 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-[15px]">$</span>
                <input
                  v-model="formData.budget"
                  type="number"
                  placeholder="Your budget"
                  class="w-full h-[56px] pl-8 pr-5 border-[1.5px] border-[#E8E8E8] rounded-[12px] bg-transparent placeholder-[#ACACAC] text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200"
                />
              </div>
            </div>

            <div class="h-6"></div>

            <!-- File Upload -->
            <div>
              <label class="block text-[14px] text-[#6B6B6B] mb-2">
                Upload Brief (Optional)
              </label>
              <label class="cursor-pointer">
                <input type="file" class="hidden" @change="handleFileUpload" />
                <div class="w-full h-[56px] border-[1.5px] border-[#E8E8E8] rounded-[12px] flex items-center justify-center hover:border-[#9747FF] transition-all duration-200">
                  <svg class="w-5 h-5 text-[#6B6B6B] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span class="text-[15px] text-[#6B6B6B]">{{ uploadedFile ? uploadedFile.name : 'Choose file' }}</span>
                </div>
              </label>
            </div>

            <div class="h-8"></div>

            <!-- Payment Summary -->
            <div class="pt-6 border-t-[1.5px] border-[#E8E8E8]">
              <p class="text-[14px] text-[#6B6B6B] mb-4">Payment Summary</p>

              <div class="flex items-center justify-between mb-2">
                <span class="text-[15px] text-[#6B6B6B]">Service Fee</span>
                <span class="text-[15px] text-[#111111] font-medium">${{ formData.budget || '0.00' }}</span>
              </div>

              <div class="h-4"></div>

              <div class="flex items-center justify-between pb-4 border-b-[1.5px] border-[#E8E8E8]">
                <span class="text-[15px] text-[#6B6B6B]">Platform Fee (5%)</span>
                <span class="text-[15px] text-[#111111] font-medium">${{ platformFee }}</span>
              </div>

              <div class="h-4"></div>

              <div class="flex items-center justify-between">
                <span class="text-[18px] text-[#111111] font-semibold">Total</span>
                <span class="text-[24px] text-[#111111] font-bold">${{ totalAmount }}</span>
              </div>
            </div>

            <div class="h-8"></div>

            <!-- Payment Method -->
            <div>
              <label class="sr-only">Payment Method</label>
              <select
                v-model="formData.paymentMethod"
                class="w-full h-[56px] px-5 border-[1.5px] border-[#E8E8E8] rounded-[12px] bg-transparent text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200"
              >
                <option value="">Select payment method</option>
                <option value="card">Credit/Debit Card</option>
                <option value="crypto">Stablecoin (USDC)</option>
              </select>
            </div>

            <div class="h-8"></div>

            <!-- Submit Button -->
            <button
              @click="confirmBooking"
              :disabled="!isFormValid || loading"
              class="w-full h-[56px] bg-[#9747FF] rounded-[12px] text-white text-[15px] font-semibold hover:bg-[#8637EF] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {{ loading ? 'Processing...' : 'Confirm & Pay' }}
            </button>

            <div class="h-4"></div>

            <!-- Info Text -->
            <p class="text-[13px] text-[#ACACAC] text-center">
              Your payment will be held in escrow until project completion
            </p>

          </div>
        </div>

      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'

const router = useRouter()
const route = useRoute()

// State
const bookingConfirmed = ref(false)
const loading = ref(false)
const uploadedFile = ref(null)
const transactionId = ref('')
const creatorName = ref('this creator') // TODO: Get from route params

const formData = ref({
  serviceType: '',
  description: '',
  location: '',
  date: '',
  budget: '',
  paymentMethod: ''
})

// Computed
const platformFee = computed(() => {
  const budget = parseFloat(formData.value.budget) || 0
  return (budget * 0.05).toFixed(2)
})

const totalAmount = computed(() => {
  const budget = parseFloat(formData.value.budget) || 0
  const fee = parseFloat(platformFee.value)
  return (budget + fee).toFixed(2)
})

const isFormValid = computed(() => {
  return formData.value.serviceType &&
         formData.value.description &&
         formData.value.location &&
         formData.value.date &&
         formData.value.budget &&
         formData.value.paymentMethod
})

// Methods
const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    uploadedFile.value = file
  }
}

const confirmBooking = () => {
  loading.value = true

  // Simulate payment processing
  setTimeout(() => {
    transactionId.value = 'TXN' + Date.now().toString().slice(-8)
    bookingConfirmed.value = true
    loading.value = false
  }, 2000)
}
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
