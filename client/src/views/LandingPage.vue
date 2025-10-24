<template>
  <div class="container mx-auto p-4">
    <h1 class="text-3xl font-bold">Welcome to MyArteLab</h1>
    <div class="mt-4">
      <router-link to="/creator/onboarding" class="btn bg-blue-500 text-white p-2 mr-2">I'm a Creator</router-link>
      <router-link to="/client/onboarding" class="btn bg-green-500 text-white p-2">I'm a Client</router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LandingPage',
}
</script>
