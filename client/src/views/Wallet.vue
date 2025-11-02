<template>
  <AppLayout>
    <div class="w-full px-8 py-8">
      <!-- Top Bar with Heading and Search -->
      <div class="flex items-center justify-between mb-8">
        <!-- Wallet Heading -->
        <h1 class="text-[48px] font-bold text-white">Wallet</h1>

        <!-- Search Bar -->
        <div class="w-[320px]">
          <Input
            v-model="searchQuery"
            type="text"
            placeholder="Search transactions..."
          >
            <template #iconLeft>
              <svg class="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </template>
          </Input>
        </div>
      </div>

      <!-- User Card -->
      <Card
        variant="bordered"
        hoverable
        clickable
        padding="md"
        class="mb-8"
        @click="router.push('/creator/1')"
      >
        <div class="flex items-center justify-between">
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
      </Card>

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

      <!-- Transaction History Section -->
      <div class="mt-12">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-[28px] font-bold text-white">Recent Transactions</h2>
          <Select
            v-model="transactionFilter"
            placeholder="All Transactions"
            :options="filterOptions"
            class="w-[200px]"
          />
        </div>

        <!-- Transaction List -->
        <div v-if="filteredTransactions.length > 0" class="space-y-4">
          <Card
            v-for="transaction in filteredTransactions"
            :key="transaction.id"
            variant="bordered"
            padding="md"
            hoverable
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-4">
                <!-- Transaction Icon -->
                <div
                  :class="[
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    transaction.type === 'deposit' ? 'bg-success/20' :
                    transaction.type === 'withdraw' ? 'bg-error/20' :
                    'bg-primary/20'
                  ]"
                >
                  <svg
                    :class="[
                      'w-6 h-6',
                      transaction.type === 'deposit' ? 'text-success' :
                      transaction.type === 'withdraw' ? 'text-error' :
                      'text-primary'
                    ]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      v-if="transaction.type === 'deposit'"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                    <path
                      v-else-if="transaction.type === 'withdraw'"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                    <path
                      v-else
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                    />
                  </svg>
                </div>

                <!-- Transaction Details -->
                <div>
                  <h3 class="text-white font-semibold mb-1">{{ transaction.title }}</h3>
                  <div class="flex items-center gap-2">
                    <Badge
                      :variant="getTransactionStatusVariant(transaction.status)"
                      size="sm"
                    >
                      {{ transaction.status }}
                    </Badge>
                    <span class="text-neutral-400 text-sm">{{ transaction.date }}</span>
                  </div>
                </div>
              </div>

              <!-- Transaction Amount -->
              <div class="text-right">
                <p
                  :class="[
                    'text-[20px] font-bold',
                    transaction.type === 'deposit' ? 'text-success' :
                    transaction.type === 'withdraw' ? 'text-error' :
                    'text-white'
                  ]"
                >
                  {{ transaction.type === 'deposit' ? '+' : '-' }}${{ transaction.amount.toLocaleString() }}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <!-- Empty State for Transactions -->
        <div v-else class="flex justify-center py-12">
          <EmptyState
            icon="file"
            title="No transactions found"
            description="Your transaction history will appear here"
            size="sm"
          />
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import Input from '../components/design-system/Input.vue'
import Select from '../components/design-system/Select.vue'
import Card from '../components/design-system/Card.vue'
import Badge from '../components/design-system/Badge.vue'
import EmptyState from '../components/design-system/EmptyState.vue'

const router = useRouter()

// State
const searchQuery = ref('')
const userName = ref('Ebuka Esiobu')
const balance = ref(440000)
const transactionFilter = ref('')

// Filter options
const filterOptions = [
  { label: 'Deposits', value: 'deposit' },
  { label: 'Withdrawals', value: 'withdraw' },
  { label: 'Swaps', value: 'swap' },
  { label: 'Completed', value: 'Completed' },
  { label: 'Pending', value: 'Pending' }
]

// Mock transaction data
const transactions = ref([
  {
    id: 1,
    title: 'Deposit from Bank Account',
    type: 'deposit',
    amount: 50000,
    status: 'Completed',
    date: '2 hours ago'
  },
  {
    id: 2,
    title: 'Withdrawal to Bank',
    type: 'withdraw',
    amount: 25000,
    status: 'Pending',
    date: '1 day ago'
  },
  {
    id: 3,
    title: 'Payment Received - Wedding Shoot',
    type: 'deposit',
    amount: 120000,
    status: 'Completed',
    date: '3 days ago'
  },
  {
    id: 4,
    title: 'Swap USDT to NGN',
    type: 'swap',
    amount: 75000,
    status: 'Completed',
    date: '1 week ago'
  },
  {
    id: 5,
    title: 'Equipment Purchase',
    type: 'withdraw',
    amount: 85000,
    status: 'Completed',
    date: '2 weeks ago'
  }
])

// Computed
const filteredTransactions = computed(() => {
  let result = transactions.value

  // Apply transaction filter
  if (transactionFilter.value) {
    // Check if filter is a type or status
    if (['deposit', 'withdraw', 'swap'].includes(transactionFilter.value)) {
      result = result.filter(t => t.type === transactionFilter.value)
    } else {
      result = result.filter(t => t.status === transactionFilter.value)
    }
  }

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.status.toLowerCase().includes(query)
    )
  }

  return result
})

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

const getTransactionStatusVariant = (status) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'success'
    case 'pending':
      return 'warning'
    case 'failed':
      return 'error'
    default:
      return 'default'
  }
}
</script>
