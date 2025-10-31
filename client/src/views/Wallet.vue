<template>
  <div class="min-h-screen bg-white font-['Inter',sans-serif]">
    <!-- Logo -->
    <div class="absolute top-4 left-4 sm:top-8 sm:left-8 z-10">
      <img src="/logo.PNG" alt="MyArteLab" class="h-8 sm:h-12 w-auto cursor-pointer" @click="router.push('/discover')" />
    </div>

    <!-- Main Content -->
    <div class="w-full pt-20 sm:pt-24 pb-12 px-4 sm:px-8">
      <div class="max-w-[640px] mx-auto">

        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-[28px] font-semibold text-[#111111] mb-2 font-['Inter',sans-serif]">
            Wallet
          </h1>
          <p class="text-[15px] text-[#6B6B6B]">
            Manage your balance and transactions
          </p>
        </div>

        <div class="h-8"></div>

        <!-- Balance Card -->
        <div class="bg-white border-[1.5px] border-[#E8E8E8] rounded-[14px] p-6 sm:p-8">

          <!-- Available Balance -->
          <div class="text-center">
            <p class="text-[13px] text-[#6B6B6B] mb-2">Available Balance</p>
            <p class="text-[42px] font-bold text-[#111111]">${{ availableBalance.toFixed(2) }}</p>
          </div>

          <div class="h-8"></div>

          <!-- Pending Balance -->
          <div class="text-center pb-6 border-b-[1.5px] border-[#E8E8E8]">
            <p class="text-[13px] text-[#6B6B6B] mb-1">Pending Balance</p>
            <p class="text-[24px] font-semibold text-[#6B6B6B]">${{ pendingBalance.toFixed(2) }}</p>
          </div>

          <div class="h-6"></div>

          <!-- Withdraw Button -->
          <button
            v-if="availableBalance > 0"
            @click="showWithdrawModal = true"
            class="w-full h-[56px] bg-[#9747FF] rounded-[12px] text-white text-[15px] font-semibold hover:bg-[#8637EF] transition-all duration-200 flex items-center justify-center"
          >
            Withdraw Funds
          </button>

        </div>

        <div class="h-8"></div>

        <!-- Transactions Card -->
        <div class="bg-white border-[1.5px] border-[#E8E8E8] rounded-[14px] p-6 sm:p-8">
          <h2 class="text-[20px] font-semibold text-[#111111] mb-6">Recent Transactions</h2>

          <!-- Transaction Item -->
          <div
            v-for="(transaction, index) in transactions"
            :key="transaction.id"
          >
            <div class="flex items-center justify-between py-4">
              <div>
                <p class="text-[15px] text-[#111111] font-medium">{{ transaction.description }}</p>
                <p class="text-[13px] text-[#ACACAC] mt-1">{{ transaction.date }}</p>
              </div>
              <p
                class="text-[18px] font-semibold"
                :class="transaction.type === 'credit' ? 'text-[#111111]' : 'text-[#6B6B6B]'"
              >
                {{ transaction.type === 'credit' ? '+' : '-' }}${{ transaction.amount.toFixed(2) }}
              </p>
            </div>
            <div v-if="index < transactions.length - 1" class="border-b-[1.5px] border-[#E8E8E8]"></div>
          </div>

          <!-- Empty State -->
          <div v-if="transactions.length === 0" class="text-center py-12">
            <p class="text-[15px] text-[#6B6B6B]">No transactions yet</p>
          </div>

        </div>

      </div>
    </div>

    <!-- Withdraw Modal -->
    <div
      v-if="showWithdrawModal"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      @click.self="showWithdrawModal = false"
    >
      <div class="bg-white rounded-[14px] p-8 max-w-[500px] w-full">

        <h3 class="text-[24px] font-semibold text-[#111111] text-center mb-2">Withdraw Funds</h3>
        <p class="text-[15px] text-[#6B6B6B] text-center">Enter the amount you wish to withdraw</p>

        <div class="h-8"></div>

        <!-- Amount Input -->
        <div>
          <label class="sr-only">Amount</label>
          <div class="relative">
            <span class="absolute left-5 top-1/2 -translate-y-1/2 text-[#6B6B6B] text-[15px]">$</span>
            <input
              v-model="withdrawAmount"
              type="number"
              step="0.01"
              :max="availableBalance"
              placeholder="0.00"
              class="w-full h-[56px] pl-8 pr-5 border-[1.5px] border-[#E8E8E8] rounded-[12px] bg-transparent placeholder-[#ACACAC] text-[#111111] text-[15px] focus:outline-none focus:border-2 focus:border-[#9747FF] focus:shadow-[0_6px_20px_rgba(151,71,255,0.18)] transition-all duration-200"
            />
          </div>
          <p class="text-[13px] text-[#ACACAC] mt-2">Available: ${{ availableBalance.toFixed(2) }}</p>
        </div>

        <div class="h-8"></div>

        <!-- Buttons -->
        <button
          @click="processWithdraw"
          :disabled="!withdrawAmount || withdrawAmount > availableBalance || withdrawLoading"
          class="w-full h-[56px] bg-[#9747FF] rounded-[12px] text-white text-[15px] font-semibold hover:bg-[#8637EF] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {{ withdrawLoading ? 'Processing...' : 'Confirm Withdrawal' }}
        </button>

        <div class="h-4"></div>

        <button
          @click="showWithdrawModal = false"
          class="w-full h-[56px] border-[1.5px] border-[#E8E8E8] rounded-[12px] text-[#6B6B6B] text-[15px] font-semibold hover:border-[#9747FF] hover:text-[#9747FF] transition-all duration-200 flex items-center justify-center"
        >
          Cancel
        </button>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// State
const availableBalance = ref(1250.00)
const pendingBalance = ref(350.00)
const showWithdrawModal = ref(false)
const withdrawAmount = ref('')
const withdrawLoading = ref(false)

// Mock transactions
const transactions = ref([
  {
    id: 1,
    type: 'credit',
    description: 'Payment from Sarah Williams',
    date: 'Oct 28, 2025',
    amount: 450.00
  },
  {
    id: 2,
    type: 'debit',
    description: 'Withdrawal to bank',
    date: 'Oct 25, 2025',
    amount: 200.00
  },
  {
    id: 3,
    type: 'credit',
    description: 'Payment from Michael Chen',
    date: 'Oct 22, 2025',
    amount: 600.00
  },
  {
    id: 4,
    type: 'credit',
    description: 'Payment from Amara Okafor',
    date: 'Oct 20, 2025',
    amount: 400.00
  }
])

// Methods
const processWithdraw = () => {
  withdrawLoading.value = true

  setTimeout(() => {
    availableBalance.value -= parseFloat(withdrawAmount.value)
    transactions.value.unshift({
      id: Date.now(),
      type: 'debit',
      description: 'Withdrawal to bank',
      date: 'Today',
      amount: parseFloat(withdrawAmount.value)
    })

    withdrawLoading.value = false
    showWithdrawModal.value = false
    withdrawAmount.value = ''
  }, 1500)
}
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
