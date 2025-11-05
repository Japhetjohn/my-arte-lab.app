<template>
  <div class="w-full">
    <!-- Label -->
    <label v-if="label" :for="inputId" class="block text-sm font-medium text-neutral-300 mb-2 transition-colors duration-200">
      {{ label }}
      <span v-if="required" class="text-error-400 ml-1">*</span>
    </label>

    <!-- Input Container -->
    <div class="relative group">
      <!-- Glow effect on focus -->
      <div class="absolute -inset-[1px] bg-gradient-to-r from-primary-600 to-secondary-600 rounded-lg opacity-0 group-focus-within:opacity-20 blur transition-opacity duration-300"></div>

      <!-- Icon Left -->
      <div v-if="$slots.iconLeft" class="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-500 group-focus-within:text-primary-400 transition-colors duration-200 z-10">
        <slot name="iconLeft" />
      </div>

      <!-- Input Field -->
      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :required="required"
        :autocomplete="autocomplete"
        :class="inputClasses"
        :aria-label="ariaLabel || label"
        :aria-describedby="error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined"
        :aria-invalid="error ? 'true' : 'false'"
        @input="$emit('update:modelValue', $event.target.value)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />

      <!-- Icon Right -->
      <div v-if="$slots.iconRight" class="absolute right-4 top-1/2 transform -translate-y-1/2 text-neutral-500 group-focus-within:text-primary-400 transition-colors duration-200 z-10">
        <slot name="iconRight" />
      </div>
    </div>

    <!-- Help Text -->
    <p v-if="helpText && !error" :id="`${inputId}-help`" class="mt-2 text-sm text-neutral-500">
      {{ helpText }}
    </p>

    <!-- Error Message -->
    <p v-if="error" :id="`${inputId}-error`" class="mt-2 text-sm text-error-400 flex items-center gap-1.5 animate-fade-in-down">
      <svg class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
      </svg>
      {{ error }}
    </p>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  label: {
    type: String,
    default: null
  },
  placeholder: {
    type: String,
    default: ''
  },
  helpText: {
    type: String,
    default: null
  },
  error: {
    type: String,
    default: null
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  required: {
    type: Boolean,
    default: false
  },
  autocomplete: {
    type: String,
    default: 'off'
  },
  ariaLabel: {
    type: String,
    default: null
  },
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'glass'].includes(value)
  }
})

defineEmits(['update:modelValue', 'blur', 'focus'])

const inputId = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`)

const baseClasses = 'relative w-full px-4 py-3 text-base rounded-lg border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed'

const variantClasses = computed(() => {
  if (props.variant === 'glass') {
    return 'bg-white/5 backdrop-blur-md border-white/10'
  }
  return 'bg-dark-100'
})

const stateClasses = computed(() => {
  if (props.error) {
    return 'border-error-500 text-error-300 focus:border-error-400 focus:ring-error-500/50 bg-error-950/20'
  }
  return 'border-dark-300 text-white focus:border-primary-500 focus:ring-primary-500/50 placeholder-neutral-500'
})

const iconPaddingClasses = computed(() => {
  const classes = []
  if (props.$slots?.iconLeft) classes.push('pl-11')
  if (props.$slots?.iconRight) classes.push('pr-11')
  return classes.join(' ')
})

const inputClasses = computed(() => {
  return [
    baseClasses,
    variantClasses.value,
    stateClasses.value,
    iconPaddingClasses.value
  ].join(' ')
})
</script>
