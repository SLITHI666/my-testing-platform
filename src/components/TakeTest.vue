<template>
  <v-container>
    <!-- Компонент NavBar должен быть вложен здесь, если он не глобальный -->
    <h2>{{ test.title }}</h2>
    <v-form v-if="!resultsDialog">
      <div v-for="(question, index) in questions" :key="index" class="question-block">
        <h3>{{ question.question_text }}</h3>

        <!-- Вопрос со свободным ответом -->
        <v-text-field
          v-if="question.question_type === 'free_text'"
          :label="`Ответ на вопрос: ${question.question_text}`"
          v-model="userAnswers[question.id]"
        ></v-text-field>

        <!-- Вопрос с одним выбором -->
        <v-radio-group
          v-if="question.question_type === 'single_choice'"
          v-model="userAnswers[question.id]"
          :label="`Выберите один вариант: ${question.question_text}`"
        >
          <v-radio
            v-for="option in question.options"
            :key="option.id"
            :label="option.option_text"
            :value="option.id"
          ></v-radio>
        </v-radio-group>

        <!-- Вопрос с множественным выбором -->
        <div v-if="question.question_type === 'multiple_choice'">
          <v-checkbox
            v-for="option in question.options"
            :key="option.id"
            :label="option.option_text"
            :value="option.id"
            :input-value="userAnswers[question.id].includes(option.id)"
            @change="onCheckboxChange(question.id, option.id)"
          ></v-checkbox>
        </div>
      </div>

      <v-btn color="primary" @click="submitTest">Отправить ответы</v-btn>
    </v-form>

    <!-- Модальное окно с результатами -->
    <v-dialog v-model="resultsDialog" max-width="500">
      <v-card>
        <v-card-title class="headline">Результаты теста</v-card-title>
        <v-card-text>
          <p>Правильные ответы: {{ correctCount }}</p>
          <p>Неправильные ответы: {{ incorrectCount }}</p>
          <p>Ваш результат: {{ score }}%</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="goToHome">Вернуться на главную страницу</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Модальное окно для отправки жалобы -->
    <v-dialog v-model="complaintDialog" max-width="600">
      <v-card>
        <v-card-title class="headline">Жалоба на тест</v-card-title>
        <v-card-text>
          <v-textarea
            label="Опишите причину жалобы"
            v-model="complaintText"
            rows="5"
          ></v-textarea>
        </v-card-text>
        <v-card-actions>
          <v-btn text @click="complaintDialog = false">Отмена</v-btn>
          <v-spacer></v-spacer>
          <v-btn color="primary" @click="submitComplaint">Отправить</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>


<script>
import { supabase } from '../supabase';


