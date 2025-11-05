<template>
  <span :class="badgeClasses">
    <!-- Dot indicator -->
    <span v-if="dot && !props.dot" class="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse-soft"></span>

    <!-- Icon slot -->
    <span v-if="$slots.icon" class="mr-1.5 flex items-center">
      <slot name="icon" />
    </span>

    <!-- Content -->
    <slot />
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'primary', 'secondary', 'success', 'error', 'warning', 'info', 'glass'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['xs', 'sm', 'md', 'lg'].includes(value)
  },
  dot: {
    type: Boolean,
    default: false
  },
  pulse: {
    type: Boolean,
    default: false
  }
})

const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 backdrop-blur-sm'

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-glow border border-primary-400/30'
    case 'secondary':
      return 'bg-gradient-to-r from-secondary-600 to-secondary-500 text-white shadow-[0_0_15px_rgba(107,70,255,0.3)] border border-secondary-400/30'
    case 'success':
      return 'bg-gradient-to-r from-success-600 to-success-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-success-400/30'
    case 'error':
      return 'bg-gradient-to-r from-error-600 to-error-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)] border border-error-400/30'
    case 'warning':
      return 'bg-gradient-to-r from-warning-600 to-warning-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)] border border-warning-400/30'
    case 'info':
      return 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-blue-400/30'
    case 'glass':
      return 'bg-white/10 text-white border border-white/20 backdrop-blur-md'
    case 'default':
    default:
      return 'bg-dark-200 text-neutral-300 border border-dark-300'
  }
})

const sizeClasses = computed(() => {
  if (props.dot) {
    switch (props.size) {
      case 'xs':
        return 'w-1.5 h-1.5'
      case 'sm':
        return 'w-2 h-2'
      case 'md':
        return 'w-2.5 h-2.5'
      case 'lg':
        return 'w-3 h-3'
      default:
        return 'w-2.5 h-2.5'
    }
  }

  switch (props.size) {
    case 'xs':
      return 'px-2 py-0.5 text-[10px] leading-tight'
    case 'sm':
      return 'px-2.5 py-0.5 text-xs'
    case 'md':
      return 'px-3 py-1 text-xs tracking-wide'
    case 'lg':
      return 'px-4 py-1.5 text-sm tracking-wide'
    default:
      return 'px-3 py-1 text-xs tracking-wide'
  }
})

const pulseClasses = computed(() => {
  return props.pulse ? 'animate-pulse-soft' : ''
})

const badgeClasses = computed(() => {
  return [
    baseClasses,
    variantClasses.value,
    sizeClasses.value,
    pulseClasses.value
  ].join(' ')
})
</script>
