<template>
  <div class="w-full">
    <!-- Label -->
    <label v-if="label" :for="selectId" class="block text-sm font-medium text-neutral-700 mb-1.5">
      {{ label }}
      <span v-if="required" class="text-error ml-1">*</span>
    </label>

    <!-- Select Container -->
    <div class="relative">
      <select
        :id="selectId"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :class="selectClasses"
        :aria-label="ariaLabel || label"
        :aria-describedby="error ? `${selectId}-error` : helpText ? `${selectId}-help` : undefined"
        :aria-invalid="error ? 'true' : 'false'"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option
          v-for="option in options"
          :key="option.value"
          :value="option.value"
          :disabled="option.disabled"
        >
          {{ option.label }}
        </option>
      </select>

      <!-- Dropdown Icon -->
      <div class="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-neutral-400">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>

    <!-- Help Text -->
    <p v-if="helpText && !error" :id="`${selectId}-help`" class="mt-1.5 text-sm text-neutral-500">
      {{ helpText }}
    </p>

    <!-- Error Message -->
    <p v-if="error" :id="`${selectId}-error`" class="mt-1.5 text-sm text-error flex items-center gap-1">
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
  options: {
    type: Array,
    required: true,
    validator: (value) => value.every(opt => opt.label && opt.value !== undefined)
  },
  label: {
    type: String,
    default: null
  },
  placeholder: {
    type: String,
    default: 'Select an option'
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
  required: {
    type: Boolean,
    default: false
  },
  ariaLabel: {
    type: String,
    default: null
  }
})

defineEmits(['update:modelValue'])

const selectId = computed(() => `select-${Math.random().toString(36).substr(2, 9)}`)

const baseClasses = 'w-full px-4 py-2.5 pr-10 text-base rounded-md border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed appearance-none bg-white'

const stateClasses = computed(() => {
  if (props.error) {
    return 'border-error text-error focus:border-error focus:ring-error'
  }
  return 'border-neutral-300 text-neutral-900 focus:border-primary focus:ring-primary'
})

const selectClasses = computed(() => {
  return [baseClasses, stateClasses.value].join(' ')
})
</script>
