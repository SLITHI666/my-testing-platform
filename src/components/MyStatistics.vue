<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>Моя статистика</v-card-title>
          <v-card-text>
            <ul>
              <li class="ml-5">Пройденных тестов: {{ statistics.testsTaken }}</li>
              <li class="ml-5">Средний балл: {{ statistics.averageScore.toFixed(2) }}</li>
            </ul>
            <h3>Статистика по тестам:</h3>
            <v-data-table
              :headers="testStatsHeaders"
              :items="testStatistics"
              class="elevation-1"
            >
              <template #[`item.actions`]="{ item }">
                <v-btn color="primary" @click="goToTestStatistics(item.testId)">
                  Подробнее
                </v-btn>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { supabase } from '../supabase';

export default {
  name: 'MyStatistics',
  data() {
    return {
      statistics: {
        testsTaken: 0,
        averageScore: 0,
      },
      testStatistics: [],
      testStatsHeaders: [
        { text: 'Название теста', value: 'testTitle' },
        { text: 'Попыток', value: 'attempts' },
        { text: 'Средний балл', value: 'averageScore' },
        { text: 'Действия', value: 'actions', sortable: false },
      ],
    };
  },
  async mounted() {
    await this.fetchUserStatistics();
  },
  methods: {
    async fetchUserStatistics() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
          console.error('Ошибка при получении данных о пользователе:', userError?.message || 'Пользователь не авторизован');
          return;
        }

        const userId = user.id;

        // Получаем общую статистику пользователя из таблицы user_statistics
        const { data: userStats, error: statsError } = await supabase
          .from('user_statistics')
          .select('tests_taken, average_score')
          .eq('user_id', userId)
          .single();

        if (statsError) {
          console.error('Ошибка при загрузке статистики:', statsError.message);
        } else {
          this.statistics.testsTaken = userStats?.tests_taken ?? 0;
          this.statistics.averageScore = userStats?.average_score ?? 0;
        }

        // Получаем список попыток пользователя с названиями тестов
        const { data: attempts, error: attemptsError } = await supabase
          .from('test_attempts')
          .select('id, test_id, score, tests(title)')
          .eq('user_id', userId);

        if (attemptsError) {
          console.error('Ошибка при загрузке попыток тестов:', attemptsError.message);
          return;
        }

        const testStatsMap = {};

        for (const attempt of attempts) {
          const testId = attempt.test_id;
          const testTitle = attempt.tests.title;

          if (!testStatsMap[testId]) {
            testStatsMap[testId] = {
              testId, // Добавляем testId для навигации
              testTitle,
              attempts: 0,
              totalScore: 0,
            };
          }

          testStatsMap[testId].attempts += 1;
          testStatsMap[testId].totalScore += attempt.score;
        }

        // Преобразуем данные в массив и вычисляем средний балл для каждого теста
        this.testStatistics = Object.values(testStatsMap).map(stat => {
          const averageScore = stat.totalScore / stat.attempts;
          return {
            testId: stat.testId, // Добавляем testId для навигации
            testTitle: stat.testTitle,
            attempts: stat.attempts,
            averageScore: averageScore.toFixed(2),
          };
        });

      } catch (error) {
        console.error('Ошибка при получении статистики:', error.message);
      }
    },
    goToTestStatistics(testId) {
      this.$router.push({ name: 'TestStatistics', params: { testId } });
    },
  },
};
</script>

<style>
.v-card {
  max-width: 800px;
  margin: auto;
}
</style>
