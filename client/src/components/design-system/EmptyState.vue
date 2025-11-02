<template>
  <div :class="containerClasses">
    <!-- Icon/Illustration Slot -->
    <div v-if="$slots.icon || icon" :class="iconContainerClasses">
      <slot name="icon">
        <component :is="iconComponent" :class="iconClasses" />
      </slot>
    </div>

    <!-- Title -->
    <h3 v-if="title" :class="titleClasses">
      {{ title }}
    </h3>

    <!-- Description -->
    <p v-if="description" :class="descriptionClasses">
      {{ description }}
    </p>

    <!-- Actions -->
    <div v-if="$slots.actions || primaryAction || secondaryAction" :class="actionsClasses">
      <slot name="actions">
        <button
          v-if="primaryAction"
          class="px-6 py-2.5 bg-gradient-to-r from-primary to-[#D946EF] text-white font-medium rounded-lg hover:opacity-90 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          @click="$emit('primary-action')"
        >
          {{ primaryAction }}
        </button>
        <button
          v-if="secondaryAction"
          class="px-6 py-2.5 text-primary font-medium hover:bg-primary/10 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          @click="$emit('secondary-action')"
        >
          {{ secondaryAction }}
        </button>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { computed, h } from 'vue'

const props = defineProps({
  icon: {
    type: String,
    default: 'inbox',
    validator: (value) => ['inbox', 'search', 'folder', 'image', 'users', 'file', 'alert', 'calendar', 'heart', 'star'].includes(value)
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  primaryAction: {
    type: String,
    default: ''
  },
  secondaryAction: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value)
  },
  centered: {
    type: Boolean,
    default: true
  }
})

defineEmits(['primary-action', 'secondary-action'])

const containerClasses = computed(() => {
  const classes = ['flex flex-col gap-4']

  if (props.centered) {
    classes.push('items-center text-center')
  }

  switch (props.size) {
    case 'sm':
      classes.push('max-w-sm py-8')
      break
    case 'md':
      classes.push('max-w-md py-12')
      break
    case 'lg':
      classes.push('max-w-lg py-16')
      break
  }

  return classes.join(' ')
})

const iconContainerClasses = computed(() => {
  const classes = ['flex items-center justify-center rounded-full bg-neutral-100']

  switch (props.size) {
    case 'sm':
      classes.push('w-12 h-12')
      break
    case 'md':
      classes.push('w-16 h-16')
      break
    case 'lg':
      classes.push('w-20 h-20')
      break
  }

  return classes.join(' ')
})

const iconClasses = computed(() => {
  const classes = ['text-neutral-400']

  switch (props.size) {
    case 'sm':
      classes.push('w-6 h-6')
      break
    case 'md':
      classes.push('w-8 h-8')
      break
    case 'lg':
      classes.push('w-10 h-10')
      break
  }

  return classes.join(' ')
})

const titleClasses = computed(() => {
  const classes = ['font-semibold text-neutral-900']

  switch (props.size) {
    case 'sm':
      classes.push('text-lg')
      break
    case 'md':
      classes.push('text-h2')
      break
    case 'lg':
      classes.push('text-h1')
      break
  }

  return classes.join(' ')
})

const descriptionClasses = computed(() => {
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
  }

  return classes.join(' ')
})

const actionsClasses = computed(() => {
  return 'flex flex-wrap items-center gap-3 mt-2'
})

// Icon components mapping
const iconComponents = {
  inbox: () => h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    'stroke-width': '2'
  }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' })
  ]),
  search: () => h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    'stroke-width': '2'
  }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' })
  ]),
  folder: () => h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    'stroke-width': '2'
  }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z' })
  ]),
  image: () => h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    'stroke-width': '2'
  }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' })
  ]),
  users: () => h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    'stroke-width': '2'
  }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' })
  ]),
  file: () => h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    'stroke-width': '2'
  }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z' })
  ]),
  alert: () => h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    'stroke-width': '2'
  }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' })
  ]),
  calendar: () => h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    'stroke-width': '2'
  }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' })
  ]),
  heart: () => h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    'stroke-width': '2'
  }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' })
  ]),
  star: () => h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    'stroke-width': '2'
  }, [
    h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', d: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' })
  ])
}

const iconComponent = computed(() => {
  return iconComponents[props.icon] || iconComponents.inbox
})
</script>
