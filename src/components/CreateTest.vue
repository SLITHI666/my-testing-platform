<template>
  <v-container>
    <v-form>
      <!-- Заголовок теста -->
      <v-text-field label="Название теста" v-model="test.title" required></v-text-field>
      <v-textarea label="Описание теста" v-model="test.description"></v-textarea>
      <v-text-field
        label="Пароль для теста (необязательно)"
        v-model="test.password"
        type="password"
      ></v-text-field>
      <v-checkbox
        v-model="test.publick"
        label="Публичный тест"
        hide-details
        dense
      ></v-checkbox>

      <v-divider class="my-5"></v-divider>
      <h3>Добавление вопросов</h3>

      <div v-for="(q, index) in questions" :key="index" class="question-block">
        <h4>Вопрос {{ index + 1 }}</h4>
        <v-textarea label="Текст вопроса" v-model="q.text" required></v-textarea>
        <v-select
          v-model="q.type"
          :items="questionTypeLabels"
          label="Тип вопроса"
          required
        ></v-select>

        <!-- Поле и кнопка для свободного ответа -->
        <v-text-field
          v-if="q.type === 'Свободный ответ'"
          label="Правильный ответ для свободного текста"
          v-model="q.correctAnswer"
        ></v-text-field>
        <v-btn
          v-if="q.type === 'Свободный ответ'"
          color="primary"
          @click="saveFreeTextAnswer(index)"
        >
          Сохранить правильный ответ
        </v-btn>

        <!-- Поле для вариантов ответа и кнопка добавления для остальных типов вопросов -->
        <v-text-field
          v-if="q.type !== 'Свободный ответ'"
          label="Вариант ответа"
          v-model="q.newOption"
          @keyup.enter="addOption(index)"
        ></v-text-field>
        <v-btn class="ml-5" v-if="q.type !== 'Свободный ответ'" @click="addOption(index)">Добавить вариант</v-btn>

        <v-list v-if="q.options.length > 0">
          <v-radio-group v-if="q.type === 'Выбор ответа'" v-model="q.correctAnswerIndex" column>
            <v-list-item v-for="(option, optIndex) in q.options" :key="optIndex">
              <v-list-item-content>
                <v-radio :label="'Правильный ответ'" :value="optIndex" />
                {{ option.text }}
              </v-list-item-content>
              <v-list-item-action>
                <v-btn icon @click="removeOption(index, optIndex)">
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-list-item-action>
            </v-list-item>
          </v-radio-group>

          <v-list-item v-for="(option, optIndex) in q.options" :key="optIndex" v-else>
            <v-list-item-content>
              <v-checkbox
                v-if="q.type === 'Множественный выбор'"
                v-model="q.options[optIndex].isCorrect"
                label="Правильный ответ"
              ></v-checkbox>
              {{ option.text }}
            </v-list-item-content>
            <v-list-item-action>
              <v-btn icon @click="removeOption(index, optIndex)">
                <v-icon>mdi-delete</v-icon>
              </v-btn>
            </v-list-item-action>
          </v-list-item>
        </v-list>

        <v-btn class="ml-5" color="error" small @click="removeQuestion(index)">Удалить вопрос</v-btn>
      </div>

      <v-btn class="ml-5" color="primary" @click="addQuestion">Добавить вопрос</v-btn>
      <v-btn
      
        :color="testCreated ? 'green' : 'primary'"
        :disabled="questions.length === 0 || loading"
        @click="createTest"
        class="mt-3 ml-5"
      >
        {{ loading ? 'Создание теста...' : testCreated ? 'Тест создан' : 'Создать тест' }}
      </v-btn>
      <span v-if="loading" class="ml-2">Тест создается, скоро вы будете перенаправлены на главную страницу...</span>
    </v-form>
  </v-container>
</template>

<script>
import { supabase } from '../supabase';

