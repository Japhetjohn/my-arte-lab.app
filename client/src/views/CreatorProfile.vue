<template>
  <AppLayout>
    <div class="w-full px-8 py-8">
      <!-- Top Bar with Back Button, Search, and Actions -->
      <div class="flex items-center justify-between mb-8">
        <!-- Back Button -->
        <button
          @click="router.back()"
          class="flex items-center gap-2 text-[#999999] hover:text-white transition-all"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span class="text-[14px]">Profile /</span>
        </button>

        <!-- Right Actions -->
        <div class="flex items-center gap-4">
          <!-- Search Bar -->
          <div class="w-[280px]">
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

          <!-- Edit Button -->
          <button
            v-if="isOwner"
            @click="showEditModal = true"
            class="px-6 py-2 bg-gradient-to-r from-[#9747FF] to-[#D946EF] text-white text-[14px] font-semibold rounded-[12px] hover:opacity-90 transition-all flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>

          <!-- Add Button -->
          <button
            v-if="isOwner"
            @click="showAddModal = true"
            class="px-6 py-2 bg-gradient-to-r from-[#9747FF] to-[#D946EF] text-white text-[14px] font-semibold rounded-[12px] hover:opacity-90 transition-all flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add
          </button>
        </div>
      </div>

      <!-- Profile Content -->
      <div class="flex gap-8">
        <!-- Featured Work/Portfolio Image -->
        <div class="w-[400px] h-[500px] rounded-[14px] overflow-hidden relative group cursor-pointer">
          <img
            v-if="creatorData.featuredWork"
            :src="creatorData.featuredWork"
            alt="Featured Work"
            class="w-full h-full object-cover"
          />
          <div v-else class="w-full h-full bg-gradient-to-br from-[#9747FF] to-[#D946EF] flex items-center justify-center">
            <span class="text-white text-[80px] font-bold">{{ creatorData.name?.charAt(0).toUpperCase() }}</span>
          </div>

          <!-- Work Title Overlay -->
          <div class="absolute top-4 left-4">
            <p class="text-[#FFD700] text-[28px] font-bold uppercase tracking-wider" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8);">
              {{ creatorData.workTitle || 'MEET COLU' }}
            </p>
          </div>
        </div>

        <!-- Profile Info -->
        <div class="flex-1">
          <!-- Location Badge -->
          <div class="mb-4">
            <span class="inline-block px-4 py-2 bg-[#9747FF] text-white text-[12px] font-bold uppercase tracking-wider rounded-[8px]">
              {{ creatorData.location || 'LAGOS' }}
            </span>
          </div>

          <!-- Name -->
          <h1 class="text-[48px] font-bold text-white mb-2">
            {{ creatorData.name || 'Ebuka' }}
          </h1>

          <!-- Role/Category -->
          <p class="text-[#999999] text-[20px] mb-8">
            {{ creatorData.category || 'Creative' }}
          </p>

          <!-- Bio -->
          <p class="text-[#CCCCCC] text-[15px] leading-relaxed mb-8">
            {{ creatorData.bio || 'Passionate creator specializing in bringing visions to life through art and design.' }}
          </p>

          <!-- Stats -->
          <div class="flex gap-8 mb-8">
            <div>
              <p class="text-[#666666] text-[13px] mb-1">Rating</p>
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
              <p class="text-[#666666] text-[13px] mb-1">Projects</p>
              <p class="text-white text-[20px] font-semibold">{{ creatorData.projectCount || 47 }}</p>
            </div>

            <div>
              <p class="text-[#666666] text-[13px] mb-1">Availability</p>
              <p :class="creatorData.available ? 'text-[#9747FF]' : 'text-[#666666]'" class="text-[14px] font-bold uppercase">
                {{ creatorData.available ? 'AVAILABLE' : 'BOOKED' }}
              </p>
            </div>
          </div>

          <!-- Action Buttons -->
          <div v-if="!isOwner" class="flex gap-3">
            <button
              @click="bookCreator"
              class="px-8 py-4 bg-gradient-to-r from-[#9747FF] to-[#D946EF] text-white text-[15px] font-semibold rounded-[12px] hover:opacity-90 transition-all"
            >
              Book Now
            </button>
            <button
              class="px-8 py-4 border border-[#333333] text-white text-[15px] font-semibold rounded-[12px] hover:border-[#9747FF] transition-all"
            >
              Message
            </button>
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
          <div>
            <label class="text-white text-[14px] mb-2 block">Name</label>
            <input
              type="text"
              v-model="addForm.name"
              class="w-full h-[48px] px-4 bg-[#0a0a0a] border border-[#333333] rounded-[12px] text-white text-[14px] focus:outline-none focus:border-[#9747FF] transition-all"
            />
          </div>

          <div>
            <label class="text-white text-[14px] mb-2 block">Name</label>
            <input
              type="text"
              v-model="addForm.name2"
              class="w-full h-[48px] px-4 bg-[#0a0a0a] border border-[#333333] rounded-[12px] text-white text-[14px] focus:outline-none focus:border-[#9747FF] transition-all"
            />
          </div>

          <div>
            <label class="text-white text-[14px] mb-2 block">Username</label>
            <input
              type="text"
              v-model="addForm.username"
              class="w-full h-[48px] px-4 bg-[#0a0a0a] border border-[#333333] rounded-[12px] text-white text-[14px] focus:outline-none focus:border-[#9747FF] transition-all"
            />
          </div>

          <div>
            <label class="text-white text-[14px] mb-2 block">Profile Image</label>
            <div class="w-full h-[48px] px-4 bg-[#0a0a0a] border border-[#333333] rounded-[12px] flex items-center text-[#666666] text-[14px] cursor-pointer hover:border-[#9747FF] transition-all">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Choose an image...
            </div>
          </div>

          <div>
            <label class="text-white text-[14px] mb-2 block">Bio</label>
            <textarea
              v-model="addForm.bio"
              rows="3"
              class="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333333] rounded-[12px] text-white text-[14px] focus:outline-none focus:border-[#9747FF] transition-all resize-none"
            ></textarea>
          </div>

          <div>
            <label class="text-white text-[14px] mb-2 block">Location</label>
            <input
              type="text"
              v-model="addForm.location"
              class="w-full h-[48px] px-4 bg-[#0a0a0a] border border-[#333333] rounded-[12px] text-white text-[14px] focus:outline-none focus:border-[#9747FF] transition-all"
            />
          </div>
        </div>

        <!-- Buttons -->
        <div class="flex gap-3 mt-8">
          <button
            @click="handleSubmit"
            class="flex-1 h-[48px] bg-gradient-to-r from-[#9747FF] to-[#D946EF] text-white text-[15px] font-semibold rounded-[12px] hover:opacity-90 transition-all"
          >
            Submit
          </button>
          <button
            @click="showAddModal = false"
            class="flex-1 h-[48px] border border-[#333333] text-[#999999] text-[15px] font-semibold rounded-[12px] hover:border-[#9747FF] hover:text-white transition-all"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'

const router = useRouter()
const route = useRoute()

// State
const searchQuery = ref('')
const showAddModal = ref(false)
const showEditModal = ref(false)
const isOwner = ref(true) // TODO: Check if logged-in user owns this profile

const addForm = ref({
  name: '',
  name2: '',
  username: '',
  bio: '',
  location: ''
})

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
  featuredWork: null
})

// Methods
const bookCreator = () => {
  router.push('/book')
}

const handleSubmit = () => {
  console.log('Form submitted:', addForm.value)
  showAddModal.value = false
  // TODO: Save form data
}
</script>
