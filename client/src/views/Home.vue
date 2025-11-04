<template>
  <AppLayout>
    <div class="w-full min-h-screen bg-neutral-50">
      <!-- Hero Section -->
      <section class="bg-white">
        <div class="max-w-7xl mx-auto px-6 py-16 text-center">
          <h1 class="text-h1-lg font-bold text-neutral-900 mb-4 animate-fade-in">
            Built for creators. Trusted by clients.
          </h1>
          <p class="text-body text-neutral-600 mb-8 max-w-2xl mx-auto animate-slide-up">
            Connect with top-tier photographers and designers. Book verified creatives for your next project with confidence.
          </p>
          <div class="flex items-center justify-center gap-4 animate-slide-up">
            <Button size="lg" @click="router.push('/discover')">
              Explore creators
            </Button>
            <Button variant="secondary" size="lg" @click="router.push('/creator/onboarding')">
              Become a creator
            </Button>
          </div>
        </div>

        <!-- Quick Statistics -->
        <div class="max-w-7xl mx-auto px-6 pb-16">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="flex flex-col items-center p-6 bg-neutral-50 rounded-md">
              <div class="flex items-center gap-2 mb-2">
                <svg class="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span class="text-h2 font-bold text-neutral-900">1,234</span>
              </div>
              <p class="text-caption-lg text-neutral-600">Creators onboarded</p>
            </div>

            <div class="flex flex-col items-center p-6 bg-neutral-50 rounded-md">
              <div class="flex items-center gap-2 mb-2">
                <svg class="w-5 h-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                <span class="text-h2 font-bold text-neutral-900">987</span>
              </div>
              <p class="text-caption-lg text-neutral-600">Verified creators</p>
            </div>

            <div class="flex flex-col items-center p-6 bg-neutral-50 rounded-md">
              <div class="flex items-center gap-2 mb-2">
                <svg class="w-5 h-5 text-secondary" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 100 4v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2a2 2 0 100-4V6z" />
                </svg>
                <span class="text-h2 font-bold text-neutral-900">3,456</span>
              </div>
              <p class="text-caption-lg text-neutral-600">Completed bookings</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Featured Creators -->
      <section class="py-16 bg-neutral-50">
        <div class="max-w-7xl mx-auto px-6">
          <div class="flex items-center justify-between mb-8">
            <h2 class="text-h2-lg font-bold text-neutral-900">Featured creators</h2>
            <Button variant="ghost" @click="router.push('/discover')">
              View all
              <template #iconRight>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </template>
            </Button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <!-- Creator Card 1 -->
            <Card variant="elevated" padding="none" hoverable clickable @click="router.push('/creator/1')">
              <div class="relative h-64 overflow-hidden">
                <img
                  src="/screenshot.png"
                  alt="Portfolio"
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div class="absolute top-3 right-3">
                  <Badge variant="success" size="sm">Verified</Badge>
                </div>
              </div>
              <div class="p-4">
                <h3 class="text-base font-semibold text-neutral-900 mb-1">Godis Designs</h3>
                <p class="text-caption text-neutral-600 mb-2">Photographer • Lagos</p>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1">
                    <svg class="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span class="text-caption font-medium text-neutral-900">4.9</span>
                    <span class="text-caption text-neutral-500">(127)</span>
                  </div>
                  <p class="text-caption font-semibold text-primary">From $150</p>
                </div>
              </div>
            </Card>

            <!-- Creator Card 2 -->
            <Card variant="elevated" padding="none" hoverable clickable @click="router.push('/creator/2')">
              <div class="relative h-64 overflow-hidden">
                <img
                  src="/screenshot.png"
                  alt="Wedding Catalog"
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div class="absolute top-3 right-3">
                  <Badge variant="success" size="sm">Verified</Badge>
                </div>
              </div>
              <div class="p-4">
                <h3 class="text-base font-semibold text-neutral-900 mb-1">Laboss Media</h3>
                <p class="text-caption text-neutral-600 mb-2">Visual Designer • Abuja</p>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1">
                    <svg class="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span class="text-caption font-medium text-neutral-900">5.0</span>
                    <span class="text-caption text-neutral-500">(89)</span>
                  </div>
                  <p class="text-caption font-semibold text-primary">From $200</p>
                </div>
              </div>
            </Card>

            <!-- Creator Card 3 -->
            <Card variant="elevated" padding="none" hoverable clickable @click="router.push('/creator/3')">
              <div class="relative h-64 overflow-hidden">
                <img
                  src="/screenshot.png"
                  alt="Latest EP Design"
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <div class="p-4">
                <h3 class="text-base font-semibold text-neutral-900 mb-1">Weyinmi Esiobu</h3>
                <p class="text-caption text-neutral-600 mb-2">Graphic Designer • Port Harcourt</p>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1">
                    <svg class="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span class="text-caption font-medium text-neutral-900">4.8</span>
                    <span class="text-caption text-neutral-500">(64)</span>
                  </div>
                  <p class="text-caption font-semibold text-primary">From $120</p>
                </div>
              </div>
            </Card>

            <!-- Creator Card 4 -->
            <Card variant="elevated" padding="none" hoverable clickable @click="router.push('/creator/4')">
              <div class="relative h-64 overflow-hidden">
                <img
                  src="/screenshot.png"
                  alt="Nathan Dore"
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
                <div class="absolute top-3 right-3">
                  <Badge variant="success" size="sm">Verified</Badge>
                </div>
              </div>
              <div class="p-4">
                <h3 class="text-base font-semibold text-neutral-900 mb-1">Nathan Dore</h3>
                <p class="text-caption text-neutral-600 mb-2">Event Photographer • Lagos</p>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-1">
                    <svg class="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span class="text-caption font-medium text-neutral-900">4.9</span>
                    <span class="text-caption text-neutral-500">(142)</span>
                  </div>
                  <p class="text-caption font-semibold text-primary">From $180</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <!-- Category Shortcuts -->
      <section class="py-16 bg-white">
        <div class="max-w-7xl mx-auto px-6">
          <h2 class="text-h2-lg font-bold text-neutral-900 mb-8">Browse by category</h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              @click="router.push('/discover?category=photographer')"
              class="p-6 bg-neutral-50 rounded-md hover:bg-primary hover:text-white transition-all group"
            >
              <svg class="w-8 h-8 mx-auto mb-3 text-primary group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p class="text-base font-semibold text-neutral-900 group-hover:text-white">Photographer</p>
            </button>

            <button
              @click="router.push('/discover?category=designer')"
              class="p-6 bg-neutral-50 rounded-md hover:bg-secondary hover:text-white transition-all group"
            >
              <svg class="w-8 h-8 mx-auto mb-3 text-secondary group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <p class="text-base font-semibold text-neutral-900 group-hover:text-white">Designer</p>
            </button>

            <button
              @click="router.push('/discover?category=videographer')"
              class="p-6 bg-neutral-50 rounded-md hover:bg-success hover:text-white transition-all group"
            >
              <svg class="w-8 h-8 mx-auto mb-3 text-success group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p class="text-base font-semibold text-neutral-900 group-hover:text-white">Videographer</p>
            </button>

            <button
              @click="router.push('/discover')"
              class="p-6 bg-neutral-50 rounded-md hover:bg-info hover:text-white transition-all group"
            >
              <svg class="w-8 h-8 mx-auto mb-3 text-info group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <p class="text-base font-semibold text-neutral-900 group-hover:text-white">View all</p>
            </button>
          </div>
        </div>
      </section>

      <!-- CTA Strip -->
      <section class="py-16 bg-gradient-to-r from-primary to-secondary">
        <div class="max-w-4xl mx-auto px-6 text-center">
          <h2 class="text-h1 font-bold text-white mb-4">Ready to get started?</h2>
          <p class="text-body text-white/90 mb-8">
            Join thousands of creatives and clients building amazing projects together
          </p>
          <div class="flex items-center justify-center gap-4">
            <Button variant="secondary" size="lg" class="bg-white text-primary hover:bg-neutral-50 border-0">
              Create account
            </Button>
            <Button variant="ghost" size="lg" class="text-white border-2 border-white hover:bg-white/10">
              Learn more
            </Button>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="bg-neutral-900 text-white py-12">
        <div class="max-w-7xl mx-auto px-6">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <img src="/logo.PNG" alt="MyArteLab" class="h-8 w-auto mb-4" />
              <p class="text-caption text-neutral-400">
                Connecting creatives with opportunities worldwide
              </p>
            </div>
            <div>
              <h3 class="text-base font-semibold mb-4">For Creators</h3>
              <ul class="space-y-2 text-caption text-neutral-400">
                <li><a href="#" class="hover:text-white transition-colors">Sign up</a></li>
                <li><a href="#" class="hover:text-white transition-colors">Portfolio tips</a></li>
                <li><a href="#" class="hover:text-white transition-colors">Pricing guide</a></li>
              </ul>
            </div>
            <div>
              <h3 class="text-base font-semibold mb-4">For Clients</h3>
              <ul class="space-y-2 text-caption text-neutral-400">
                <li><a href="#" class="hover:text-white transition-colors">Find creators</a></li>
                <li><a href="#" class="hover:text-white transition-colors">How it works</a></li>
                <li><a href="#" class="hover:text-white transition-colors">Trust & safety</a></li>
              </ul>
            </div>
            <div>
              <h3 class="text-base font-semibold mb-4">Company</h3>
              <ul class="space-y-2 text-caption text-neutral-400">
                <li><a href="#" class="hover:text-white transition-colors">About us</a></li>
                <li><a href="#" class="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" class="hover:text-white transition-colors">Privacy policy</a></li>
                <li><a href="#" class="hover:text-white transition-colors">Terms of service</a></li>
              </ul>
            </div>
          </div>
          <div class="border-t border-neutral-800 pt-8 text-center text-caption text-neutral-400">
            <p>&copy; 2025 MyArteLab. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  </AppLayout>
</template>

<script setup>
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import Button from '../components/design-system/Button.vue'
import Card from '../components/design-system/Card.vue'
import Badge from '../components/design-system/Badge.vue'

const router = useRouter()
</script>
