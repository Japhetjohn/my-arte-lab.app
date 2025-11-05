<template>
  <div :class="containerClasses">
    <!-- Spinner Variant -->
    <div v-if="variant === 'spinner'" :class="spinnerContainerClasses">
      <div class="relative">
        <!-- Outer rotating ring -->
        <div :class="[spinnerClasses, 'border-dark-300 border-t-primary-500']"></div>
        <!-- Inner glow -->
        <div class="absolute inset-0 m-auto w-1/2 h-1/2 rounded-full bg-gradient-to-br from-primary-600/30 to-secondary-600/30 blur-sm"></div>
      </div>
      <p v-if="text" :class="textClasses">{{ text }}</p>
    </div>

    <!-- Skeleton Card Variant -->
    <div v-else-if="variant === 'skeleton-card'" class="animate-pulse">
      <div class="bg-dark-100 rounded-2xl border border-dark-300 overflow-hidden mb-4" style="height: 380px;">
        <div class="w-full h-full bg-gradient-to-br from-dark-200 via-dark-100 to-dark-200 shimmer"></div>
      </div>
      <div class="space-y-3">
        <div class="h-5 bg-dark-200 rounded-lg w-3/4"></div>
        <div class="h-4 bg-dark-200 rounded w-1/2"></div>
      </div>
    </div>

    <!-- Skeleton List Variant -->
    <div v-else-if="variant === 'skeleton-list'" class="animate-pulse space-y-4">
      <div v-for="i in count" :key="i" class="flex items-center gap-4 p-4 bg-dark-100 rounded-lg border border-dark-300">
        <div class="rounded-full bg-dark-200 h-12 w-12 shimmer"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-dark-200 rounded w-3/4 shimmer"></div>
          <div class="h-3 bg-dark-200 rounded w-1/2 shimmer"></div>
        </div>
      </div>
    </div>

    <!-- Skeleton Text Variant -->
    <div v-else-if="variant === 'skeleton-text'" class="animate-pulse space-y-3">
      <div v-for="i in count" :key="i" class="h-4 bg-dark-200 rounded shimmer" :class="i === count ? 'w-2/3' : 'w-full'"></div>
    </div>

    <!-- Skeleton Image Variant -->
    <div v-else-if="variant === 'skeleton-image'" class="animate-pulse">
      <div :class="skeletonImageClasses">
        <div class="w-full h-full bg-gradient-to-br from-dark-200 via-dark-100 to-dark-200 shimmer"></div>
      </div>
    </div>

    <!-- Skeleton Avatar Variant -->
    <div v-else-if="variant === 'skeleton-avatar'" class="animate-pulse">
      <div :class="skeletonAvatarClasses" class="shimmer"></div>
    </div>

    <!-- Skeleton Portfolio Grid -->
    <div v-else-if="variant === 'skeleton-portfolio'" class="animate-pulse">
      <div class="flex flex-col">
        <div class="relative rounded-2xl overflow-hidden mb-4 bg-dark-100 border border-dark-300" style="height: 380px;">
          <div class="absolute inset-0 bg-gradient-to-br from-dark-200 via-dark-100 to-dark-200 shimmer"></div>
        </div>
        <div class="space-y-2">
          <div class="h-5 bg-dark-200 rounded w-3/4 shimmer"></div>
          <div class="h-4 bg-dark-200 rounded w-1/2 shimmer"></div>
        </div>
      </div>
    </div>

    <!-- Dots Loader -->
    <div v-else-if="variant === 'dots'" class="flex items-center justify-center gap-2 p-4">
      <div class="w-3 h-3 bg-primary-500 rounded-full animate-bounce-soft"></div>
      <div class="w-3 h-3 bg-primary-500 rounded-full animate-bounce-soft delay-100"></div>
      <div class="w-3 h-3 bg-primary-500 rounded-full animate-bounce-soft delay-200"></div>
    </div>

    <!-- Pulse Loader -->
    <div v-else-if="variant === 'pulse'" class="flex items-center justify-center p-4">
      <div class="relative w-16 h-16">
        <div class="absolute inset-0 rounded-full bg-primary-500/30 animate-ping"></div>
        <div class="absolute inset-2 rounded-full bg-primary-500/50 animate-ping delay-100"></div>
        <div class="absolute inset-4 rounded-full bg-gradient-to-br from-primary-600 to-secondary-600 animate-pulse-soft"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'spinner',
    validator: (value) => [
      'spinner',
      'skeleton-card',
      'skeleton-list',
      'skeleton-text',
      'skeleton-image',
      'skeleton-avatar',
      'skeleton-portfolio',
      'dots',
      'pulse'
    ].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl'].includes(value)
  },
  text: {
    type: String,
    default: ''
  },
  count: {
    type: Number,
    default: 3
  },
  fullScreen: {
    type: Boolean,
    default: false
  },
  centered: {
    type: Boolean,
    default: true
  }
})

const containerClasses = computed(() => {
  const classes = []

  if (props.fullScreen) {
    classes.push('fixed inset-0 flex items-center justify-center bg-black/95 backdrop-blur-md z-50 animate-fade-in')
  } else if (props.centered && props.variant === 'spinner') {
    classes.push('flex items-center justify-center')
  }

  return classes.join(' ')
})

const spinnerContainerClasses = computed(() => {
  return 'flex flex-col items-center justify-center gap-4'
})

const spinnerClasses = computed(() => {
  const classes = ['animate-spin rounded-full border-4']

  switch (props.size) {
    case 'sm':
      classes.push('h-6 w-6')
      break
    case 'md':
      classes.push('h-10 w-10')
      break
    case 'lg':
      classes.push('h-14 w-14')
      break
    case 'xl':
      classes.push('h-20 w-20')
      break
  }

  return classes.join(' ')
})

const textClasses = computed(() => {
  const classes = ['text-neutral-400 font-medium']

  switch (props.size) {
    case 'sm':
      classes.push('text-sm')
      break
    case 'md':
      classes.push('text-base')
      break
    case 'lg':
      classes.push('text-lg')
      break
    case 'xl':
      classes.push('text-xl')
      break
  }

  return classes.join(' ')
})

const skeletonImageClasses = computed(() => {
  const classes = ['bg-dark-100 rounded-2xl border border-dark-300 overflow-hidden']

  switch (props.size) {
    case 'sm':
      classes.push('h-32')
      break
    case 'md':
      classes.push('h-48')
      break
    case 'lg':
      classes.push('h-64')
      break
    case 'xl':
      classes.push('h-96')
      break
  }

  return classes.join(' ')
})

const skeletonAvatarClasses = computed(() => {
  const classes = ['bg-dark-200 rounded-full']

  switch (props.size) {
    case 'sm':
      classes.push('h-8 w-8')
      break
    case 'md':
      classes.push('h-12 w-12')
      break
    case 'lg':
      classes.push('h-16 w-16')
      break
    case 'xl':
      classes.push('h-24 w-24')
      break
  }

  return classes.join(' ')
})
</script>
