<template>
  <v-container>
    <v-card>
      <v-card-title>Пользователи, прошедшие тест "{{ testTitle }}"</v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item
            v-for="user in users"
            :key="user.id"
            @click="viewUserAttempts(user.id)"
          >
            <v-list-item-content>
              <v-list-item-title>{{ user.username }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import { supabase } from '../supabase';

export default {
  name: 'TestUsers',
  data() {
    return {
      testId: null,
      testTitle: '',
      users: [],
    };
  },
  async created() {
    this.testId = this.$route.params.testId;
    await this.fetchUsers();
  },
  methods: {
    async fetchUsers() {
      try {
        // Получаем название теста
        const { data: testData, error: testError } = await supabase
          .from('tests')
          .select('title')
          .eq('id', this.testId)
          .single();

        if (testError) {
          console.error('Ошибка при получении данных теста:', testError.message);
          return;
        }

        this.testTitle = testData.title;

        // Получаем список уникальных пользователей, прошедших тест
        const { data: attemptsData, error: attemptsError } = await supabase
          .from('test_attempts')
          .select('user_id, users(username)')
          .eq('test_id', this.testId);

        if (attemptsError) {
          console.error('Ошибка при получении попыток:', attemptsError.message);
          return;
        }

        // Создаем уникальный список пользователей
        const uniqueUsersMap = {};
        attemptsData.forEach((attempt) => {
          const userId = attempt.user_id;
          if (!uniqueUsersMap[userId]) {
            uniqueUsersMap[userId] = {
              id: userId,
              username: attempt.users.username,
            };
          }
        });

        this.users = Object.values(uniqueUsersMap);
      } catch (error) {
        console.error('Ошибка при получении пользователей:', error.message);
      }
    },
    viewUserAttempts(userId) {
      this.$router.push({
        name: 'UserAttempts',
        params: { testId: this.testId, userId },
      });
    },
  },
};
</script>
