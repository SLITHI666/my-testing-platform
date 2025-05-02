<!-- src/components/ProfileUsers.vue -->
<template>
  <v-container>
    <!-- Карточка профиля пользователя -->
    <v-card class="mb-5">
      <v-card-title>{{ user.username }}</v-card-title>
      <v-card-subtitle>{{ user.email }}</v-card-subtitle>
      <v-card-text>
        <p>Дата создания профиля: {{ user.created_at }}</p>
      </v-card-text>
    </v-card>

    <!-- Заголовок списка тестов -->
    <h3>Тесты, созданные пользователем</h3>

    <!-- Список тестов пользователя -->
    <v-row>
      <v-col cols="12" md="6" v-for="test in userTests" :key="test.id">
        <v-card class="mb-4">
          <v-card-title>{{ test.title }}</v-card-title>
          <v-card-text>{{ test.description }}</v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="goToTest(test)">
              Пройти тест
            </v-btn>
            <v-spacer></v-spacer>
            <v-icon v-if="test.password">mdi-lock</v-icon>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { supabase } from '../supabase';

export default {
  name: 'ProfileUsers',
  data() {
    return {
      user: {}, // Данные пользователя
      userTests: [], // Список тестов пользователя
    };
  },
  async created() {
    const userId = this.$route.params.userId;
    // Получаем информацию о пользователе
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('username, email, created_at')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Ошибка при получении данных пользователя:', userError);
    } else {
      this.user = user;
      // Получаем тесты пользователя после успешной загрузки данных профиля
      await this.fetchUserTests(userId);
    }
  },
  methods: {
    // Функция для получения тестов, созданных выбранным пользователем
    async fetchUserTests(userId) {
      const { data: tests, error: testsError } = await supabase
        .from('tests')
        .select('id, title, description, password')
        .eq('user_id', userId);

      if (testsError) {
        console.error('Ошибка при получении тестов пользователя:', testsError);
      } else {
        this.userTests = tests;
      }
    },
    // Переход к выбранному тесту с проверкой пароля
    async goToTest(test) {
      if (test.password) {
        const enteredPassword = prompt('Введите пароль для теста:');
        if (enteredPassword === test.password) {
          this.$router.push(`/tests/${test.id}`);
        } else {
          alert('Неверный пароль');
        }
      } else {
        this.$router.push(`/tests/${test.id}`);
      }
    },
  },
};
</script>

<style>
.v-container {
  padding: 16px;
}
.v-card {
  min-height: 150px;
}
</style>
