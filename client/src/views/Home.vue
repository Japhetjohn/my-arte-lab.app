<template>
  <AppLayout>
    <div class="w-full min-h-screen bg-neutral-50">
      <!-- Hero Section -->
      <section class="relative bg-gradient-to-br from-primary/5 via-secondary/5 to-neutral-50 py-20">
        <div class="max-w-7xl mx-auto px-8">
          <div class="text-center max-w-3xl mx-auto">
            <h1 class="text-h1-lg font-bold text-neutral-900 mb-4">
              Built for creators. Trusted by clients.
            </h1>
            <p class="text-lg text-neutral-600 mb-8">
              Connect with talented photographers, designers, and videographers. Book creative services with confidence.
            </p>
            <div class="flex items-center justify-center gap-4">
              <Button variant="primary" size="lg" @click="router.push('/discover')">
                Browse Creators
              </Button>
              <Button variant="secondary" size="lg" @click="handleJoinWaitlist">
                Join as Creator
              </Button>
            </div>
          </div>
        </div>
      </section>

      <!-- Quick Statistics Ribbon -->
      <section class="bg-white border-y border-neutral-200 py-8">
        <div class="max-w-7xl mx-auto px-8">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p class="text-h2 font-bold text-neutral-900">{{ stats.creatorsOnboarded }}+</p>
                <p class="text-caption-lg text-neutral-600">Creators Onboarded</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p class="text-h2 font-bold text-neutral-900">{{ stats.verifiedCreators }}+</p>
                <p class="text-caption-lg text-neutral-600">Verified Creators</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p class="text-h2 font-bold text-neutral-900">{{ stats.completedBookings }}+</p>
                <p class="text-caption-lg text-neutral-600">Completed Bookings</p>
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
            <h2 class="text-h1 font-bold text-neutral-900 mb-2">Browse by Category</h2>
            <p class="text-neutral-600">Find the perfect creative professional for your project</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              v-for="category in categories"
              :key="category.id"
              @click="router.push(`/discover?category=${category.value}`)"
              class="bg-gradient-to-br from-neutral-50 to-white border border-neutral-200 rounded-lg p-8 hover:border-primary hover:shadow-soft transition-all group"
            >
              <div class="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:scale-110 transition-all">
                <component :is="category.icon" class="w-8 h-8 text-primary group-hover:text-white" />
              </div>
              <h3 class="text-lg font-semibold text-neutral-900 mb-2">{{ category.label }}</h3>
              <p class="text-sm text-neutral-600">{{ category.count }}+ creators available</p>
            </button>
          </div>
        </div>
      </section>

      <!-- CTA Strip -->
      <section class="py-20 bg-gradient-to-br from-primary to-secondary">
        <div class="max-w-4xl mx-auto px-8 text-center">
          <h2 class="text-h1-lg font-bold text-white mb-4">
            Ready to bring your creative vision to life?
          </h2>
          <p class="text-lg text-white/90 mb-8">
            Join thousands of clients who have found their perfect creative match on MyArteLab
          </p>
          <div class="flex items-center justify-center gap-4">
            <Button variant="secondary" size="lg" @click="router.push('/discover')" class="bg-white text-primary hover:bg-white/90">
              Get Started
            </Button>
            <Button variant="ghost" size="lg" class="text-white border-2 border-white hover:bg-white/10">
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
