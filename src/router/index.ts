import { defineRouter } from '#q-app/wrappers';
import {
  createMemoryHistory,
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';
import routes from './routes';

import { useAuthStore } from 'src/stores/authStore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default defineRouter(({ store }: any) => {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory;

  const Router = createRouter({
    scrollBehavior: () => ({ left: 0, top: 0 }),
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE),
  });

  Router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore(store);
    
    // Ensure auth state is initialized
    if (authStore.loading && !authStore.session) {
      await authStore.initialize();
    }

    const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
    const guestOnly = to.matched.some(record => record.meta.guestOnly);
    const isAuthenticated = !!authStore.session;

    if (requiresAuth && !isAuthenticated) {
      next({ name: 'auth', query: { redirect: to.fullPath } });
    } else if (guestOnly && isAuthenticated) {
      next({ name: 'home' });
    } else {
      next();
    }
  });

  return Router;
});
