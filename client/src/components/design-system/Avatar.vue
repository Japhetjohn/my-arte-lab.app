<template>
  <div :class="avatarClasses" :style="avatarStyle">
    <!-- Image -->
    <img
      v-if="src"
      :src="src"
      :alt="alt"
      class="w-full h-full object-cover"
      @error="handleImageError"
    />

    <!-- Initials Fallback -->
    <span v-else-if="initials" :class="initialsClasses">
      {{ initials }}
    </span>

    <!-- Default Icon Fallback -->
    <svg v-else class="w-1/2 h-1/2 text-current" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
    </svg>

    <!-- Status Indicator -->
    <span v-if="status" :class="statusClasses"></span>

    <!-- Badge/Count -->
    <span v-if="badge" class="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-error text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
      {{ badge }}
    </span>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  src: {
    type: String,
    default: null
  },
  alt: {
    type: String,
    default: 'Avatar'
  },
  name: {
    type: String,
    default: null
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['xs', 'sm', 'md', 'lg', 'xl', '2xl'].includes(value)
  },
  shape: {
    type: String,
    default: 'circle',
    validator: (value) => ['circle', 'square', 'rounded'].includes(value)
  },
  status: {
    type: String,
    default: null,
    validator: (value) => !value || ['online', 'offline', 'away', 'busy'].includes(value)
  },
  badge: {
    type: [String, Number],
    default: null
  }
})

const imageError = ref(false)

const initials = computed(() => {
  if (!props.name) return null
  const names = props.name.trim().split(' ')
  if (names.length >= 2) {
    return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase()
  }
  return names[0].charAt(0).toUpperCase()
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'w-6 h-6'
    case 'sm':
      return 'w-8 h-8'
    case 'md':
      return 'w-10 h-10'
    case 'lg':
      return 'w-12 h-12'
    case 'xl':
      return 'w-16 h-16'
    case '2xl':
      return 'w-20 h-20'
    default:
      return 'w-10 h-10'
  }
})

const shapeClasses = computed(() => {
  switch (props.shape) {
    case 'circle':
      return 'rounded-full'
    case 'square':
      return 'rounded-none'
    case 'rounded':
      return 'rounded-md'
    default:
      return 'rounded-full'
  }
})

const avatarClasses = computed(() => {
  return [
    'relative inline-flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-secondary text-white font-semibold select-none',
    sizeClasses.value,
    shapeClasses.value
  ].join(' ')
})

const avatarStyle = computed(() => {
  return {}
})

const initialsClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'text-xs'
    case 'sm':
      return 'text-sm'
    case 'md':
      return 'text-base'
    case 'lg':
      return 'text-lg'
    case 'xl':
      return 'text-2xl'
    case '2xl':
      return 'text-3xl'
    default:
      return 'text-base'
  }
})

const statusClasses = computed(() => {
  const base = 'absolute bottom-0 right-0 block rounded-full ring-2 ring-white'
  const sizeClass = props.size === 'xs' || props.size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'

  let colorClass = ''
  switch (props.status) {
    case 'online':
      colorClass = 'bg-success'
      break
    case 'offline':
      colorClass = 'bg-neutral-400'
      break
    case 'away':
      colorClass = 'bg-yellow-500'
      break
    case 'busy':
      colorClass = 'bg-error'
      break
  }

  return [base, sizeClass, colorClass].join(' ')
})

const handleImageError = () => {
  imageError.value = true
}
</script>
