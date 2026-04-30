import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('pages/IndexPage.vue') },
      { 
        path: 'study', 
        name: 'study', 
        component: () => import('pages/StudyPage.vue'),
        meta: { requiresAuth: true }
      },
      { 
        path: 'vocab', 
        name: 'vocab', 
        component: () => import('pages/VocabPage.vue'),
        meta: { requiresAuth: true }
      },
      { 
        path: 'settings', 
        name: 'settings', 
        component: () => import('pages/SettingsPage.vue'),
        meta: { requiresAuth: true }
      },
    ],
  },
  {
    path: '/auth',
    name: 'auth',
    component: () => import('pages/AuthPage.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
