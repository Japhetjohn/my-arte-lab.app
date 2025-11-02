<template>
  <AppLayout>
    <div class="w-full px-8 py-8">
      <!-- Top Bar with MyArteLab Title, Search, and Add Button -->
      <div class="flex items-center justify-between mb-8">
        <!-- MyArteLab Title -->
        <h1 class="text-[48px] font-bold text-white">MyArteLab</h1>

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

          <!-- Add Button -->
          <button
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

      <!-- Portfolio Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="item in filteredPortfolio"
          :key="item.id"
          class="group cursor-pointer"
          @click="viewPortfolioItem(item)"
        >
          <!-- Image Card -->
          <div class="relative rounded-[14px] overflow-hidden mb-3" :style="{ height: item.height + 'px' }">
            <!-- Image -->
            <img
              v-if="item.image"
              :src="item.image"
              :alt="item.title"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <!-- Placeholder if no image -->
            <div v-else class="w-full h-full bg-gradient-to-br from-[#9747FF] to-[#D946EF] flex items-center justify-center">
              <span class="text-white text-[48px] font-bold">{{ item.title.charAt(0) }}</span>
            </div>

            <!-- Category Badge Overlay (bottom-left) -->
            <div class="absolute bottom-4 left-4 z-10">
              <span class="inline-block px-3 py-1 bg-[#9747FF] text-white text-[10px] font-bold uppercase tracking-wider rounded-[6px]">
                {{ item.category }}
              </span>
            </div>

            <!-- Overlay on hover -->
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300"></div>
          </div>

          <!-- Interaction Buttons -->
          <div class="flex items-center gap-3 mb-3">
            <button class="text-[#9747FF] hover:text-[#D946EF] transition-all" @click.stop="handleLike(item.id)">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
              </svg>
            </button>
            <button class="text-[#9747FF] hover:text-[#D946EF] transition-all" @click.stop="handleComment(item.id)">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            <button class="text-[#9747FF] hover:text-[#D946EF] transition-all" @click.stop="handleShare(item.id)">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>

          <!-- Title and Creator -->
          <h3 class="text-white text-[16px] font-semibold mb-1">{{ item.title }}</h3>
          <p class="text-[#999999] text-[14px]">{{ item.creator }}</p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredPortfolio.length === 0" class="flex flex-col items-center justify-center py-16">
        <div class="w-16 h-16 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-4">
          <svg class="w-8 h-8 text-[#666666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2.828 0 012.828 0L16 16m-2-2l1.586-1.586a2 2.828 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p class="text-[15px] text-[#999999] mb-4">No portfolio items found</p>
        <button
          @click="showAddModal = true"
          class="h-[44px] px-6 bg-gradient-to-r from-[#9747FF] to-[#D946EF] rounded-[12px] text-white text-[15px] font-semibold hover:opacity-90 transition-all"
        >
          Add Your First Item
        </button>
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
          <h3 class="text-[24px] font-semibold text-white">Add Portfolio Item</h3>
          <button @click="showAddModal = false" class="text-[#666666] hover:text-white transition-all">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Form Fields -->
        <div class="space-y-4">
          <div>
            <label class="text-white text-[14px] mb-2 block">Title</label>
            <input
              type="text"
              v-model="addForm.title"
              placeholder="e.g., Wedding Catalog"
              class="w-full h-[48px] px-4 bg-[#0a0a0a] border border-[#333333] rounded-[12px] text-white text-[14px] placeholder-[#666666] focus:outline-none focus:border-[#9747FF] transition-all"
            />
          </div>

          <div>
            <label class="text-white text-[14px] mb-2 block">Category</label>
            <select
              v-model="addForm.category"
              class="w-full h-[48px] px-4 bg-[#0a0a0a] border border-[#333333] rounded-[12px] text-white text-[14px] focus:outline-none focus:border-[#9747FF] transition-all"
            >
              <option value="">Select category</option>
              <option value="PORTFOLIO">Portfolio</option>
              <option value="WEDDING CATALOG">Wedding Catalog</option>
              <option value="LATEST EP DESIGN">Latest EP Design</option>
              <option value="JAMESON HONS">Jameson Hons</option>
              <option value="FOOD PHOTOS">Food Photos</option>
              <option value="GRAPHICS">Graphics</option>
              <option value="DESIGNS">Designs</option>
            </select>
          </div>

          <div>
            <label class="text-white text-[14px] mb-2 block">Creator Name</label>
            <input
              type="text"
              v-model="addForm.creator"
              placeholder="Your name or studio name"
              class="w-full h-[48px] px-4 bg-[#0a0a0a] border border-[#333333] rounded-[12px] text-white text-[14px] placeholder-[#666666] focus:outline-none focus:border-[#9747FF] transition-all"
            />
          </div>

          <div>
            <label class="text-white text-[14px] mb-2 block">Image</label>
            <div class="w-full h-[48px] px-4 bg-[#0a0a0a] border border-[#333333] rounded-[12px] flex items-center text-[#666666] text-[14px] cursor-pointer hover:border-[#9747FF] transition-all">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2.828 0 012.828 0L16 16m-2-2l1.586-1.586a2 2.828 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Choose an image...
            </div>
          </div>

          <div>
            <label class="text-white text-[14px] mb-2 block">Description (Optional)</label>
            <textarea
              v-model="addForm.description"
              rows="3"
              placeholder="Brief description of this work..."
              class="w-full px-4 py-3 bg-[#0a0a0a] border border-[#333333] rounded-[12px] text-white text-[14px] placeholder-[#666666] focus:outline-none focus:border-[#9747FF] transition-all resize-none"
            ></textarea>
          </div>
        </div>

        <!-- Buttons -->
        <div class="flex gap-3 mt-8">
          <button
            @click="handleAddItem"
            class="flex-1 h-[48px] bg-gradient-to-r from-[#9747FF] to-[#D946EF] text-white text-[15px] font-semibold rounded-[12px] hover:opacity-90 transition-all"
          >
            Add Item
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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'

const router = useRouter()

// State
const searchQuery = ref('')
const showAddModal = ref(false)

const addForm = ref({
  title: '',
  category: '',
  creator: '',
  description: ''
})

// Mock portfolio data matching Glide screenshots
const portfolio = ref([
  {
    id: 1,
    title: '25/10/2025, 0:04:00',
    category: 'PORTFOLIO',
    creator: 'Godis Designs',
    image: 'https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800&q=80',
    height: 380
  },
  {
    id: 2,
    title: 'Wedding Catalog',
    category: 'WEDDING CATALOG',
    creator: 'Laboss Media',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
    height: 340
  },
  {
    id: 3,
    title: 'Latest EP Design',
    category: 'LATEST EP DESIGN',
    creator: 'Weyinmi Esiobu',
    image: 'https://images.unsplash.com/photo-1614854262318-831574f15f1f?w=800&q=80',
    height: 380
  },
  {
    id: 4,
    title: 'Jameson Hons Event',
    category: 'JAMESON HONS',
    creator: 'Nathan Dore',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    height: 360
  },
  {
    id: 5,
    title: 'Food Photography',
    category: 'FOOD PHOTOS',
    creator: 'StarLight',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    height: 320
  }
])

// Computed
const filteredPortfolio = computed(() => {
  if (!searchQuery.value) {
    return portfolio.value
  }

  const query = searchQuery.value.toLowerCase()
  return portfolio.value.filter(item =>
    item.title.toLowerCase().includes(query) ||
    item.category.toLowerCase().includes(query) ||
    item.creator.toLowerCase().includes(query)
  )
})

// Methods
const viewPortfolioItem = (item) => {
  console.log('Viewing portfolio item:', item)
  // TODO: Navigate to portfolio detail page
  // router.push(`/portfolio/${item.id}`)
}

const handleAddItem = () => {
  console.log('Adding item:', addForm.value)
  // TODO: Save to database

  // Add to local array for now
  portfolio.value.unshift({
    id: Date.now(),
    title: addForm.value.title,
    category: addForm.value.category,
    creator: addForm.value.creator,
    image: null,
    height: 360
  })

  // Reset form and close modal
  addForm.value = {
    title: '',
    category: '',
    creator: '',
    description: ''
  }
  showAddModal.value = false
}

const handleLike = (itemId) => {
  console.log('Liked item:', itemId)
  // TODO: Implement like functionality
}

const handleComment = (itemId) => {
  console.log('Comment on item:', itemId)
  // TODO: Implement comment functionality
}

const handleShare = (itemId) => {
  console.log('Share item:', itemId)
  // TODO: Implement share functionality
}
</script>
