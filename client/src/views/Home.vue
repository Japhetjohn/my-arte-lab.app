<template>
  <AppLayout>
    <div class="w-full min-h-screen bg-gradient-to-b from-black via-dark-50 to-black pb-[100px]">
      <!-- Secondary Header with Search -->
      <div class="w-full bg-black/80 backdrop-blur-xl border-b border-dark-300/50 h-[70px] flex items-center justify-between px-12 sticky top-[64px] z-30 animate-fade-in-down">
        <div class="flex items-center gap-4">
          <h2 class="text-xl font-bold gradient-text">Discover Amazing Work</h2>
        </div>
        <div class="relative group">
          <input
            type="text"
            placeholder="Search portfolios..."
            class="w-[300px] h-[42px] pl-11 pr-4 bg-dark-100 border border-dark-300 rounded-lg text-white text-sm placeholder-neutral-500 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/50 transition-all duration-300"
          />
          <svg class="w-5 h-5 absolute left-3.5 top-1/2 transform -translate-y-1/2 text-neutral-500 group-focus-within:text-primary-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <!-- Portfolio Grid - 3 columns with modern spacing -->
      <div class="w-full px-12 pt-10 pb-24">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-[1600px] mx-auto">
          <!-- Portfolio Item 1 -->
          <div class="group flex flex-col animate-fade-in-up">
            <div class="relative rounded-2xl overflow-hidden mb-4 shadow-card hover:shadow-premium transition-all duration-500 cursor-pointer" style="height: 380px;">
              <!-- Gradient overlay on hover -->
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>

              <img
                src="/screenshot.png"
                alt="Portfolio"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />

              <!-- Badge -->
              <div class="absolute bottom-4 left-4 z-20 transform group-hover:scale-105 transition-transform duration-300">
                <Badge variant="primary" size="sm">PORTFOLIO</Badge>
              </div>

              <!-- Hover Actions -->
              <div class="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <button class="w-10 h-10 rounded-full glass glass-hover flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                </button>
                <button class="w-10 h-10 rounded-full glass glass-hover flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- Info Section -->
            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="text-white text-[17px] font-semibold mb-1.5 group-hover:text-primary-400 transition-colors duration-300">Portfolio Showcase</h3>
                <p class="text-neutral-400 text-[14px] flex items-center gap-2">
                  <span class="font-medium hover:text-white transition-colors cursor-pointer">Godis Designs</span>
                  <span class="text-neutral-600">•</span>
                  <span class="text-xs">25/10/2025</span>
                </p>
              </div>
              <div class="flex items-center gap-3 text-neutral-500 text-sm">
                <span class="flex items-center gap-1 hover:text-error-400 transition-colors cursor-pointer">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                  234
                </span>
                <span class="flex items-center gap-1 hover:text-primary-400 transition-colors cursor-pointer">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  1.2k
                </span>
              </div>
            </div>
          </div>

          <!-- Portfolio Item 2 -->
          <div class="group flex flex-col animate-fade-in-up delay-100">
            <div class="relative rounded-2xl overflow-hidden mb-4 shadow-card hover:shadow-premium transition-all duration-500 cursor-pointer" style="height: 380px;">
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>

              <img
                src="/screenshot.png"
                alt="Wedding Catalog"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />

              <div class="absolute bottom-4 left-4 z-20 transform group-hover:scale-105 transition-transform duration-300">
                <Badge variant="secondary" size="sm">WEDDING CATALOG</Badge>
              </div>

              <div class="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <button class="w-10 h-10 rounded-full glass glass-hover flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                </button>
                <button class="w-10 h-10 rounded-full glass glass-hover flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="text-white text-[17px] font-semibold mb-1.5 group-hover:text-primary-400 transition-colors duration-300">Wedding Catalog</h3>
                <p class="text-neutral-400 text-[14px] flex items-center gap-2">
                  <span class="font-medium hover:text-white transition-colors cursor-pointer">Laboss Media</span>
                  <span class="text-neutral-600">•</span>
                  <span class="text-xs">24/10/2025</span>
                </p>
              </div>
              <div class="flex items-center gap-3 text-neutral-500 text-sm">
                <span class="flex items-center gap-1 hover:text-error-400 transition-colors cursor-pointer">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                  189
                </span>
                <span class="flex items-center gap-1 hover:text-primary-400 transition-colors cursor-pointer">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  892
                </span>
              </div>
            </div>
          </div>

          <!-- Portfolio Item 3 -->
          <div class="group flex flex-col animate-fade-in-up delay-200">
            <div class="relative rounded-2xl overflow-hidden mb-4 shadow-card hover:shadow-premium transition-all duration-500 cursor-pointer" style="height: 380px;">
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>

              <img
                src="/screenshot.png"
                alt="Latest EP Design"
                class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />

              <div class="absolute bottom-4 left-4 z-20 transform group-hover:scale-105 transition-transform duration-300">
                <Badge variant="success" size="sm">LATEST EP DESIGN</Badge>
              </div>

              <div class="absolute top-4 right-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <button class="w-10 h-10 rounded-full glass glass-hover flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                </button>
                <button class="w-10 h-10 rounded-full glass glass-hover flex items-center justify-center">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="flex items-start justify-between">
              <div class="flex-1">
                <h3 class="text-white text-[17px] font-semibold mb-1.5 group-hover:text-primary-400 transition-colors duration-300">Latest EP Design</h3>
                <p class="text-neutral-400 text-[14px] flex items-center gap-2">
                  <span class="font-medium hover:text-white transition-colors cursor-pointer">Weyinmi Esiobu</span>
                  <span class="text-neutral-600">•</span>
                  <span class="text-xs">23/10/2025</span>
                </p>
              </div>
              <div class="flex items-center gap-3 text-neutral-500 text-sm">
                <span class="flex items-center gap-1 hover:text-error-400 transition-colors cursor-pointer">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                  </svg>
                  456
                </span>
                <span class="flex items-center gap-1 hover:text-primary-400 transition-colors cursor-pointer">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  1.5k
                </span>
              </div>
            </div>
          </div>

          <!-- Remaining items follow same pattern... -->
          <!-- Add similar structure for items 4, 5, 6 -->
        </div>
      </div>

      <!-- Modern Bottom Action Bar -->
      <div class="fixed bottom-0 left-0 right-0 glass-dark border-t border-white/10 h-[80px] flex items-center justify-center z-40 backdrop-blur-2xl animate-fade-in-up">
        <div class="flex items-center gap-6">
          <button class="group flex flex-col items-center gap-1.5 px-6 py-2 rounded-lg hover:bg-white/5 transition-all duration-300">
            <svg class="w-6 h-6 text-neutral-400 group-hover:text-error-400 group-hover:scale-110 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span class="text-[12px] font-medium text-neutral-400 group-hover:text-white transition-colors">Like</span>
          </button>

          <button class="group flex flex-col items-center gap-1.5 px-6 py-2 rounded-lg hover:bg-white/5 transition-all duration-300">
            <svg class="w-6 h-6 text-neutral-400 group-hover:text-primary-400 group-hover:scale-110 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span class="text-[12px] font-medium text-neutral-400 group-hover:text-white transition-colors">Comment</span>
          </button>

          <button class="group flex flex-col items-center gap-1.5 px-6 py-2 rounded-lg hover:bg-white/5 transition-all duration-300">
            <svg class="w-6 h-6 text-neutral-400 group-hover:text-secondary-400 group-hover:scale-110 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span class="text-[12px] font-medium text-neutral-400 group-hover:text-white transition-colors">Share</span>
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import AppLayout from '../components/AppLayout.vue'
import Badge from '../components/design-system/Badge.vue'
</script>