export default {
  name: 'TakeTest',
  data() {
    return {
      test: {},
      questions: [],
      userAnswers: {},
      correctCount: 0,
      incorrectCount: 0,
      score: 0,
      resultsDialog: false, // Управление модальным окном результатов
    };
  },
  async created() {
    const testId = this.$route.params.testId;

    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testError) {
      console.error('Ошибка при загрузке теста:', testError);
      return;
    }
    this.test = test;

    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*, options(*)')
      .eq('test_id', testId);

    if (questionsError) {
      console.error('Ошибка при загрузке вопросов:', questionsError);
      return;
    }

    if (!questions || questions.length === 0) {
      console.error('Вопросы не найдены для test_id:', testId);
      return;
    }

    this.questions = questions.map((question) => ({
      ...question,
      options: question.options || [],
    }));

    this.questions.forEach((question) => {
      if (question.question_type === 'multiple_choice') {
        this.userAnswers[question.id] = [];
      } else {
        this.userAnswers[question.id] = '';
      }
    });
  },
  methods: {
    onCheckboxChange(questionId, optionId) {
      const selectedOptions = this.userAnswers[questionId];
      const index = selectedOptions.indexOf(optionId);
      if (index > -1) {
        selectedOptions.splice(index, 1);
      } else {
        selectedOptions.push(optionId);
      }
      this.userAnswers[questionId] = [...selectedOptions];
    },
    async submitTest() {
      for (const question of this.questions) {
        const userAnswer = this.userAnswers[question.id];

        if (
          (question.question_type === 'free_text' && (!userAnswer || userAnswer.trim() === '')) ||
          (question.question_type === 'single_choice' && (userAnswer === null || userAnswer === '')) ||
          (question.question_type === 'multiple_choice' && (!Array.isArray(userAnswer) || userAnswer.length === 0))
        ) {
          alert(`Пожалуйста, ответьте на все вопросы перед отправкой.`);
          return;
        }
      }

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error('Пользователь не авторизован');
          return;
        }

        // Создаем новую попытку теста
        const { data: attempt, error: attemptError } = await supabase
          .from('test_attempts')
          .insert([{ user_id: user.id, test_id: this.test.id }])
          .select();

        if (attemptError) throw attemptError;

        let correctCount = 0;
        let incorrectCount = 0;

        for (const question of this.questions) {
          const userAnswer = this.userAnswers[question.id];
          let isCorrect = false;

          if (question.question_type === 'free_text') {
            const answerText = userAnswer || '';

            // Получаем правильный ответ из options, где is_correct = true
            const correctOption = question.options.find((option) => option.is_correct);
            const correctAnswer = correctOption ? correctOption.option_text : '';

            const normalizeString = (str) => {
              return str
                .trim()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ');
            };

            const formattedUserAnswer = normalizeString(answerText);
            const formattedCorrectAnswer = normalizeString(correctAnswer);

            isCorrect = formattedUserAnswer === formattedCorrectAnswer;

            // Сохраняем ответ пользователя
            await supabase.from('user_answers').insert({
              attempt_id: attempt[0].id,
              question_id: question.id,
              answer_text: answerText,
              selected_option_id: null,
            });

            isCorrect ? correctCount++ : incorrectCount++;
          } else if (question.question_type === 'single_choice') {
            const selectedOption = question.options.find((option) => option.id === userAnswer);
            const answerText = selectedOption ? selectedOption.option_text : 'EMPTY';
            const selectedOptionId = selectedOption ? selectedOption.id : null;
            isCorrect = selectedOption && selectedOption.is_correct;

            // Сохраняем ответ пользователя
            await supabase.from('user_answers').insert({
              attempt_id: attempt[0].id,
              question_id: question.id,
              answer_text: answerText,
              selected_option_id: selectedOptionId,
            });

            isCorrect ? correctCount++ : incorrectCount++;
          } else if (question.question_type === 'multiple_choice' && Array.isArray(userAnswer)) {
            // Сохраняем каждую выбранную опцию
            for (const optionId of userAnswer) {
              const selectedOption = question.options.find((option) => option.id === optionId);
              if (selectedOption) {
                const answerText = selectedOption.option_text;
                const selectedOptionId = selectedOption.id;

                await supabase.from('user_answers').insert({
                  attempt_id: attempt[0].id,
                  question_id: question.id,
                  answer_text: answerText,
                  selected_option_id: selectedOptionId,
                });
              }
            }

            const correctOptionIds = question.options
              .filter((option) => option.is_correct)
              .map((option) => option.id);

            isCorrect =
              userAnswer.length === correctOptionIds.length &&
              userAnswer.every((id) => correctOptionIds.includes(id));

            isCorrect ? correctCount++ : incorrectCount++;
          } else {
            alert(`Неизвестный тип вопроса: ${question.question_type}`);
          }
        }

        // Обновляем результат попытки
        const totalQuestions = this.questions.length;
        const score = (correctCount / totalQuestions) * 100;

        await supabase
          .from('test_attempts')
          .update({ score: score, finished_at: new Date().toISOString() })
          .eq('id', attempt[0].id);

        // Обновляем статистику пользователя
        const { data: userStats } = await supabase
          .from('user_statistics')
          .select('tests_taken, average_score')
          .eq('user_id', user.id)
          .single();

        if (userStats) {
          const newAverageScore =
            (userStats.average_score * userStats.tests_taken + score) / (userStats.tests_taken + 1);
          await supabase
            .from('user_statistics')
            .update({
              tests_taken: userStats.tests_taken + 1,
              average_score: newAverageScore,
            })
            .eq('user_id', user.id);
        } else {
          await supabase.from('user_statistics').insert({
            user_id: user.id,
            tests_taken: 1,
            average_score: score,
          });
        }

        this.correctCount = correctCount;
        this.incorrectCount = incorrectCount;
        this.score = score;

        // Открываем модальное окно с результатами
        this.resultsDialog = true;
      } catch (error) {
        console.error('Ошибка при отправке ответов:', error);
      }
    },
    goToHome() {
      this.$router.push('/');
    },
  },
};
</script>

<style>
.question-block {
  margin-bottom: 20px;
}
</style>
