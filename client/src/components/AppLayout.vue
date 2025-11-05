<template>
  <div class="min-h-screen bg-neutral-50">
    <!-- Top Navigation Bar -->
    <nav class="fixed top-0 left-0 right-0 bg-white border-b border-neutral-200 h-[72px] flex items-center justify-between px-8 z-50 shadow-sm">
      <!-- Logo -->
      <div class="flex items-center gap-2 cursor-pointer" @click="router.push('/home')">
        <img src="/logo.PNG" alt="MyArteLab" class="h-10 w-auto" />
      </div>

      <!-- Navigation Items - Centered -->
      <div class="flex items-center gap-1">
        <button
          @click="router.push('/home')"
          :class="[
            'flex items-center gap-2 px-4 py-2 text-[15px] font-medium rounded-lg transition-all',
            currentPath === '/home'
              ? 'text-primary bg-primary/10'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          ]"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Home
        </button>

        <button
          @click="router.push('/discover')"
          :class="[
            'flex items-center gap-2 px-4 py-2 text-[15px] font-medium rounded-lg transition-all',
            currentPath === '/discover'
              ? 'text-primary bg-primary/10'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          ]"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Discover
        </button>

        <button
          @click="router.push('/bookings')"
          :class="[
            'flex items-center gap-2 px-4 py-2 text-[15px] font-medium rounded-lg transition-all',
            currentPath === '/bookings'
              ? 'text-primary bg-primary/10'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          ]"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Bookings
        </button>

        <button
          @click="router.push('/wallet')"
          :class="[
            'flex items-center gap-2 px-4 py-2 text-[15px] font-medium rounded-lg transition-all',
            currentPath === '/wallet'
              ? 'text-primary bg-primary/10'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          ]"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Wallet
        </button>

        <button
          @click="router.push(`/creator/${userId}`)"
          :class="[
            'flex items-center gap-2 px-4 py-2 text-[15px] font-medium rounded-lg transition-all',
            currentPath.includes('/creator/')
              ? 'text-primary bg-primary/10'
              : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
          ]"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Profile
        </button>
      </div>

      <!-- Right Actions -->
      <div class="flex items-center gap-3">
        <!-- Notification Bell -->
        <button class="relative p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span class="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
        </button>

        <!-- Profile Menu Button -->
        <button
          @click="showProfileMenu = !showProfileMenu"
          class="flex items-center gap-2 px-3 py-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-all"
        >
          <div class="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-sm font-semibold">
            {{ userInitials }}
          </div>
        </button>
      </div>
    </nav>

    <!-- Main Content Area -->
    <div class="pt-[72px] min-h-screen bg-neutral-50">
      <slot />
    </div>

    <!-- Profile Menu Dropdown -->
    <div
      v-if="showProfileMenu"
      class="fixed top-20 right-8 bg-white rounded-lg shadow-soft-lg border border-neutral-200 py-2 w-56 z-50"
    >
      <button
        @click="handleNavigation(`/creator/${userId}`)"
        class="w-full px-4 py-2.5 text-left text-neutral-700 hover:bg-neutral-50 transition-all flex items-center gap-3"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        My Profile
      </button>
      <button
        @click="handleNavigation('/settings')"
        class="w-full px-4 py-2.5 text-left text-neutral-700 hover:bg-neutral-50 transition-all flex items-center gap-3"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
      </button>
      <div class="my-1 border-t border-neutral-200"></div>
      <button
        @click="showLogoutConfirmation = true; showProfileMenu = false"
        class="w-full px-4 py-2.5 text-left text-error hover:bg-error/5 transition-all flex items-center gap-3"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Logout
      </button>
    </div>

    <!-- Logout Confirmation Modal -->
    <div
      v-if="showLogoutConfirmation"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="showLogoutConfirmation = false"
    >
      <div class="bg-white rounded-lg p-8 max-w-[400px] w-full shadow-soft-lg">
        <h3 class="text-h2 font-semibold text-neutral-900 text-center mb-2">Logout</h3>
        <p class="text-body text-neutral-600 text-center mb-8">Are you sure you want to logout?</p>

        <div class="flex gap-3">
          <button
            @click="handleLogout"
            class="flex-1 h-12 bg-primary rounded-lg text-white font-semibold hover:bg-primary-dark transition-all duration-200"
          >
            Yes, Logout
          </button>

          <button
            @click="showLogoutConfirmation = false"
            class="flex-1 h-12 border-2 border-neutral-300 rounded-lg text-neutral-700 font-semibold hover:border-primary hover:text-primary transition-all duration-200"
          >
            Cancel
          </button>
        </div>
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
const showProfileMenu = ref(false)
const userInitials = ref('EE') // TODO: Get from auth store

// Computed
const currentPath = computed(() => route.path)

// Methods
const handleLogout = () => {
  showLogoutConfirmation.value = false
  // TODO: Implement logout logic
  router.push('/email-signin')
}

const handleNavigation = (path) => {
  showProfileMenu.value = false
  router.push(path)
}
</script>
