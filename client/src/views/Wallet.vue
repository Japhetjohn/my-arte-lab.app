<template>
  <AppLayout>
    <div class="w-full px-8 py-8">
      <!-- Top Bar with Heading and Search -->
      <div class="flex items-center justify-between mb-8">
        <!-- Wallet Heading -->
        <h1 class="text-[48px] font-bold text-white">Wallet</h1>

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

      <!-- User Card -->
      <div
        class="flex items-center justify-between bg-[#1a1a1a] border border-[#333333] rounded-[14px] p-4 mb-8 cursor-pointer hover:border-[#9747FF] transition-all"
        @click="router.push('/creator/1')"
      >
        <div class="flex items-center gap-4">
          <!-- Dollar Icon -->
          <div class="w-12 h-12 rounded-full bg-[#3B82F6] flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <!-- User Name -->
          <span class="text-white text-[16px] font-medium">{{ userName }}</span>
        </div>
        <!-- Chevron -->
        <svg class="w-5 h-5 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>

      <!-- Action Buttons Grid -->
      <div class="grid grid-cols-2 gap-4 mb-12 max-w-[500px]">
        <!-- Deposit Button -->
        <button
          @click="handleDeposit"
          class="bg-[#9747FF] hover:bg-[#8637EF] rounded-[14px] p-6 flex flex-col items-center gap-3 transition-all"
        >
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <span class="text-white text-[14px] font-semibold">Deposit</span>
        </button>

        <!-- Withdraw Button -->
        <button
          @click="handleWithdraw"
          class="bg-[#9747FF] hover:bg-[#8637EF] rounded-[14px] p-6 flex flex-col items-center gap-3 transition-all"
        >
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          <span class="text-white text-[14px] font-semibold">Withdraw</span>
        </button>

        <!-- Swap Button -->
        <button
          @click="handleSwap"
          class="bg-[#6B21A8] hover:bg-[#581C87] rounded-[14px] p-6 flex flex-col items-center gap-3 transition-all"
        >
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          <span class="text-white text-[14px] font-semibold">Swap</span>
        </button>

        <!-- Earn Button -->
        <button
          @click="handleEarn"
          class="bg-[#6B21A8] hover:bg-[#581C87] rounded-[14px] p-6 flex flex-col items-center gap-3 transition-all"
        >
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span class="text-white text-[14px] font-semibold">Earn</span>
        </button>
      </div>

      <!-- Balance Display -->
      <div class="flex flex-col items-center py-12">
        <!-- MAL Logo -->
        <div class="w-[160px] h-[160px] rounded-full bg-gradient-to-br from-[#9747FF] to-[#D946EF] flex items-center justify-center mb-8 shadow-lg">
          <span class="text-white text-[56px] font-bold">MAL</span>
        </div>

        <!-- Balance Amount -->
        <p class="text-white text-[56px] font-bold">${{ balance.toLocaleString() }}</p>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'

const router = useRouter()

// State
const searchQuery = ref('')
const userName = ref('Ebuka Esiobu')
const balance = ref(440000)

// Methods
const handleDeposit = () => {
  console.log('Deposit clicked')
  // TODO: Implement deposit logic
}

const handleWithdraw = () => {
  console.log('Withdraw clicked')
  // TODO: Implement withdraw logic
}

const handleSwap = () => {
  console.log('Swap clicked')
  // TODO: Implement swap logic
}

const handleEarn = () => {
  console.log('Earn clicked')
  // TODO: Implement earn logic
}
</script>
