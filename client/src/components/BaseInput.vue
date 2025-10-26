<template>
  <div class="w-full">
    <label v-if="label" :for="id" class="block text-sm font-semibold mb-2" style="color: #1f2937;">
      {{ label }}
      <span v-if="required" style="color: #9747FF;">*</span>
    </label>
    <div class="relative">
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :class="inputClasses"
        @input="$emit('update:modelValue', $event.target.value)"
        @focus="focused = true"
        @blur="focused = false"
      />
    </div>
    <p v-if="error" class="mt-2 text-sm font-medium text-red-600 flex items-center">
      <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
      </svg>
      {{ error }}
    </p>
    <p v-else-if="hint" class="mt-2 text-sm text-gray-500">{{ hint }}</p>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  id: String,
  label: String,
  type: {
    type: String,
    default: 'text'
  },
  modelValue: [String, Number],
  placeholder: String,
  required: Boolean,
  disabled: Boolean,
  error: String,
  hint: String
})

defineEmits(['update:modelValue'])

const focused = ref(false)

const inputClasses = computed(() => {
  const base = 'block w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all'
  const error = props.error
    ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
    : 'border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
  const disabled = props.disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'

  return `${base} ${error} ${disabled}`
})
</script>
