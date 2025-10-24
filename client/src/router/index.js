import { createRouter, createWebHistory } from 'vue-router'
import LandingPage from '../views/LandingPage.vue'
import CreatorOnboarding from '../views/CreatorOnboarding.vue'
import ClientOnboarding from '../views/ClientOnboarding.vue'

const routes = [
  { path: '/', name: 'Landing', component: LandingPage },
  { path: '/creator/onboarding', name: 'CreatorOnboarding', component: CreatorOnboarding },
  { path: '/client/onboarding', name: 'ClientOnboarding', component: ClientOnboarding },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
