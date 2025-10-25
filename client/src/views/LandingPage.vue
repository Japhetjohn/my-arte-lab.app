<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
    <!-- Header -->
    <header class="container mx-auto px-6 py-6 flex justify-between items-center">
      <div class="text-white text-3xl font-bold">MyArteLab</div>
      <div class="space-x-4">
        <router-link to="/login">
          <BaseButton variant="outline" class="!text-white !border-white hover:!bg-white/10">
            Log In
          </BaseButton>
        </router-link>
      </div>
    </header>

    <!-- Hero Section -->
    <div class="container mx-auto px-6 py-20 text-center">
      <h1 class="text-5xl md:text-6xl font-bold text-white mb-6">
        Africa's Premier Creative Marketplace
      </h1>
      <p class="text-xl text-white/90 mb-12 max-w-3xl mx-auto">
        Connect with verified African photographers and visual designers.
        Book trusted creatives. Pay securely with instant escrow protection.
      </p>

      <!-- Role Selection Cards -->
      <div class="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-16">
        <!-- Creator Card -->
        <BaseCard hoverable @click="selectRole('creator')" class="cursor-pointer transform hover:scale-105 transition-transform">
          <div class="text-center py-8">
            <div class="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 class="text-2xl font-bold text-gray-900 mb-3">I'm a Creator</h3>
            <p class="text-gray-600 mb-6">
              Showcase your work, get verified bookings, and receive instant secure payments
            </p>
            <ul class="text-left text-sm text-gray-700 space-y-2 mb-6 mx-auto max-w-xs">
              <li class="flex items-center">
                <svg class="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                Build your portfolio
              </li>
              <li class="flex items-center">
                <svg class="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                Get instant payments
              </li>
              <li class="flex items-center">
                <svg class="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                8% platform fee only
              </li>
            </ul>
            <BaseButton variant="primary" fullWidth>Get Started as Creator</BaseButton>
          </div>
        </BaseCard>

        <!-- Client Card -->
        <BaseCard hoverable @click="selectRole('client')" class="cursor-pointer transform hover:scale-105 transition-transform">
          <div class="text-center py-8">
            <div class="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 class="text-2xl font-bold text-gray-900 mb-3">I'm a Client</h3>
            <p class="text-gray-600 mb-6">
              Discover and book verified African creatives with secure payments
            </p>
            <ul class="text-left text-sm text-gray-700 space-y-2 mb-6 mx-auto max-w-xs">
              <li class="flex items-center">
                <svg class="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                Browse verified creatives
              </li>
              <li class="flex items-center">
                <svg class="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                Secure escrow payments
              </li>
              <li class="flex items-center">
                <svg class="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
                No extra fees
              </li>
            </ul>
            <BaseButton variant="primary" fullWidth>Get Started as Client</BaseButton>
          </div>
        </BaseCard>
      </div>

      <!-- Guest Browse Option -->
      <div class="mt-12">
        <router-link to="/discover" class="text-white hover:underline text-lg">
          Or browse creatives as a guest →
        </router-link>
      </div>
    </div>

    <!-- Features Section -->
    <div class="bg-white py-20">
      <div class="container mx-auto px-6">
        <h2 class="text-3xl font-bold text-center mb-12">Why Choose MyArteLab?</h2>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="text-center">
            <div class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold mb-2">Verified Creatives</h3>
            <p class="text-gray-600">Every creator is verified to ensure quality and trust</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold mb-2">Secure Escrow</h3>
            <p class="text-gray-600">Your payments are protected until work is delivered</p>
          </div>
          <div class="text-center">
            <div class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 class="text-xl font-semibold mb-2">Instant Payouts</h3>
            <p class="text-gray-600">Creators get paid instantly when work is approved</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import BaseButton from '../components/BaseButton.vue'
import BaseCard from '../components/BaseCard.vue'

const router = useRouter()

const selectRole = (role) => {
  router.push(`/signup?role=${role}`)
}
</script>
