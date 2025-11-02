<template>
  <AppLayout>
    <div class="w-full px-8 py-8">
      <!-- Top Bar with Heading and Search -->
      <div class="flex items-center justify-between mb-8">
        <!-- Book Now Heading -->
        <h1 class="text-[48px] font-bold text-white">Book Now</h1>

        <!-- Search Bar -->
        <div class="w-[320px]">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search"
              class="w-full h-[44px] px-4 pl-10 bg-[#1a1a1a] border border-[#333333] rounded-[12px] text-white text-[14px] placeholder-[#666666] focus:outline-none focus:border-[#9747FF] transition-all"
            />
            <svg class="w-5 h-5 text-[#666666] absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Services List -->
      <div class="max-w-[800px]">
        <div
          v-for="service in filteredServices"
          :key="service.id"
          class="flex items-center justify-between bg-[#1a1a1a] border border-[#333333] rounded-[14px] p-4 mb-3 cursor-pointer hover:border-[#9747FF] transition-all"
          @click="handleServiceClick(service)"
        >
          <div class="flex items-center gap-4">
            <!-- Purple Circle Icon -->
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-[#9747FF] to-[#D946EF] flex items-center justify-center flex-shrink-0">
              <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>

            <!-- Service Info -->
            <div>
              <h3 class="text-white text-[16px] font-semibold mb-1">{{ service.title }}</h3>
              <p class="text-[#999999] text-[14px]">{{ service.creator }}</p>
            </div>
          </div>

          <!-- Chevron -->
          <svg class="w-5 h-5 text-[#666666] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <!-- Empty State -->
        <div v-if="filteredServices.length === 0" class="flex flex-col items-center justify-center py-16">
          <div class="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p class="text-[15px] text-[#999999] mb-4">No services found</p>
          <button
            @click="searchQuery = ''"
            class="h-[44px] px-6 bg-gradient-to-r from-[#9747FF] to-[#D946EF] rounded-[12px] text-white text-[15px] font-semibold hover:opacity-90 transition-all"
          >
            Clear Search
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'

const router = useRouter()

// State
const searchQuery = ref('')

// Mock services data matching Glide screenshot
const services = ref([
  {
    id: 1,
    title: 'Event Photography',
    creator: 'Laboss Media',
    category: 'Photography'
  },
  {
    id: 2,
    title: 'Graphics',
    creator: 'Godis Designs',
    category: 'Design'
  },
  {
    id: 3,
    title: 'Designs',
    creator: 'Weyinmi Esiobu',
    category: 'Design'
  },
  {
    id: 4,
    title: 'Event Documentary',
    creator: 'Lunchman',
    category: 'Videography'
  },
  {
    id: 5,
    title: 'Artwork',
    creator: 'Amaris',
    category: 'Art'
  },
  {
    id: 6,
    title: 'Social Media',
    creator: 'Weyinmi Esiobu',
    category: 'Marketing'
  },
  {
    id: 7,
    title: 'Event Media Coverage',
    creator: 'Ebuka Esiobu',
    category: 'Videography'
  }
])

// Computed
const filteredServices = computed(() => {
  if (!searchQuery.value) {
    return services.value
  }

  const query = searchQuery.value.toLowerCase()
  return services.value.filter(service =>
    service.title.toLowerCase().includes(query) ||
    service.creator.toLowerCase().includes(query) ||
    service.category.toLowerCase().includes(query)
  )
})

// Methods
const handleServiceClick = (service) => {
  console.log('Service clicked:', service)
  // TODO: Navigate to booking form or service details
  // router.push(`/book/${service.id}`)
}
</script>
