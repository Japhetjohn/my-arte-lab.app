<template>
  <div class="min-h-screen bg-white font-['Inter',sans-serif]">
    <!-- Sidebar -->
    <div class="w-[240px] border-r-[1.5px] border-[#E8E8E8] min-h-screen flex flex-col fixed left-0 top-0 bottom-0 bg-white z-40">
      <!-- Logo -->
      <div class="p-6 border-b-[1.5px] border-[#E8E8E8]">
        <img src="/logo.PNG" alt="MyArteLab" class="h-8 w-auto cursor-pointer" @click="router.push('/discover')" />
      </div>

      <div class="h-6"></div>

      <!-- Navigation -->
      <nav class="flex-1 px-4">
        <button
          @click="router.push('/discover')"
          :class="[
            'w-full h-[48px] px-4 rounded-[12px] flex items-center gap-3 text-[15px] font-medium transition-all mb-2',
            currentPath === '/discover' ? 'bg-[#F5F5F5] text-[#9747FF]' : 'text-[#6B6B6B] hover:bg-[#F5F5F5]'
          ]"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </button>

        <button
          v-if="userRole === 'creator'"
          @click="router.push(`/creator/${userId}`)"
          :class="[
            'w-full h-[48px] px-4 rounded-[12px] flex items-center gap-3 text-[15px] font-medium transition-all mb-2',
            currentPath.includes('/creator/') ? 'bg-[#F5F5F5] text-[#9747FF]' : 'text-[#6B6B6B] hover:bg-[#F5F5F5]'
          ]"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          My Profile
        </button>

        <button
          @click="router.push('/wallet')"
          :class="[
            'w-full h-[48px] px-4 rounded-[12px] flex items-center gap-3 text-[15px] font-medium transition-all mb-2',
            currentPath === '/wallet' ? 'bg-[#F5F5F5] text-[#9747FF]' : 'text-[#6B6B6B] hover:bg-[#F5F5F5]'
          ]"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Wallet
        </button>
      </nav>

      <div class="h-6"></div>

      <!-- Logout at bottom -->
      <div class="p-4 border-t-[1.5px] border-[#E8E8E8]">
        <button
          @click="showLogoutConfirmation = true"
          class="w-full h-[48px] px-4 rounded-[12px] flex items-center gap-3 text-[15px] font-medium text-[#6B6B6B] hover:bg-[#F5F5F5] transition-all"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </div>

    <!-- Main Content Area (with left padding to account for sidebar) -->
    <div class="pl-[240px] min-h-screen bg-white">
      <slot />
    </div>

    <!-- Logout Confirmation Modal -->
    <div
      v-if="showLogoutConfirmation"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="showLogoutConfirmation = false"
    >
      <div class="bg-white rounded-[14px] p-8 max-w-[400px] w-full">
        <h3 class="text-[24px] font-semibold text-[#111111] text-center mb-2">Logout</h3>
        <p class="text-[15px] text-[#6B6B6B] text-center mb-8">Are you sure you want to logout?</p>

        <button
          @click="handleLogout"
          class="w-full h-[56px] bg-[#9747FF] rounded-[12px] text-white text-[15px] font-semibold hover:bg-[#8637EF] transition-all duration-200 flex items-center justify-center mb-3"
        >
          Yes, Logout
        </button>

        <button
          @click="showLogoutConfirmation = false"
          class="w-full h-[56px] border-[1.5px] border-[#E8E8E8] rounded-[12px] text-[#6B6B6B] text-[15px] font-semibold hover:border-[#9747FF] hover:text-[#9747FF] transition-all duration-200 flex items-center justify-center"
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
