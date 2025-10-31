<template>
  <AppLayout>
    <div class="w-full pt-12 pb-12 px-12 sm:px-16">
      <div class="max-w-[800px] mx-auto">

        <!-- Loading State -->
        <div v-if="loading" class="flex items-center justify-center py-16">
          <div class="animate-spin rounded-full h-12 w-12 border-[3px] border-[#E8E8E8] border-t-[#9747FF]"></div>
        </div>

        <!-- Profile Content -->
        <div v-else>
          <!-- Profile Card -->
          <div class="bg-white border-[1.5px] border-[#E8E8E8] rounded-[14px] p-6 sm:p-8">
            <!-- Profile Photo -->
            <div class="flex justify-center mb-6">
              <div class="w-[120px] h-[120px] rounded-full bg-gradient-to-br from-[#9747FF] to-[#C86FFF] flex items-center justify-center text-white text-[48px] font-semibold">
                {{ creatorData.name?.charAt(0).toUpperCase() }}
              </div>
            </div>

            <!-- Edit Profile Button (if owner) -->
            <div v-if="isOwner" class="flex justify-end mb-4">
              <button class="h-[44px] px-6 border-[1.5px] border-[#9747FF] rounded-[12px] text-[#9747FF] text-[15px] font-semibold hover:bg-[#9747FF] hover:text-white transition-all flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </button>
            </div>

            <!-- Name & Location -->
            <div class="text-center mb-3">
              <h1 class="text-[32px] font-semibold text-[#111111] mb-2">
                {{ creatorData.name }}
              </h1>
              <div class="flex items-center justify-center gap-2 text-[15px] text-[#6B6B6B]">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {{ creatorData.location }}
              </div>
            </div>

            <!-- Specialization Badge -->
            <div class="flex justify-center mb-4">
              <div class="px-4 py-2 bg-[#F5F5F5] rounded-[8px] text-[15px] font-medium text-[#111111]">
                {{ creatorData.category }}
              </div>
            </div>

            <!-- Rating -->
            <div class="flex items-center justify-center gap-1 mb-6">
              <svg
                v-for="star in 5"
                :key="star"
                class="w-5 h-5"
                :class="star <= creatorData.rating ? 'text-[#FFB800]' : 'text-[#E8E8E8]'"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span class="text-[15px] text-[#6B6B6B] ml-2">{{ creatorData.rating }} ({{ creatorData.reviews }} reviews)</span>
            </div>

            <!-- Action Buttons -->
            <div v-if="!isOwner" class="flex flex-col sm:flex-row gap-3 mb-8">
              <button
                @click="bookNow"
                class="flex-1 h-[56px] bg-[#9747FF] rounded-[12px] text-white text-[15px] font-semibold hover:bg-[#8637EF] transition-all flex items-center justify-center"
              >
                Book Now
              </button>
              <button class="flex-1 h-[56px] border-[1.5px] border-[#9747FF] rounded-[12px] text-[#9747FF] text-[15px] font-semibold hover:bg-[#9747FF] hover:text-white transition-all flex items-center justify-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Message
              </button>
            </div>

            <div class="h-8"></div>

            <!-- Bio Section -->
            <div class="mb-8">
              <h2 class="text-[20px] font-semibold text-[#111111] mb-3">About</h2>
              <p class="text-[15px] text-[#6B6B6B] leading-relaxed">
                {{ creatorData.bio }}
              </p>
            </div>

            <div class="h-6"></div>

            <!-- Portfolio Section -->
            <div class="mb-8">
              <h2 class="text-[20px] font-semibold text-[#111111] mb-4">Portfolio</h2>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div
                  v-for="(item, index) in creatorData.portfolio"
                  :key="index"
                  class="aspect-square bg-gradient-to-br from-[#F5F5F5] to-[#E8E8E8] rounded-[12px] border-[1.5px] border-[#E8E8E8] hover:border-[#9747FF] transition-all cursor-pointer flex items-center justify-center"
                >
                  <svg class="w-12 h-12 text-[#ACACAC]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div class="h-6"></div>

            <!-- Reviews Section -->
            <div>
              <h2 class="text-[20px] font-semibold text-[#111111] mb-4">Reviews</h2>
              <div class="space-y-4">
                <div
                  v-for="review in creatorData.reviewsList"
                  :key="review.id"
                  class="border-[1.5px] border-[#E8E8E8] rounded-[12px] p-4"
                >
                  <div class="flex items-start gap-3 mb-2">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-br from-[#9747FF] to-[#C86FFF] flex items-center justify-center text-white text-[14px] font-semibold">
                      {{ review.clientName.charAt(0).toUpperCase() }}
                    </div>
                    <div class="flex-1">
                      <div class="flex items-center justify-between mb-1">
                        <h4 class="text-[15px] font-semibold text-[#111111]">{{ review.clientName }}</h4>
                        <span class="text-[13px] text-[#ACACAC]">{{ review.date }}</span>
                      </div>
                      <div class="flex items-center gap-1 mb-2">
                        <svg
                          v-for="star in 5"
                          :key="star"
                          class="w-3 h-3"
                          :class="star <= review.rating ? 'text-[#FFB800]' : 'text-[#E8E8E8]'"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                      <p class="text-[14px] text-[#6B6B6B]">{{ review.comment }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import AppLayout from '../components/AppLayout.vue'
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../api/axios'

const router = useRouter()
const route = useRoute()

// State
const loading = ref(true)
const creatorData = ref({})
const currentUserId = ref('current-user-id') // TODO: Get from auth store

// Computed
const isOwner = computed(() => {
  return creatorData.value._id === currentUserId.value
})

// Mock data (will be replaced with API call)
const mockCreator = {
  _id: '1',
  name: 'Adebayo Johnson',
  location: 'Lagos, Nigeria',
  category: 'Photographer',
  rating: 5,
  reviews: 47,
  bio: 'Professional photographer with 8+ years of experience specializing in portrait, event, and commercial photography. I bring creativity and technical expertise to every project, ensuring stunning results that exceed expectations.',
  portfolio: Array(6).fill({}),
  reviewsList: [
    {
      id: 1,
      clientName: 'Sarah Williams',
      rating: 5,
      date: '2 days ago',
      comment: 'Outstanding work! Very professional and captured exactly what we needed. Highly recommend!'
    },
    {
      id: 2,
      clientName: 'Michael Chen',
      rating: 5,
      date: '1 week ago',
      comment: 'Great experience working with this photographer. Amazing quality and fast delivery.'
    },
    {
      id: 3,
      clientName: 'Amara Okafor',
      rating: 4,
      date: '2 weeks ago',
      comment: 'Very talented and easy to work with. The photos came out beautifully!'
    }
  ]
}

// Methods
const fetchCreatorProfile = async () => {
  loading.value = true
  try {
    const creatorId = route.params.id
    // TODO: Replace with actual API call
    // const response = await api.get(`/users/creator/${creatorId}`)
    // creatorData.value = response.data

    // Using mock data for now
    setTimeout(() => {
      creatorData.value = mockCreator
      loading.value = false
    }, 600)
  } catch (error) {
    console.error('Error fetching creator profile:', error)
    loading.value = false
  }
}

const bookNow = () => {
  router.push(`/book/${creatorData.value._id}`)
}

// Lifecycle
onMounted(() => {
  fetchCreatorProfile()
})
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
