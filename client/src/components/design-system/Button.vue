<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
    :aria-label="ariaLabel"
    @click="$emit('click', $event)"
  >
    <!-- Shimmer effect for primary buttons -->
    <span v-if="variant === 'primary' && !disabled" class="absolute inset-0 overflow-hidden rounded-lg">
      <span class="absolute inset-0 shimmer opacity-0 hover:opacity-100 transition-opacity duration-500"></span>
    </span>

    <!-- Loading Spinner -->
    <svg
      v-if="loading"
      class="animate-spin h-4 w-4 mr-2 relative z-10"
      :class="spinnerColor"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>

    <!-- Icon (Left) -->
    <span v-if="$slots.iconLeft && !loading" class="mr-2 relative z-10 transition-transform duration-200 group-hover:scale-110">
      <slot name="iconLeft" />
    </span>

    <!-- Button Text -->
    <span class="relative z-10"><slot /></span>

    <!-- Icon (Right) -->
    <span v-if="$slots.iconRight && !loading" class="ml-2 relative z-10 transition-transform duration-200 group-hover:scale-110">
      <slot name="iconRight" />
    </span>
  </button>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'secondary', 'ghost', 'danger', 'glass'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(value)
  },
  type: {
    type: String,
    default: 'button',
    validator: (value) => ['button', 'submit', 'reset'].includes(value)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  fullWidth: {
    type: Boolean,
    default: false
  },
  ariaLabel: {
    type: String,
    default: null
  }
})

defineEmits(['click'])

const baseClasses = 'group relative inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden'

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-600 text-white hover:shadow-glow hover:scale-[1.02] active:scale-[0.98] shadow-lg'
    case 'secondary':
      return 'border-2 border-primary-500 text-primary-400 bg-transparent hover:bg-primary-500/10 hover:border-primary-400 active:bg-primary-500/20 backdrop-blur-sm'
    case 'ghost':
      return 'text-primary-400 bg-transparent hover:bg-primary-500/10 active:bg-primary-500/20'
    case 'danger':
      return 'bg-gradient-to-r from-error-600 to-error-500 text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:scale-[1.02] active:scale-[0.98] shadow-lg'
    case 'glass':
      return 'glass glass-hover text-white shadow-glass'
    default:
      return ''
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'xs':
      return 'px-3 py-1.5 text-xs h-8'
    case 'sm':
      return 'px-4 py-2 text-sm h-9'
    case 'md':
      return 'px-6 py-3 text-base h-11'
    case 'lg':
      return 'px-8 py-3.5 text-lg h-12'
    case 'xl':
      return 'px-10 py-4 text-xl h-14'
    default:
      return ''
  }
})

const widthClasses = computed(() => {
  return props.fullWidth ? 'w-full' : ''
})

const spinnerColor = computed(() => {
  switch (props.variant) {
    case 'primary':
    case 'danger':
    case 'glass':
      return 'text-white'
    case 'secondary':
    case 'ghost':
      return 'text-primary-400'
    default:
      return 'text-white'
  }
})

const buttonClasses = computed(() => {
  return [
    baseClasses,
    variantClasses.value,
    sizeClasses.value,
    widthClasses.value
  ].join(' ')
})
</script>
