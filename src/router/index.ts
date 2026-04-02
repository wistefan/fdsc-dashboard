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
    path: '/til/new',
    name: 'til-create',
    component: () => import('@/views/til/TilFormView.vue'),
  },
  {
    path: '/til/:did/edit',
    name: 'til-edit',
    component: () => import('@/views/til/TilFormView.vue'),
    props: true,
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
    path: '/ccs/new',
    name: 'ccs-create',
    component: () => import('@/views/ccs/CcsFormView.vue'),
  },
  {
    path: '/ccs/:id/edit',
    name: 'ccs-edit',
    component: () => import('@/views/ccs/CcsFormView.vue'),
    props: true,
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
    path: '/policies/new',
    name: 'policy-create',
    component: () => import('@/views/policies/PolicyFormView.vue'),
  },
  {
    path: '/policies/:id/edit',
    name: 'policy-edit',
    component: () => import('@/views/policies/PolicyFormView.vue'),
    props: true,
  },
  {
    path: '/policies/:id',
    name: 'policy-detail',
    component: () => import('@/views/policies/PolicyDetailView.vue'),
    props: true,
  },
  {
    path: '/policies/service/:serviceId/new',
    name: 'service-policy-create',
    component: () => import('@/views/policies/PolicyFormView.vue'),
    props: true,
  },
  {
    path: '/policies/service/:serviceId/:id/edit',
    name: 'service-policy-edit',
    component: () => import('@/views/policies/PolicyFormView.vue'),
    props: true,
  },
  {
    path: '/policies/service/:serviceId/:id',
    name: 'service-policy-detail',
    component: () => import('@/views/policies/PolicyDetailView.vue'),
    props: true,
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
