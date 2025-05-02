<template>
  <div v-if="isAuthenticated">
    <v-app-bar app color="primary" dark>
      <v-toolbar-title @click="goToHome" style="cursor: pointer;">
        Платформа для тестирования
      </v-toolbar-title>
      <v-spacer></v-spacer>

      

      <v-btn icon @click="drawer = !drawer">
        <v-icon>mdi-menu</v-icon>
      </v-btn>
    </v-app-bar>

    <!-- Боковая навигация -->
    <v-navigation-drawer v-model="drawer" app right>
      <v-list>
        <v-list-item @click="goToMyTests">
          <v-list-item-icon>
            <v-icon>mdi-file-document-outline</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Мои тесты</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item @click="goToMyStatistics">
          <v-list-item-icon>
            <v-icon>mdi-chart-bar</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Моя статистика</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item @click="goToProfile">
          <v-list-item-icon>
            <v-icon>mdi-account-circle</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Личный кабинет</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <!-- Новая вкладка для пользователей -->
        <v-list-item @click="goToUsers">
          <v-list-item-icon>
            <v-icon>mdi-account-group</v-icon> <!-- Иконка группы пользователей -->
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Пользователи</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item @click="goToHome">
          <v-list-item-icon>
            <v-icon>mdi-home</v-icon> <!-- Иконка домика -->
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Главная</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        
        <v-list-item @click="logout">
          <v-list-item-icon>
            <v-icon>mdi-door</v-icon> <!-- Иконка двери -->
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title>Выйти</v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
  </div>
</template>

<script>
import { supabase } from '../supabase';

export default {
  name: 'NavBar',
  data() {
    return {
      drawer: false,
      isAuthenticated: false,
    };
  },
  async mounted() {
    // Проверка статуса авторизации при загрузке компонента
    const { data: { user } } = await supabase.auth.getUser();
    this.isAuthenticated = !!user;

    // Подписка на изменения авторизации
    supabase.auth.onAuthStateChange((event, session) => {
      this.isAuthenticated = !!session;
    });
  },
  methods: {
    goToHome() {
      this.$router.push('/');
    },
    goToMyTests() {
      this.$router.push('/my-tests');
    },
    goToMyStatistics() {
      this.$router.push('/my-statistics');
    },
    goToProfile() {
      this.$router.push('/profile');
    },
    goToUsers() {
      this.$router.push('/users'); // Переход на страницу пользователей
    },
    async logout() {
      await supabase.auth.signOut();
      this.isAuthenticated = false;
      this.$router.push('/auth');
    },
  },
};
</script>