<template>
  <div
    :class="cardClasses"
    @click="clickable ? $emit('click', $event) : null"
  >
    <!-- Glow effect on hover for premium variant -->
    <div v-if="variant === 'premium'" class="absolute -inset-[1px] bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl opacity-0 group-hover:opacity-50 blur-xl transition-opacity duration-500 -z-10"></div>

    <!-- Card Header -->
    <div v-if="$slots.header" :class="headerClasses">
      <slot name="header" />
    </div>

    <!-- Card Body -->
    <div :class="bodyClasses">
      <slot />
    </div>

    <!-- Card Footer -->
    <div v-if="$slots.footer" :class="footerClasses">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'bordered', 'elevated', 'flat', 'glass', 'glass-dark', 'premium'].includes(value)
  },
  padding: {
    type: String,
    default: 'md',
    validator: (value) => ['none', 'sm', 'md', 'lg', 'xl'].includes(value)
  },
  clickable: {
    type: Boolean,
    default: false
  },
  hoverable: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])

const baseClasses = 'group relative rounded-xl transition-all duration-300 overflow-hidden'

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'default':
      return 'bg-dark-100 border border-dark-300'
    case 'bordered':
      return 'bg-dark-100 border-2 border-primary-500/30'
    case 'elevated':
      return 'bg-dark-100 shadow-card hover:shadow-card-hover border border-dark-300/50'
    case 'flat':
      return 'bg-dark-50'
    case 'glass':
      return 'glass shadow-glass backdrop-blur-xl'
    case 'glass-dark':
      return 'glass-dark shadow-glass backdrop-blur-xl'
    case 'premium':
      return 'bg-gradient-to-br from-dark-100 via-dark-50 to-dark-100 border border-primary-500/20 shadow-premium card-premium'
    default:
      return ''
  }
})

const interactionClasses = computed(() => {
  const classes = []
  if (props.clickable) {
    classes.push('cursor-pointer')
  }
  if (props.hoverable || props.clickable) {
    classes.push('hover:shadow-card-hover hover:scale-[1.01] hover:border-primary-500/40')
  }
  return classes.join(' ')
})

const paddingClasses = computed(() => {
  switch (props.padding) {
    case 'none':
      return ''
    case 'sm':
      return 'p-4'
    case 'md':
      return 'p-6'
    case 'lg':
      return 'p-8'
    case 'xl':
      return 'p-10'
    default:
      return ''
  }
})

const cardClasses = computed(() => {
  return [
    baseClasses,
    variantClasses.value,
    interactionClasses.value,
    paddingClasses.value
  ].join(' ')
})

const headerClasses = computed(() => {
  const base = 'border-b border-dark-300/50 mb-4'
  return props.padding === 'none' ? `${base} px-6 py-4` : `${base} pb-4`
})

const bodyClasses = computed(() => {
  return props.padding === 'none' ? 'px-6 py-4' : ''
})

const footerClasses = computed(() => {
  const base = 'border-t border-dark-300/50 mt-4'
  return props.padding === 'none' ? `${base} px-6 py-4` : `${base} pt-4`
})
</script>
