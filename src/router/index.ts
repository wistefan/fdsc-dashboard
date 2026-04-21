/*
 * Copyright 2026 Seamless Middleware Technologies S.L and/or its affiliates
 * and other contributors as indicated by the @author tags.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
