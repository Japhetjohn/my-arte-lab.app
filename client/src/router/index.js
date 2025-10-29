import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Signup from '../views/Signup.vue'
import EmailSignup from '../views/EmailSignup.vue'
import EmailSignin from '../views/EmailSignin.vue'
import Discover from '../views/Discover.vue'
import CreatorProfile from '../views/CreatorProfile.vue'
import CreatorOnboarding from '../views/CreatorOnboarding.vue'
import CreatorDashboard from '../views/CreatorDashboard.vue'
import ClientOnboarding from '../views/ClientOnboarding.vue'
import ClientDashboard from '../views/ClientDashboard.vue'
import VerifyEmail from '../views/VerifyEmail.vue'
import AuthCallback from '../views/AuthCallback.vue'
import TestPage from '../views/TestPage.vue'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/', name: 'Home', component: Signup },
  { path: '/signup', name: 'Signup', component: Signup },
  { path: '/test', name: 'Test', component: TestPage },
  { path: '/login', name: 'Login', component: Login },
  { path: '/email-signup', name: 'EmailSignup', component: EmailSignup },
  { path: '/email-signin', name: 'EmailSignin', component: EmailSignin },
  { path: '/verify-email/:token', name: 'VerifyEmail', component: VerifyEmail },
  { path: '/auth/callback', name: 'AuthCallback', component: AuthCallback },
  { path: '/discover', name: 'Discover', component: Discover },
  { path: '/creator/:id', name: 'CreatorProfile', component: CreatorProfile },
  {
    path: '/creator/onboarding',
    name: 'CreatorOnboarding',
    component: CreatorOnboarding,
    meta: { requiresAuth: true, role: 'creator' }
  },
  {
    path: '/creator/dashboard',
    name: 'CreatorDashboard',
    component: CreatorDashboard,
    meta: { requiresAuth: true, role: 'creator' }
  },
  {
    path: '/client/onboarding',
    name: 'ClientOnboarding',
    component: ClientOnboarding,
    meta: { requiresAuth: true, role: 'client' }
  },
  {
    path: '/client/dashboard',
    name: 'ClientDashboard',
    component: ClientDashboard,
    meta: { requiresAuth: true, role: 'client' }
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.meta.role && authStore.user?.role !== to.meta.role) {
    next('/')
  } else {
    next()
  }
})

export default router
