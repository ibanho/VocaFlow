<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title class="text-weight-bold">
          <q-icon name="menu_book" size="sm" class="q-mr-sm" />
          VocaFlow
        </q-toolbar-title>
        
        <q-space />

        <div v-if="authStore.session">
          <q-btn flat dense round icon="account_circle" class="q-mr-sm" />
          <q-btn flat round dense icon="logout" @click="handleLogout" />
        </div>
        <div v-else>
          <q-btn flat label="로그인" to="/auth" />
        </div>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer bordered class="bg-white text-primary" v-if="authStore.session">
      <q-tabs no-caps active-color="primary" indicator-color="transparent" class="text-grey-7" v-model="tab">
        <q-route-tab name="home" icon="home" label="홈" to="/" exact />
        <q-route-tab name="study" icon="school" label="학습" to="/study" exact />
        <q-route-tab name="vocab" icon="menu_book" label="단어장" to="/vocab" exact />
        <q-route-tab name="settings" icon="settings" label="설정" to="/settings" exact />
      </q-tabs>
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from 'src/stores/authStore';
import { useRouter } from 'vue-router';

const tab = ref('home');

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = async () => {
  await authStore.logout();
  router.push('/auth');
};
</script>
