<template>
  <div class="min-h-screen bg-neutral-50">
    <!-- Top Navigation Bar -->
    <nav class="fixed top-0 left-0 right-0 bg-gradient-to-r from-primary to-secondary h-[64px] flex items-center justify-between px-6 z-50 shadow-soft">
      <!-- Logo -->
      <div class="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity" @click="router.push('/home')">
        <img src="/logo.PNG" alt="MyArteLab" class="h-8 w-auto" />
      </div>

      <!-- Navigation Items - Centered -->
      <div class="flex items-center gap-6">
        <button
          @click="router.push('/home')"
          :class="[
            'flex items-center gap-1.5 text-white text-sm font-medium transition-all px-3 py-2 rounded-md',
            currentPath === '/home' ? 'bg-white/20' : 'hover:bg-white/10'
          ]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </button>

        <button
          @click="router.push('/discover')"
          :class="[
            'flex items-center gap-1.5 text-white text-sm font-medium transition-all px-3 py-2 rounded-md',
            currentPath === '/discover' ? 'bg-white/20' : 'hover:bg-white/10'
          ]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Discover
        </button>

        <button
          @click="router.push('/bookings')"
          :class="[
            'flex items-center gap-1.5 text-white text-sm font-medium transition-all px-3 py-2 rounded-md',
            currentPath === '/bookings' ? 'bg-white/20' : 'hover:bg-white/10'
          ]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Bookings
        </button>

        <button
          @click="router.push('/wallet')"
          :class="[
            'flex items-center gap-1.5 text-white text-sm font-medium transition-all px-3 py-2 rounded-md',
            currentPath === '/wallet' ? 'bg-white/20' : 'hover:bg-white/10'
          ]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Wallet
        </button>

        <button
          @click="router.push(`/creator/${userId}`)"
          :class="[
            'flex items-center gap-1.5 text-white text-sm font-medium transition-all px-3 py-2 rounded-md',
            currentPath.includes('/creator/') ? 'bg-white/20' : 'hover:bg-white/10'
          ]"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Profile
        </button>
      </div>

      <!-- Right Side Actions -->
      <div class="flex items-center gap-3">
        <!-- Notifications -->
        <button
          class="relative p-2 text-white hover:bg-white/10 rounded-md transition-all"
          aria-label="Notifications"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span class="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
        </button>

        <!-- Logout -->
        <button
          @click="showLogoutConfirmation = true"
          class="px-3 py-1.5 text-white text-sm font-medium hover:bg-white/10 rounded-md transition-all"
          aria-label="Logout"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </nav>

    <!-- Main Content Area -->
    <div class="pt-[64px] min-h-screen bg-neutral-50">
      <slot />
    </div>

    <!-- Logout Confirmation Modal -->
    <div
      v-if="showLogoutConfirmation"
      class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in"
      @click.self="showLogoutConfirmation = false"
    >
      <div class="bg-white rounded-md p-8 max-w-md w-full shadow-soft-lg animate-scale-in">
        <h3 class="text-h2 font-semibold text-neutral-900 text-center mb-2">Confirm logout</h3>
        <p class="text-body text-neutral-600 text-center mb-8">Are you sure you want to logout?</p>

        <button
          @click="handleLogout"
          class="w-full h-11 bg-gradient-to-r from-primary to-secondary rounded-md text-white text-base font-semibold hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center mb-3 shadow-soft"
        >
          Yes, logout
        </button>

        <button
          @click="showLogoutConfirmation = false"
          class="w-full h-11 border-2 border-neutral-300 rounded-md text-neutral-700 text-base font-semibold hover:border-primary hover:text-primary transition-all duration-200 flex items-center justify-center"
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
