<template>
  <div class="w-full">
    <!-- Label -->
    <label v-if="label" :for="inputId" class="block text-sm font-medium text-neutral-700 mb-1.5">
      {{ label }}
      <span v-if="required" class="text-error ml-1">*</span>
    </label>

    <!-- Input Container -->
    <div class="relative">
      <!-- Icon Left -->
      <div v-if="$slots.iconLeft" class="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
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
      <div v-if="$slots.iconRight" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
        <slot name="iconRight" />
      </div>
    </div>

    <!-- Help Text -->
    <p v-if="helpText && !error" :id="`${inputId}-help`" class="mt-1.5 text-sm text-neutral-500">
      {{ helpText }}
    </p>

    <!-- Error Message -->
    <p v-if="error" :id="`${inputId}-error`" class="mt-1.5 text-sm text-error flex items-center gap-1">
      <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
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
  }
})

defineEmits(['update:modelValue', 'blur', 'focus'])

const inputId = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`)

const baseClasses = 'w-full px-4 py-2.5 text-base rounded-md border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'

const stateClasses = computed(() => {
  if (props.error) {
    return 'border-error text-error focus-visible:border-error focus-visible:ring-error'
  }
  return 'border-neutral-300 text-neutral-900 focus-visible:border-primary focus-visible:ring-primary placeholder-neutral-400'
})

const iconPaddingClasses = computed(() => {
  const classes = []
  if (props.$slots?.iconLeft) classes.push('pl-10')
  if (props.$slots?.iconRight) classes.push('pr-10')
  return classes.join(' ')
})

const inputClasses = computed(() => {
  return [
    baseClasses,
    stateClasses.value,
    iconPaddingClasses.value
  ].join(' ')
})
</script>
