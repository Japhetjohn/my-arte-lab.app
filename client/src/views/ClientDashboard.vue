<template>
  <div></div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Redirect to discover page immediately
onMounted(() => {
  router.push('/discover')
})
</script>

<style scoped>
/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #F5F5F5;
}

::-webkit-scrollbar-thumb {
  background: #E8E8E8;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #9747FF;
}
</style>
