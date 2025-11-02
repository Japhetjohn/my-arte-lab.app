<template>
  <AppLayout>
    <div class="w-full min-h-screen bg-black">
      <!-- Centered Title Header -->
      <div class="flex items-center justify-center py-12">
        <h1 class="text-[64px] font-bold text-white">MyArteLab</h1>
      </div>

      <!-- Portfolio Grid - 3 columns with equal widths -->
      <div class="w-full px-12 pb-20">
        <div class="grid grid-cols-3 gap-8 max-w-[1600px] mx-auto">
          <!-- Portfolio Item 1 -->
          <div class="flex flex-col">
            <div class="relative rounded-[14px] overflow-hidden mb-3" style="height: 380px;">
              <img
                src="/screenshot.png"
                alt="Portfolio"
                class="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
              />
              <div class="absolute bottom-4 left-4">
                <Badge variant="primary" size="sm">PORTFOLIO</Badge>
              </div>
            </div>
            <div class="flex items-center gap-3 mb-2">
              <button class="text-[#9747FF] hover:text-[#D946EF] transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>
              <button class="text-[#9747FF] hover:text-[#D946EF] transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              <button class="text-[#9747FF] hover:text-[#D946EF] transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
            <h3 class="text-white text-[16px] font-semibold mb-1">25/10/2025, 0:04:00</h3>
            <p class="text-[#999999] text-[14px]">Godis Designs</p>
          </div>

          <!-- Portfolio Item 2 -->
          <div class="flex flex-col">
            <div class="relative rounded-[14px] overflow-hidden mb-3" style="height: 340px;">
              <img
                src="/screenshot.png"
                alt="Wedding Catalog"
                class="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
              />
              <div class="absolute bottom-4 left-4">
                <Badge variant="primary" size="sm">WEDDING CATALOG</Badge>
              </div>
            </div>
            <div class="flex items-center gap-3 mb-2">
              <button class="text-[#9747FF] hover:text-[#D946EF] transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>
              <button class="text-[#9747FF] hover:text-[#D946EF] transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              <button class="text-[#9747FF] hover:text-[#D946EF] transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
            <h3 class="text-white text-[16px] font-semibold mb-1">Wedding Catalog</h3>
            <p class="text-[#999999] text-[14px]">Laboss Media</p>
          </div>

          <!-- Portfolio Item 3 -->
          <div class="flex flex-col">
            <div class="relative rounded-[14px] overflow-hidden mb-3" style="height: 380px;">
              <img
                src="/screenshot.png"
                alt="Latest EP Design"
                class="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
              />
              <div class="absolute bottom-4 left-4">
                <Badge variant="primary" size="sm">LATEST EP DESIGN</Badge>
              </div>
            </div>
            <div class="flex items-center gap-3 mb-2">
              <button class="text-[#9747FF] hover:text-[#D946EF] transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>
              <button class="text-[#9747FF] hover:text-[#D946EF] transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              <button class="text-[#9747FF] hover:text-[#D946EF] transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
            <h3 class="text-white text-[16px] font-semibold mb-1">Latest EP Design</h3>
            <p class="text-[#999999] text-[14px]">Weyinmi Esiobu</p>
          </div>

          <!-- Portfolio Item 4 -->
          <div class="flex flex-col">
            <div class="relative rounded-[14px] overflow-hidden mb-3" style="height: 360px;">
              <img
                src="/screenshot.png"
                alt="Jameson Hons"
                class="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
              />
              <div class="absolute bottom-4 left-4">
                <Badge variant="primary" size="sm">JAMESON HONS</Badge>
              </div>
            </div>
            <div class="flex items-center gap-3 mb-2">
              <button class="text-[#9747FF] hover:text-[#D946EF] transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>
              <button class="text-[#9747FF] hover:text-[#D946EF] transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              <button class="text-[#9747FF] hover:text-[#D946EF] transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
            <h3 class="text-white text-[16px] font-semibold mb-1">Jameson Hons Event</h3>
            <p class="text-[#999999] text-[14px]">Nathan Dore</p>
          </div>

          <!-- Portfolio Item 5 -->
          <div class="flex flex-col">
            <div class="relative rounded-[14px] overflow-hidden mb-3" style="height: 320px;">
              <img
                src="/screenshot.png"
                alt="Food Photos"
                class="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
              />
              <div class="absolute bottom-4 left-4">
                <Badge variant="primary" size="sm">FOOD PHOTOS</Badge>
              </div>
            </div>
            <div class="flex items-center gap-3 mb-2">
              <button class="text-[#9747FF] hover:text-[#D946EF] transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>
              <button class="text-[#9747FF] hover:text-[#D946EF] transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              <button class="text-[#9747FF] hover:text-[#D946EF] transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
            <h3 class="text-white text-[16px] font-semibold mb-1">Food Photography</h3>
            <p class="text-[#999999] text-[14px]">StarLight</p>
          </div>

          <!-- Portfolio Item 6 (extra to fill grid) -->
          <div class="flex flex-col">
            <div class="relative rounded-[14px] overflow-hidden mb-3" style="height: 400px;">
              <img
                src="/screenshot.png"
                alt="Graphics"
                class="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
              />
              <div class="absolute bottom-4 left-4">
                <Badge variant="primary" size="sm">GRAPHICS</Badge>
              </div>
            </div>
            <div class="flex items-center gap-3 mb-2">
              <button class="text-[#9747FF] hover:text-[#D946EF] transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>
              <button class="text-[#9747FF] hover:text-[#D946EF] transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </button>
              <button class="text-[#9747FF] hover:text-[#D946EF] transition-all">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
            <h3 class="text-white text-[16px] font-semibold mb-1">Graphics Design</h3>
            <p class="text-[#999999] text-[14px]">Creative Studio</p>
          </div>
        </div>
      </div>

      <!-- Bottom Right - "Made with Glide" Badge -->
      <div class="fixed bottom-6 right-6 z-40">
        <div class="bg-white rounded-full px-4 py-2 flex items-center gap-2 shadow-lg">
          <svg class="w-4 h-4 text-purple-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span class="text-[13px] font-semibold text-gray-800">Made with <span class="text-purple-600">Glide</span></span>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import AppLayout from '../components/AppLayout.vue'
import Badge from '../components/design-system/Badge.vue'
</script>
