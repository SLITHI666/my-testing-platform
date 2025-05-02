<template>
  <v-container>
    <h2>Статистика по тесту: {{ testTitle }}</h2>
    <v-card class="pa-4">
      <v-card-text>
        <p>Количество попыток: {{ attempts.length }}</p>
        <p>Средний балл: {{ averageScore.toFixed(2) }}%</p>

        <h3>Попытки:</h3>
        <v-data-table
          :headers="attemptsHeaders"
          :items="attempts"
          class="elevation-1"
          item-key="id"
        >
          <template #[`item.finished_at`]="{ item }">
            <v-btn color="primary" @click="openAttemptDetails(item)">
              {{ item.finished_at }}
            </v-btn>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Модальное окно для подробностей по попытке -->
    <v-dialog v-model="attemptDetailsDialog" max-width="800">
      <v-card>
        <v-card-title class="text-h5">{{ selectedAttemptDate }} — Детали попытки</v-card-title>
        <v-card-text>
          <div v-if="attemptQuestions.length > 0">
            <div
              v-for="(question, index) in attemptQuestions"
              :key="index"
              class="question-block"
            >
              <h4 :class="{ 'incorrect-question': !question.isCorrect }">
                {{ question.question_text }}
              </h4>

              <!-- Вопрос со свободным ответом -->
              <div v-if="question.question_type === 'free_text'">
                <p>Ваш ответ: {{ question.userAnswerText }}</p>
                <p>Правильный ответ: {{ question.correctAnswerText }}</p>
              </div>

              <!-- Вопрос с вариантами ответа -->
              <div v-else>
                <v-list dense>
                  <v-list-item
                    v-for="option in question.options"
                    :key="option.id"
                  >
                    <!-- Иконка галочки или крестика -->
                    <v-list-item-icon v-if="question.userSelection.includes(option.id)">
                      <v-icon color="green" v-if="option.is_correct">mdi-check-circle</v-icon>
                      <v-icon color="red" v-else>mdi-close-circle</v-icon>
                    </v-list-item-icon>

                    <!-- Отступ для невыбранных опций -->
                    <v-list-item-icon v-else>
                      <v-icon></v-icon>
                    </v-list-item-icon>

                    <v-list-item-content>
                      <span
                        :class="{
                          'correct-answer': option.is_correct && !question.userSelection.includes(option.id),
                          'user-wrong-answer': !option.is_correct && question.userSelection.includes(option.id)
                        }"
                      >
                        {{ option.option_text }}
                      </span>
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
              </div>
            </div>
          </div>
          <div v-else>Нет данных для отображения</div>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" text @click="attemptDetailsDialog = false">Закрыть</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { supabase } from '../supabase';

export default {
  name: 'TestStatistics',
  data() {
    return {
      testId: null,
      testTitle: '',
      attempts: [],
      averageScore: 0,
      attemptQuestions: [],
      selectedAttemptDate: '',
      attemptDetailsDialog: false,
      selectedAttemptId: null,
      attemptsHeaders: [
        { text: 'Дата завершения', value: 'finished_at' },
        { text: 'Результат (%)', value: 'score' },
      ],
    };
  },
  async created() {
    this.testId = this.$route.params.testId;
    await this.fetchTestStatistics();
  },
  methods: {
    async fetchTestStatistics() {
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

        const { data: attemptsData, error: attemptsError } = await supabase
          .from('test_attempts')
          .select('id, finished_at, score')
          .eq('user_id', user.id)
          .eq('test_id', this.testId)
          .order('finished_at', { ascending: false });

        if (attemptsError) {
          console.error('Ошибка при получении попыток:', attemptsError.message);
          return;
        }

        this.attempts = attemptsData.map((attempt) => ({
          id: attempt.id,
          finished_at: attempt.finished_at
            ? new Date(attempt.finished_at).toLocaleString()
            : 'Не завершено',
          score: attempt.score ? attempt.score.toFixed(2) : '0',
        }));

        this.averageScore =
          this.attempts.reduce((sum, attempt) => sum + (parseFloat(attempt.score) || 0), 0) /
          this.attempts.length;
      } catch (error) {
        console.error('Ошибка при получении статистики теста:', error.message);
      }
    },

    async openAttemptDetails(attempt) {
      if (!attempt.id) {
        console.error('Попытка не имеет id:', attempt);
        return;
      }

      this.selectedAttemptId = attempt.id;
      this.selectedAttemptDate = attempt.finished_at;
      this.attemptQuestions = [];
      this.attemptDetailsDialog = true;

      try {
        const { data: questionsData, error: questionsError } = await supabase
          .from('questions')
          .select(
            `
            id, question_text, question_type,
            options (id, option_text, is_correct),
            user_answers!inner(selected_option_id, answer_text)
          `
          )
          .eq('test_id', this.testId)
          .eq('user_answers.attempt_id', this.selectedAttemptId);

        if (questionsError) {
          console.error('Ошибка при загрузке вопросов:', questionsError.message);
          return;
        }

        this.attemptQuestions = questionsData.map((question) => {
          const userSelection = question.user_answers
            .map((answer) => answer.selected_option_id)
            .filter((id) => id !== null); // Для вопросов со свободным ответом selected_option_id может быть null

          const userAnswerText = question.user_answers
            .map((answer) => answer.answer_text)
            .find((text) => text !== null) || '';

          const correctOptionIds = question.options
            .filter((option) => option.is_correct)
            .map((option) => option.id);

          let isCorrect = false;
          let correctAnswerText = '';

          if (question.question_type === 'free_text') {
            const correctOption = question.options.find((option) => option.is_correct);
            correctAnswerText = correctOption ? correctOption.option_text : '';

            const normalizeString = (str) => {
              return str
                .trim()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ');
            };

            const formattedUserAnswer = normalizeString(userAnswerText);
            const formattedCorrectAnswer = normalizeString(correctAnswerText);

            isCorrect = formattedUserAnswer === formattedCorrectAnswer;
          } else if (question.question_type === 'multiple_choice') {
            isCorrect =
              userSelection.length === correctOptionIds.length &&
              userSelection.every((id) => correctOptionIds.includes(id));
          } else if (question.question_type === 'single_choice') {
            isCorrect =
              userSelection.length === 1 && correctOptionIds.includes(userSelection[0]);
          }

          return {
            ...question,
            userSelection,
            userAnswerText,
            isCorrect,
            correctAnswerText,
          };
        });
      } catch (error) {
        console.error('Ошибка при загрузке вопросов:', error.message);
      }
    },
  },
};
</script>

<style>
.v-card {
  max-width: 800px;
  margin: auto;
}
.correct-answer {
  color: green;
  font-style: italic;
}
.user-wrong-answer {
  color: red;
}
.incorrect-question {
  color: red;
}
</style>
