<template>
  <div :class="containerClasses">
    <!-- Spinner Variant -->
    <div v-if="variant === 'spinner'" :class="spinnerContainerClasses">
      <svg
        :class="spinnerClasses"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          class="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          stroke-width="4"
        ></circle>
        <path
          class="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <p v-if="text" :class="textClasses">{{ text }}</p>
    </div>

    <!-- Skeleton Card Variant -->
    <div v-else-if="variant === 'skeleton-card'" class="animate-pulse">
      <div class="bg-neutral-200 rounded-lg h-48 mb-4"></div>
      <div class="space-y-3">
        <div class="h-4 bg-neutral-200 rounded w-3/4"></div>
        <div class="h-4 bg-neutral-200 rounded w-1/2"></div>
      </div>
    </div>

    <!-- Skeleton List Variant -->
    <div v-else-if="variant === 'skeleton-list'" class="animate-pulse space-y-4">
      <div v-for="i in count" :key="i" class="flex items-center space-x-4">
        <div class="rounded-full bg-neutral-200 h-12 w-12"></div>
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-neutral-200 rounded w-3/4"></div>
          <div class="h-3 bg-neutral-200 rounded w-1/2"></div>
        </div>
      </div>
    </div>

    <!-- Skeleton Text Variant -->
    <div v-else-if="variant === 'skeleton-text'" class="animate-pulse space-y-2">
      <div v-for="i in count" :key="i" class="h-4 bg-neutral-200 rounded" :class="i === count ? 'w-2/3' : 'w-full'"></div>
    </div>

    <!-- Skeleton Image Variant -->
    <div v-else-if="variant === 'skeleton-image'" class="animate-pulse">
      <div :class="skeletonImageClasses"></div>
    </div>

    <!-- Skeleton Avatar Variant -->
    <div v-else-if="variant === 'skeleton-avatar'" class="animate-pulse">
      <div :class="skeletonAvatarClasses"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'spinner',
    validator: (value) => ['spinner', 'skeleton-card', 'skeleton-list', 'skeleton-text', 'skeleton-image', 'skeleton-avatar'].includes(value)
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
    classes.push('fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50')
  } else if (props.centered && props.variant === 'spinner') {
    classes.push('flex items-center justify-center')
  }

  return classes.join(' ')
})

const spinnerContainerClasses = computed(() => {
  return 'flex flex-col items-center justify-center gap-3'
})

const spinnerClasses = computed(() => {
  const classes = ['animate-spin text-primary']

  switch (props.size) {
    case 'sm':
      classes.push('h-5 w-5')
      break
    case 'md':
      classes.push('h-8 w-8')
      break
    case 'lg':
      classes.push('h-12 w-12')
      break
    case 'xl':
      classes.push('h-16 w-16')
      break
  }

  return classes.join(' ')
})

const textClasses = computed(() => {
  const classes = ['text-neutral-600']

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
  const classes = ['bg-neutral-200 rounded-lg']

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
  const classes = ['bg-neutral-200 rounded-full']

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
