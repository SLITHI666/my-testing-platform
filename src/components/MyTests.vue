<template>
  <v-container>
    <v-row>
      <v-col cols="12" v-for="test in myTests" :key="test.id">
        <v-card>
          <v-card-title>{{ test.title }}</v-card-title>
          <v-card-text>
            Количество прохождений: {{ test.attemptCount }}
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" @click="viewTestUsers(test.id)">
              Посмотреть прохождения
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { supabase } from '../supabase';

export default {
  name: 'MyTests',
  data() {
    return {
      myTests: [],
    };
  },
  async mounted() {
    await this.fetchMyTests();
  },
  methods: {
    async fetchMyTests() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error(
            'Ошибка при получении данных о пользователе:',
            userError?.message || 'Пользователь не авторизован'
          );
          return;
        }

        // Получаем список тестов пользователя с количеством попыток
        const { data: testsData, error: testsError } = await supabase
          .from('tests')
          .select('id, title, test_attempts(id)')
          .eq('user_id', user.id);

        if (testsError) {
          console.error('Ошибка при получении тестов:', testsError.message);
          return;
        }

        // Преобразуем данные, чтобы включить количество попыток
        this.myTests = testsData.map((test) => ({
          id: test.id,
          title: test.title,
          attemptCount: test.test_attempts ? test.test_attempts.length : 0,
        }));
      } catch (error) {
        console.error('Ошибка при загрузке тестов:', error.message);
      }
    },
    viewTestUsers(testId) {
      this.$router.push({ name: 'TestUsers', params: { testId } });
    },
  },
};
</script>
