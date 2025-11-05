<template>
  <div class="min-h-screen bg-black font-sans">
    <!-- Top Navigation Bar with Glass Effect -->
    <nav class="fixed top-0 left-0 right-0 glass-dark border-b border-white/10 h-[68px] flex items-center justify-center px-8 z-50 backdrop-blur-2xl animate-fade-in-down">
      <!-- Background gradient -->
      <div class="absolute inset-0 bg-gradient-to-r from-primary-600/20 via-transparent to-secondary-600/20 opacity-50"></div>

      <!-- Logo - Absolute positioned left -->
      <div class="absolute left-8 flex items-center gap-3 cursor-pointer group z-10" @click="router.push('/home')">
        <div class="relative">
          <img src="/logo.PNG" alt="MyArteLab" class="h-9 w-auto transition-transform duration-300 group-hover:scale-105" />
          <div class="absolute -inset-1 bg-gradient-to-r from-primary-600 to-secondary-600 rounded-full opacity-0 group-hover:opacity-20 blur transition-opacity duration-300 -z-10"></div>
        </div>
      </div>

      <!-- Navigation Items - Centered -->
      <div class="flex items-center gap-2 z-10">
        <button
          @click="router.push('/home')"
          :class="[
            'relative flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[14px] font-medium transition-all duration-300',
            currentPath === '/home'
              ? 'bg-white/10'
              : 'hover:bg-white/5'
          ]"
        >
          <!-- Active indicator -->
          <div v-if="currentPath === '/home'" class="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"></div>

          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span :class="currentPath === '/home' ? 'gradient-text font-semibold' : ''">Home</span>
        </button>

        <button
          @click="router.push('/discover')"
          :class="[
            'relative flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[14px] font-medium transition-all duration-300',
            currentPath === '/discover'
              ? 'bg-white/10'
              : 'hover:bg-white/5'
          ]"
        >
          <div v-if="currentPath === '/discover'" class="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"></div>

          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span :class="currentPath === '/discover' ? 'gradient-text font-semibold' : ''">Discover</span>
        </button>

        <button
          @click="router.push(`/creator/${userId}`)"
          :class="[
            'relative flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[14px] font-medium transition-all duration-300',
            currentPath.includes('/creator/')
              ? 'bg-white/10'
              : 'hover:bg-white/5'
          ]"
        >
          <div v-if="currentPath.includes('/creator/')" class="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"></div>

          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span :class="currentPath.includes('/creator/') ? 'gradient-text font-semibold' : ''">Profile</span>
        </button>

        <button
          @click="router.push('/book')"
          :class="[
            'relative flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[14px] font-medium transition-all duration-300',
            currentPath.includes('/book')
              ? 'bg-white/10'
              : 'hover:bg-white/5'
          ]"
        >
          <div v-if="currentPath.includes('/book')" class="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"></div>

          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span :class="currentPath.includes('/book') ? 'gradient-text font-semibold' : ''">Book</span>
        </button>

        <button
          @click="router.push('/wallet')"
          :class="[
            'relative flex items-center gap-2 px-4 py-2 rounded-lg text-white text-[14px] font-medium transition-all duration-300',
            currentPath === '/wallet'
              ? 'bg-white/10'
              : 'hover:bg-white/5'
          ]"
        >
          <div v-if="currentPath === '/wallet'" class="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/2 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full"></div>

          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span :class="currentPath === '/wallet' ? 'gradient-text font-semibold' : ''">Wallet</span>
        </button>
      </div>

      <!-- Right side - Notifications & User Menu -->
      <div class="absolute right-8 flex items-center gap-3 z-10">
        <!-- Notifications -->
        <button class="relative p-2 rounded-lg hover:bg-white/5 transition-all duration-300 group">
          <svg class="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <!-- Notification badge -->
          <span class="absolute top-1 right-1 w-2 h-2 bg-error-500 rounded-full animate-pulse-soft"></span>
        </button>

        <!-- User Avatar -->
        <button class="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-all duration-300 group">
          <div class="relative">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-white/20 group-hover:ring-primary-500/50 transition-all duration-300">
              U
            </div>
            <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success-500 rounded-full border-2 border-black"></div>
          </div>
        </button>
      </div>
    </nav>

    <!-- Main Content Area -->
    <div class="pt-[68px] min-h-screen bg-black">
      <slot />
    </div>

    <!-- Modern Logout Confirmation Modal -->
    <div
      v-if="showLogoutConfirmation"
      class="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in"
      @click.self="showLogoutConfirmation = false"
    >
      <div class="bg-dark-100 rounded-2xl p-8 max-w-[420px] w-full border border-dark-300 shadow-premium animate-scale-in">
        <div class="flex flex-col items-center mb-6">
          <div class="w-16 h-16 rounded-full bg-gradient-to-br from-error-600 to-error-500 flex items-center justify-center mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
          <h3 class="text-2xl font-bold text-white mb-2">Logout</h3>
          <p class="text-sm text-neutral-400 text-center">Are you sure you want to logout from your account?</p>
        </div>

        <div class="flex gap-3">
          <button
            @click="showLogoutConfirmation = false"
            class="flex-1 h-12 border-2 border-dark-300 rounded-lg text-neutral-300 text-sm font-semibold hover:border-primary-500 hover:text-white transition-all duration-200"
          >
            Cancel
          </button>

          <button
            @click="handleLogout"
            class="flex-1 h-12 bg-gradient-to-r from-error-600 to-error-500 rounded-lg text-white text-sm font-semibold hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Yes, Logout
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

// Computed
const currentPath = computed(() => route.path)

// Methods
const handleLogout = () => {
  showLogoutConfirmation.value = false
  // TODO: Implement logout logic
  router.push('/email-signin')
}
</script>
