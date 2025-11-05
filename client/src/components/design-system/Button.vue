<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
    :aria-label="ariaLabel"
    @click="$emit('click', $event)"
  >
    <!-- Loading Spinner -->
    <svg
      v-if="loading"
      class="animate-spin h-4 w-4 mr-2"
      :class="spinnerColor"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>

    <!-- Icon (Left) -->
    <span v-if="$slots.iconLeft && !loading" class="mr-2 transition-transform group-hover:scale-110">
      <slot name="iconLeft" />
    </span>

    <!-- Button Text -->
    <span class="relative z-10"><slot /></span>

    <!-- Icon (Right) -->
    <span v-if="$slots.iconRight && !loading" class="ml-2 transition-transform group-hover:translate-x-1">
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
    validator: (value) => ['primary', 'secondary', 'ghost', 'danger'].includes(value)
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
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

const baseClasses = 'group inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95'

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'primary':
      return 'bg-gradient-to-r from-primary via-secondary to-[#D946EF] text-white hover:shadow-lg hover:shadow-primary/50 active:shadow-md relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700'
    case 'secondary':
      return 'border-2 border-primary text-primary bg-white hover:bg-gradient-to-r hover:from-primary/5 hover:to-secondary/5 active:bg-primary/10 hover:shadow-md'
    case 'ghost':
      return 'text-primary bg-transparent hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10 active:bg-primary/15'
    case 'danger':
      return 'bg-error text-white hover:bg-error-dark active:bg-error-dark shadow-sm hover:shadow-lg'
    default:
      return ''
  }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm':
      return 'px-3 py-2 text-sm h-9'
    case 'md':
      return 'px-4 py-2.5 text-base h-11'
    case 'lg':
      return 'px-6 py-3 text-lg h-12'
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
      return 'text-white'
    case 'secondary':
    case 'ghost':
      return 'text-primary'
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
