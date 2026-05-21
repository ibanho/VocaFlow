import { register } from 'register-service-worker';

if (process.env.PROD && process.env.SERVICE_WORKER_FILE) {
  register(process.env.SERVICE_WORKER_FILE, {
    ready() {
      console.log('App is being served from cache by a service worker.');
    },
    registered() {
      console.log('Service worker has been registered.');
    },
    cached() {
      console.log('Content has been cached for offline use.');
    },
    updatefound() {
      console.log('New content is downloading.');
    },
    updated() {
      console.log('New content is available; please refresh.');
    },
    offline() {
      console.log('No internet connection found. App is running in offline mode.');
    },
    error(err) {
      console.error('Error during service worker registration:', err);
    },
  });
}
