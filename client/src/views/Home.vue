<template>
  <AppLayout>
    <div class="w-full min-h-screen bg-neutral-50">
      <!-- Hero Section -->
      <section class="relative overflow-hidden bg-gradient-to-br from-primary via-secondary to-primary py-24">
        <!-- Animated Background Elements -->
        <div class="absolute inset-0 overflow-hidden">
          <div class="absolute -top-1/2 -left-1/2 w-full h-full bg-white/5 rounded-full blur-3xl animate-pulse"></div>
          <div class="absolute -bottom-1/2 -right-1/2 w-full h-full bg-white/5 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
        </div>

        <div class="relative max-w-7xl mx-auto px-8">
          <div class="text-center max-w-4xl mx-auto">
            <div class="inline-block mb-6 px-6 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-semibold animate-fade-in">
              ✨ Africa's Premier Creative Marketplace
            </div>
            <h1 class="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight animate-fade-in-up">
              Built for creators.<br/>Trusted by clients.
            </h1>
            <p class="text-xl text-white/90 mb-10 leading-relaxed animate-fade-in-up" style="animation-delay: 0.2s;">
              Connect with talented photographers, designers, and videographers.<br/>Book creative services with confidence and bring your vision to life.
            </p>
            <div class="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style="animation-delay: 0.4s;">
              <Button variant="secondary" size="lg" @click="router.push('/discover')" class="bg-white text-primary hover:bg-white/90 border-0">
                <template #iconLeft>
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </template>
                Browse Creators
              </Button>
              <Button variant="ghost" size="lg" @click="handleJoinWaitlist" class="text-white border-2 border-white/30 hover:bg-white/10 backdrop-blur-sm">
                <template #iconLeft>
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                </template>
                Join as Creator
              </Button>
            </div>
          </div>
        </div>
      </section>

      <!-- Quick Statistics Ribbon -->
      <section class="bg-white border-y border-neutral-200 py-12">
        <div class="max-w-7xl mx-auto px-8">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="flex items-center gap-4 group hover:scale-105 transition-transform duration-300">
              <div class="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p class="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{{ stats.creatorsOnboarded }}+</p>
                <p class="text-sm text-neutral-600 font-medium">Creators Onboarded</p>
              </div>
            </div>
            <div class="flex items-center gap-4 group hover:scale-105 transition-transform duration-300">
              <div class="w-16 h-16 bg-gradient-to-br from-success to-success-dark rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p class="text-3xl font-bold text-success">{{ stats.verifiedCreators }}+</p>
                <p class="text-sm text-neutral-600 font-medium">Verified Creators</p>
              </div>
            </div>
            <div class="flex items-center gap-4 group hover:scale-105 transition-transform duration-300">
              <div class="w-16 h-16 bg-gradient-to-br from-secondary to-primary rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p class="text-3xl font-bold bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">{{ stats.completedBookings }}+</p>
                <p class="text-sm text-neutral-600 font-medium">Completed Bookings</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Featured Creators Carousel -->
      <section class="py-16 bg-neutral-50">
        <div class="max-w-7xl mx-auto px-8">
          <div class="flex items-center justify-between mb-8">
            <div>
              <h2 class="text-h1 font-bold text-neutral-900 mb-2">Featured Creators</h2>
              <p class="text-neutral-600">Discover top-rated creative professionals</p>
            </div>
            <Button variant="ghost" @click="router.push('/discover')">
              View All
              <template #iconRight>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </template>
            </Button>
          </div>

          <!-- Featured Creator Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card
              v-for="creator in featuredCreators"
              :key="creator.id"
              variant="elevated"
              padding="lg"
              hoverable
              clickable
              @click="router.push(`/creator/${creator.id}`)"
              class="group"
            >
              <div class="text-center">
                <!-- Creator Avatar -->
                <div class="mb-4 relative inline-block">
                  <div class="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary mx-auto flex items-center justify-center text-white text-3xl font-bold shadow-soft">
                    {{ creator.initials }}
                  </div>
                  <div class="absolute bottom-0 right-0 w-6 h-6 bg-success rounded-full border-4 border-white"></div>
                </div>

                <!-- Creator Info -->
                <h3 class="text-lg font-semibold text-neutral-900 mb-1">{{ creator.name }}</h3>
                <p class="text-sm text-neutral-600 mb-3">{{ creator.role }}</p>

                <!-- Rating -->
                <div class="flex items-center justify-center gap-1 mb-3">
                  <svg
                    v-for="star in 5"
                    :key="star"
                    class="w-4 h-4 text-[#FFD700]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span class="text-sm text-neutral-600 ml-1">({{ creator.reviewCount }})</span>
                </div>

                <!-- Location & Price -->
                <div class="flex items-center justify-between text-sm text-neutral-600 mb-4">
                  <div class="flex items-center gap-1">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {{ creator.city }}
                  </div>
                  <p class="font-semibold text-primary">From ${{ creator.priceFrom }}</p>
                </div>

                <!-- CTA Button -->
                <Button variant="primary" size="sm" full-width @click.stop="router.push(`/creator/${creator.id}`)">
                  View Profile
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <!-- Category Shortcuts -->
      <section class="py-16 bg-white">
        <div class="max-w-7xl mx-auto px-8">
          <div class="text-center mb-12">
            <h2 class="text-h1 font-bold text-neutral-900 mb-3">Browse by Category</h2>
            <p class="text-lg text-neutral-600">Find the perfect creative professional for your project</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              v-for="category in categories"
              :key="category.id"
              @click="router.push(`/discover?category=${category.value}`)"
              class="relative overflow-hidden bg-gradient-to-br from-white to-neutral-50 border-2 border-neutral-200 rounded-xl p-8 hover:border-primary hover:shadow-lg transition-all duration-300 group transform hover:-translate-y-2"
            >
              <div class="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div class="relative">
                <div class="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg">
                  <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 class="text-xl font-bold text-neutral-900 mb-2 group-hover:text-primary transition-colors">{{ category.label }}</h3>
                <p class="text-sm text-neutral-600 font-medium">{{ category.count }}+ creators available</p>
              </div>
            </button>
          </div>
        </div>
      </section>

      <!-- CTA Strip -->
      <section class="relative overflow-hidden py-24 bg-gradient-to-br from-primary via-secondary to-primary">
        <!-- Animated Background -->
        <div class="absolute inset-0 overflow-hidden opacity-30">
          <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse"></div>
          <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-white rounded-full blur-3xl animate-pulse" style="animation-delay: 1.5s;"></div>
        </div>

        <div class="relative max-w-4xl mx-auto px-8 text-center">
          <div class="inline-block mb-6 px-6 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-semibold animate-fade-in">
            🚀 Start Your Creative Journey
          </div>
          <h2 class="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight animate-fade-in-up">
            Ready to bring your<br/>creative vision to life?
          </h2>
          <p class="text-xl text-white/90 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style="animation-delay: 0.2s;">
            Join thousands of clients who have found their perfect creative match on MyArteLab. Get started in minutes.
          </p>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style="animation-delay: 0.4s;">
            <Button variant="secondary" size="lg" @click="router.push('/discover')" class="bg-white text-primary hover:bg-white/90 hover:shadow-2xl border-0">
              <template #iconLeft>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </template>
              Get Started Now
            </Button>
            <Button variant="ghost" size="lg" class="text-white border-2 border-white/30 hover:bg-white/10 backdrop-blur-sm">
              <template #iconLeft>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </template>
              Learn More
            </Button>
          </div>
        </div>
      </section>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import Button from '../components/design-system/Button.vue'
