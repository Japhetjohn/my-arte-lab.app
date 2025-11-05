<template>
  <span :class="badgeClasses">
    <slot />
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'primary', 'secondary', 'success', 'error', 'warning', 'info'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  },
  dot: {
    type: Boolean,
    default: false
  }
})

const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-full'

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-gradient-to-r from-primary to-secondary text-white shadow-sm'
    case 'secondary':
      return 'bg-gradient-to-r from-secondary to-primary text-white shadow-sm'
    case 'success':
      return 'bg-success text-white shadow-sm'
    case 'error':
      return 'bg-error text-white shadow-sm'
    case 'warning':
      return 'bg-yellow-500 text-white shadow-sm'
    case 'info':
      return 'bg-blue-500 text-white shadow-sm'
    case 'default':
    default:
      return 'bg-neutral-100 text-neutral-700 border border-neutral-200'
  }
})

const sizeClasses = computed(() => {
  if (props.dot) {
    switch (props.size) {
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
    case 'sm':
      return 'px-2 py-0.5 text-xs'
    case 'md':
      return 'px-2.5 py-1 text-sm'
    case 'lg':
      return 'px-3 py-1.5 text-base'
    default:
      return 'px-2.5 py-1 text-sm'
  }
})

const badgeClasses = computed(() => {
  return [
    baseClasses,
    variantClasses.value,
    sizeClasses.value
  ].join(' ')
})
</script>
