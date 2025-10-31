<template>
  <div class="min-h-screen bg-white font-['Inter',sans-serif]">
    <!-- Logo -->
    <div class="absolute top-4 left-4 sm:top-8 sm:left-8 z-10">
      <img src="/logo.PNG" alt="MyArteLab" class="h-8 sm:h-12 w-auto cursor-pointer" @click="router.push('/discover')" />
    </div>

    <!-- Wallet Balance (Top Right) -->
    <div class="absolute top-4 right-4 sm:top-8 sm:right-8 z-10">
      <button
        @click="router.push('/wallet')"
        class="h-[44px] px-4 bg-white border-[1.5px] border-[#E8E8E8] rounded-[12px] flex items-center gap-2 hover:border-[#9747FF] transition-all"
      >
        <svg class="w-5 h-5 text-[#9747FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <span class="text-[15px] font-semibold text-[#111111]">${{ walletBalance }}</span>
      </button>
    </div>

    <!-- Main Content -->
    <div class="w-full pt-20 sm:pt-24 pb-12 px-4 sm:px-8">
      <div class="max-w-[900px] mx-auto">

        <!-- Welcome Section -->
        <div class="text-center mb-8">
          <h1 class="text-[28px] font-semibold text-[#111111] mb-2">
            Creator Dashboard
          </h1>
          <p class="text-[15px] text-[#6B6B6B]">
            Manage your bookings, portfolio, and profile
          </p>
        </div>

        <div class="h-8"></div>

        <!-- Coming Soon Message -->
        <div class="bg-white border-[1.5px] border-[#E8E8E8] rounded-[14px] p-8 text-center">
          <div class="flex justify-center mb-4">
            <div class="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center">
              <svg class="w-8 h-8 text-[#9747FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
          </div>
          <h2 class="text-[20px] font-semibold text-[#111111] mb-2">Dashboard Coming Soon</h2>
          <p class="text-[15px] text-[#6B6B6B] mb-6">
            We're building an amazing dashboard experience for you. Meanwhile, you can browse creators and manage your profile.
          </p>

          <div class="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              @click="router.push('/discover')"
              class="h-[56px] px-8 bg-[#9747FF] rounded-[12px] text-white text-[15px] font-semibold hover:bg-[#8637EF] transition-all flex items-center justify-center"
            >
              Browse Creators
            </button>
            <button
              @click="router.push(`/creator/${userId}`)"
              class="h-[56px] px-8 border-[1.5px] border-[#9747FF] rounded-[12px] text-[#9747FF] text-[15px] font-semibold hover:bg-[#9747FF] hover:text-white transition-all flex items-center justify-center"
            >
              View My Profile
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// State
const walletBalance = ref(1250.00)
const userId = ref('1') // TODO: Get from auth store
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