import Card from '../components/design-system/Card.vue'

const router = useRouter()

// Stats Data
const stats = ref({
  creatorsOnboarded: 1250,
  verifiedCreators: 980,
  completedBookings: 3400
})

// Featured Creators
const featuredCreators = ref([
  {
    id: 1,
    name: 'Ebuka Esiobu',
    initials: 'EE',
    role: 'Wedding Photographer',
    city: 'Lagos',
    rating: 5.0,
    reviewCount: 124,
    priceFrom: 50000
  },
  {
    id: 2,
    name: 'Chiamaka Obi',
    initials: 'CO',
    role: 'Brand Designer',
    city: 'Abuja',
    rating: 5.0,
    reviewCount: 87,
    priceFrom: 35000
  },
  {
    id: 3,
    name: 'Tunde Bakare',
    initials: 'TB',
    role: 'Videographer',
    city: 'Lagos',
    rating: 5.0,
    reviewCount: 156,
    priceFrom: 75000
  },
  {
    id: 4,
    name: 'Ngozi Eze',
    initials: 'NE',
    role: 'Fashion Photographer',
    city: 'Port Harcourt',
    rating: 5.0,
    reviewCount: 92,
    priceFrom: 45000
  },
  {
    id: 5,
    name: 'Ibrahim Musa',
    initials: 'IM',
    role: 'Product Photographer',
    city: 'Kano',
    rating: 5.0,
    reviewCount: 68,
    priceFrom: 30000
  },
  {
    id: 6,
    name: 'Amara Okafor',
    initials: 'AO',
    role: 'UI/UX Designer',
    city: 'Lagos',
    rating: 5.0,
    reviewCount: 103,
    priceFrom: 40000
  }
])

// Categories
const categories = ref([
  {
    id: 1,
    label: 'Photographer',
    value: 'photographer',
    count: 450,
    icon: 'CameraIcon'
  },
  {
    id: 2,
    label: 'Designer',
    value: 'designer',
    count: 320,
    icon: 'DesignIcon'
  },
  {
    id: 3,
    label: 'Videographer',
    value: 'videographer',
    count: 280,
    icon: 'VideoIcon'
  }
])

// Methods
const handleJoinWaitlist = () => {
  // TODO: Open waitlist modal or navigate to signup
  router.push('/signup')
}
</script>
