<template>
  <div class="min-h-screen bg-black font-['Inter',sans-serif]">
    <!-- Top Navigation Bar -->
    <nav class="fixed top-0 left-0 right-0 bg-gradient-to-r from-[#9747FF] to-[#D946EF] h-[64px] flex items-center justify-between px-6 z-50">
      <!-- Logo -->
      <div class="flex items-center gap-2 cursor-pointer" @click="router.push('/home')">
        <img src="/logo.PNG" alt="MyArteLab" class="h-8 w-auto" />
      </div>

      <!-- Navigation Items -->
      <div class="flex items-center gap-8">
        <button
          @click="router.push('/home')"
          :class="[
            'flex items-center gap-2 text-white text-[14px] font-medium transition-all',
            currentPath === '/home' ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          ]"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          MyArteLab
        </button>

        <button
          @click="router.push('/discover')"
          :class="[
            'flex items-center gap-2 text-white text-[14px] font-medium transition-all',
            currentPath === '/discover' ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          ]"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Discover
        </button>

        <button
          @click="router.push(`/creator/${userId}`)"
          :class="[
            'flex items-center gap-2 text-white text-[14px] font-medium transition-all',
            currentPath.includes('/creator/') ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          ]"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Profile
        </button>

        <button
          @click="router.push('/book')"
          :class="[
            'flex items-center gap-2 text-white text-[14px] font-medium transition-all',
            currentPath.includes('/book') ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          ]"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Book Now
        </button>

        <button
          @click="router.push('/wallet')"
          :class="[
            'flex items-center gap-2 text-white text-[14px] font-medium transition-all',
            currentPath === '/wallet' ? 'opacity-100' : 'opacity-70 hover:opacity-100'
          ]"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Wallet
        </button>
      </div>
    </nav>

    <!-- Main Content Area -->
    <div class="pt-[64px] min-h-screen bg-black">
      <slot />
    </div>

    <!-- Logout Confirmation Modal -->
    <div
      v-if="showLogoutConfirmation"
      class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
      @click.self="showLogoutConfirmation = false"
    >
      <div class="bg-[#1a1a1a] rounded-[14px] p-8 max-w-[400px] w-full border border-[#333333]">
        <h3 class="text-[24px] font-semibold text-white text-center mb-2">Logout</h3>
        <p class="text-[15px] text-[#999999] text-center mb-8">Are you sure you want to logout?</p>

        <button
          @click="handleLogout"
          class="w-full h-[56px] bg-gradient-to-r from-[#9747FF] to-[#D946EF] rounded-[12px] text-white text-[15px] font-semibold hover:opacity-90 transition-all duration-200 flex items-center justify-center mb-3"
        >
          Yes, Logout
        </button>

        <button
          @click="showLogoutConfirmation = false"
          class="w-full h-[56px] border border-[#333333] rounded-[12px] text-[#999999] text-[15px] font-semibold hover:border-[#9747FF] hover:text-white transition-all duration-200 flex items-center justify-center"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// State
const userId = ref('1') // TODO: Get from auth store
const userRole = ref('creator') // TODO: Get from auth store
const showLogoutConfirmation = ref(false)

// Computed
const currentPath = computed(() => route.path)

// Methods
const handleLogout = () => {
  showLogoutConfirmation.value = false
  // TODO: Implement logout logic
  router.push('/email-signin')
}
</script>
