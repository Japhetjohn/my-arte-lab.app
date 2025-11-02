<template>
  <div
    :class="cardClasses"
    @click="clickable ? $emit('click', $event) : null"
  >
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
    validator: (value) => ['default', 'bordered', 'elevated', 'flat'].includes(value)
  },
  padding: {
    type: String,
    default: 'md',
    validator: (value) => ['none', 'sm', 'md', 'lg'].includes(value)
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

const baseClasses = 'rounded-md transition-all duration-200'

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'default':
      return 'bg-white border border-neutral-200'
    case 'bordered':
      return 'bg-white border-2 border-neutral-300'
    case 'elevated':
      return 'bg-white shadow-card hover:shadow-card-hover'
    case 'flat':
      return 'bg-neutral-50'
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
    classes.push('hover:shadow-card-hover')
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
    default:
      return ''
  }
})

const cardClasses = computed(() => {
  return [
    baseClasses,
    variantClasses.value,
    interactionClasses.value,
    props.padding === 'none' ? '' : ''
  ].join(' ')
})

const headerClasses = computed(() => {
  const base = 'border-b border-neutral-200'
  return props.padding === 'none' ? `${base} px-6 py-4` : `${base} -mx-6 -mt-6 px-6 py-4 mb-6`
})

const bodyClasses = computed(() => {
  return props.padding === 'none' ? 'px-6 py-4' : ''
})

const footerClasses = computed(() => {
  const base = 'border-t border-neutral-200'
  return props.padding === 'none' ? `${base} px-6 py-4` : `${base} -mx-6 -mb-6 px-6 py-4 mt-6`
})
</script>
