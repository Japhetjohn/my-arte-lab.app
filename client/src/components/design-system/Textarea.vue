<template>
  <div class="w-full">
    <!-- Label -->
    <label v-if="label" :for="textareaId" class="block text-sm font-medium text-neutral-700 mb-1.5">
      {{ label }}
      <span v-if="required" class="text-error ml-1">*</span>
    </label>

    <!-- Textarea Field -->
    <textarea
      :id="textareaId"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :rows="rows"
      :maxlength="maxLength"
      :class="textareaClasses"
      :aria-label="ariaLabel || label"
      :aria-describedby="error ? `${textareaId}-error` : helpText ? `${textareaId}-help` : undefined"
      :aria-invalid="error ? 'true' : 'false'"
      @input="handleInput"
      @blur="$emit('blur', $event)"
      @focus="$emit('focus', $event)"
    ></textarea>

    <!-- Character Count & Help Text -->
    <div class="flex items-center justify-between mt-1.5">
      <p v-if="helpText && !error" :id="`${textareaId}-help`" class="text-sm text-neutral-500">
        {{ helpText }}
      </p>
      <p v-if="error" :id="`${textareaId}-error`" class="text-sm text-error flex items-center gap-1">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        {{ error }}
      </p>
      <span v-if="maxLength" class="text-sm text-neutral-400 ml-auto">
        {{ characterCount }}/{{ maxLength }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
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
  rows: {
    type: Number,
    default: 4
  },
  maxLength: {
    type: Number,
    default: null
  },
  ariaLabel: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus'])

const textareaId = computed(() => `textarea-${Math.random().toString(36).substr(2, 9)}`)

const characterCount = computed(() => props.modelValue.length)

const baseClasses = 'w-full px-4 py-2.5 text-base rounded-md border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed resize-none'

const stateClasses = computed(() => {
  if (props.error) {
    return 'border-error text-error focus:border-error focus:ring-error'
  }
  return 'border-neutral-300 text-neutral-900 focus:border-primary focus:ring-primary placeholder-neutral-400'
})

const textareaClasses = computed(() => {
  return [baseClasses, stateClasses.value].join(' ')
})

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}
</script>