export default {
  name: 'CreateTest',
  data() {
    return {
      test: {
        title: '',
        description: '',
        password: '',
        publick: true,
      },
      testCreated: false,
      createdTestId: null,
      questionTypeLabels: ['Выбор ответа', 'Множественный выбор', 'Свободный ответ'],
      questions: [],
      loading: false,
    };
  },
  methods: {
    saveFreeTextAnswer(index) {
      const question = this.questions[index];
      if (question.type === 'Свободный ответ') {
        question.options = [{ text: question.correctAnswer, isCorrect: true }];
      }
    },
    async createTest() {
      if (this.questions.length === 0) {
        console.error('Тест не может быть создан без вопросов');
        return;
      }

      this.loading = true;

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Ошибка при получении данных о пользователе:', userError?.message || 'Пользователь не авторизован');
        this.loading = false;
        return;
      }

      if (!this.test.title.trim()) {
        console.error('Название теста не может быть пустым');
        this.loading = false;
        return;
      }

      const { data, error } = await supabase
        .from('tests')
        .insert([
          {
            user_id: user.id,
            title: this.test.title,
            description: this.test.description,
            password: this.test.password || null,
            publick: this.test.publick,
            created_at: new Date(),
          },
        ])
        .select();

      if (error) {
        console.error('Ошибка при создании теста:', error);
        this.loading = false;
        return;
      }

      if (data && data.length > 0) {
        this.testCreated = true;
        this.createdTestId = data[0].id;
        await this.saveQuestions();

        setTimeout(() => {
          this.$router.push('/home');
        }, 2000);
      } else {
        console.error('Созданный тест не возвращает id');
      }

      this.loading = false;
    },
    async saveQuestions() {
      for (let question of this.questions) {
        const questionType = this.getQuestionTypeValue(question.type);
        const { data, error } = await supabase
          .from('questions')
          .insert([
            {
              test_id: this.createdTestId,
              question_text: question.text,
              question_type: questionType,
              order_number: this.questions.indexOf(question) + 1,
            },
          ])
          .select();

        if (error) {
          console.error('Ошибка при добавлении вопроса:', error);
          continue;
        }

        const questionId = data[0].id;
        if (questionType === 'free_text') {
          await this.saveFreeTextOption(questionId, question.correctAnswer);
        } else {
          await this.saveOptions(questionId, question);
        }
      }
    },
    async saveFreeTextOption(questionId, correctAnswer) {
      if (correctAnswer) {
        const { error } = await supabase
          .from('options')
          .insert([
            {
              question_id: questionId,
              option_text: correctAnswer,
              is_correct: true,
            },
          ]);
        if (error) console.error('Ошибка при добавлении свободного ответа:', error);
      }
    },
    async saveOptions(questionId, question) {
      for (const option of question.options) {
        const isCorrect = question.type === 'Выбор ответа'
          ? question.correctAnswerIndex === question.options.indexOf(option)
          : option.isCorrect;

        const { error: optionError } = await supabase
          .from('options')
          .insert([
            {
              question_id: questionId,
              option_text: option.text,
              is_correct: isCorrect,
            },
          ]);

        if (optionError) {
          console.error('Ошибка при добавлении варианта ответа:', optionError);
        }
      }
    },
    getQuestionTypeValue(label) {
      if (label === 'Выбор ответа') return 'single_choice';
      if (label === 'Множественный выбор') return 'multiple_choice';
      if (label === 'Свободный ответ') return 'free_text';
    },
    addQuestion() {
      this.questions.push({
        type: 'Выбор ответа',
        text: '',
        options: [],
        correctAnswerIndex: null,
        correctAnswer: '',
        newOption: '',
      });
    },
    removeQuestion(index) {
      this.questions.splice(index, 1);
    },
    addOption(questionIndex) {
      const question = this.questions[questionIndex];
      if (question.newOption.trim()) {
        question.options.push({ text: question.newOption, isCorrect: false });
        question.newOption = '';
      }
    },
    removeOption(questionIndex, optionIndex) {
      const question = this.questions[questionIndex];
      question.options.splice(optionIndex, 1);
      if (question.correctAnswerIndex === optionIndex) {
        question.correctAnswerIndex = null;
      }
    },
  },
};
</script>

<style>
.question-block {
  margin-bottom: 20px;
}
.v-btn {
  margin-top: 10px;
}
</style>
