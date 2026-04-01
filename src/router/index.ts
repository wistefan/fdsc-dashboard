import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

/** Application route definitions. */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/til',
    name: 'til-list',
    component: () => import('@/views/til/TilListView.vue'),
  },
  {
    path: '/til/:did',
    name: 'til-detail',
    component: () => import('@/views/til/TilDetailView.vue'),
    props: true,
  },
  {
    path: '/ccs',
    name: 'ccs-list',
    component: () => import('@/views/ccs/CcsListView.vue'),
  },
  {
    path: '/ccs/:id',
    name: 'ccs-detail',
    component: () => import('@/views/ccs/CcsDetailView.vue'),
    props: true,
  },
  {
    path: '/policies',
    name: 'policies-list',
    component: () => import('@/views/policies/PolicyListView.vue'),
  },
  {
    path: '/policies/:id',
    name: 'policy-detail',
    component: () => import('@/views/policies/PolicyDetailView.vue'),
    props: true,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
