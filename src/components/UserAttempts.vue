<template>
  <v-container>
    <v-card>
      <v-card-title>
        Попытки пользователя {{ userName }} в тесте "{{ testTitle }}"
      </v-card-title>
      <v-card-text>
        <v-list>
          <v-list-item
            v-for="attempt in attempts"
            :key="attempt.id"
            @click="viewAttemptDetails(attempt)"
          >
            <v-list-item-content>
              <v-list-item-title>
                {{ attempt.finished_at
                  ? new Date(attempt.finished_at).toLocaleString()
                  : 'Не завершено' }}
                — Результат: {{ attempt.score ? attempt.score.toFixed(2) : '0' }}%
              </v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- Модальное окно для подробностей по попытке -->
    <v-dialog v-model="attemptDetailsDialog" max-width="800">
      <v-card>
        <v-card-title class="text-h5">
          {{ selectedAttemptDate }} — Детали попытки
        </v-card-title>
        <v-card-text>
          <!-- Переиспользуем отображение деталей попытки -->
          <div v-if="attemptQuestions.length > 0">
            <!-- Отображение вопросов и ответов -->
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
                <p>Ответ пользователя: {{ question.userAnswerText }}</p>
                <p>Правильный ответ: {{ question.correctAnswerText }}</p>
              </div>

              <!-- Вопрос с вариантами ответа -->
              <div v-else>
                <v-list dense>
                  <v-list-item v-for="option in question.options" :key="option.id">
                    <v-list-item-icon
                      v-if="question.userSelection.includes(option.id)"
                    >
                      <v-icon color="green" v-if="option.is_correct"
                        >mdi-check-circle</v-icon
                      >
                      <v-icon color="red" v-else>mdi-close-circle</v-icon>
                    </v-list-item-icon>

                    <!-- Отступ для невыбранных опций -->
                    <v-list-item-icon v-else>
                      <v-icon></v-icon>
                    </v-list-item-icon>

                    <v-list-item-content>
                      <span
                        :class="{
                          'correct-answer':
                            option.is_correct &&
                            !question.userSelection.includes(option.id),
                          'user-wrong-answer':
                            !option.is_correct &&
                            question.userSelection.includes(option.id),
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
          <v-btn color="primary" text @click="attemptDetailsDialog = false">
            Закрыть
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { supabase } from '../supabase';

export default {
  name: 'UserAttempts',
  data() {
    return {
      testId: null,
      userId: null,
      testTitle: '',
      userName: '',
      attempts: [],
      attemptDetailsDialog: false,
      selectedAttempt: null,
      selectedAttemptDate: '',
      attemptQuestions: [],
    };
  },
  async created() {
    this.testId = this.$route.params.testId;
    this.userId = this.$route.params.userId;
    await this.fetchAttempts();
  },
  methods: {
    async fetchAttempts() {
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

        // Получаем имя пользователя
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('username')
          .eq('id', this.userId)
          .single();

        if (userError) {
          console.error('Ошибка при получении данных пользователя:', userError.message);
          return;
        }

        this.userName = userData.username;

        // Получаем попытки пользователя
        const { data: attemptsData, error: attemptsError } = await supabase
          .from('test_attempts')
          .select('id, finished_at, score')
          .eq('test_id', this.testId)
          .eq('user_id', this.userId)
          .order('finished_at', { ascending: false });

        if (attemptsError) {
          console.error('Ошибка при получении попыток:', attemptsError.message);
          return;
        }

        this.attempts = attemptsData;
      } catch (error) {
        console.error('Ошибка при получении попыток пользователя:', error.message);
      }
    },
    async viewAttemptDetails(attempt) {
      this.selectedAttempt = attempt;
      this.selectedAttemptDate = attempt.finished_at
        ? new Date(attempt.finished_at).toLocaleString()
        : 'Не завершено';
      this.attemptDetailsDialog = true;
      await this.fetchAttemptDetails();
    },
    async fetchAttemptDetails() {
      try {
        // Переиспользуем код для загрузки деталей попытки
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
          .eq('user_answers.attempt_id', this.selectedAttempt.id);

        if (questionsError) {
          console.error('Ошибка при загрузке вопросов:', questionsError.message);
          return;
        }

        this.attemptQuestions = questionsData.map((question) => {
          const userSelection = question.user_answers
            .map((answer) => answer.selected_option_id)
            .filter((id) => id !== null);

          const userAnswerText =
            question.user_answers
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
        console.error('Ошибка при загрузке деталей попытки:', error.message);
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
