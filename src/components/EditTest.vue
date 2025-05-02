<template>
  <v-container>
    <h2>Редактирование теста: {{ test.title }}</h2>
    <v-form>
      <!-- Название теста -->
      <v-text-field label="Название теста" v-model="test.title" required></v-text-field>
      <!-- Описание теста -->
      <v-textarea label="Описание теста" v-model="test.description"></v-textarea>

      <v-divider class="my-5"></v-divider>
      <h3>Редактирование вопросов</h3>

      <!-- Вопросы -->
      <div v-for="(question, qIndex) in test.questions" :key="qIndex" class="question-block">
        <h4>Вопрос {{ qIndex + 1 }}</h4>
        <v-textarea label="Текст вопроса" v-model="question.question_text" required></v-textarea>

        <!-- Тип вопроса -->
        <v-select
          v-model="question.question_type"
          :items="questionTypeOptions"
          label="Тип вопроса"
          required
        ></v-select>

        <!-- Варианты ответа -->
        <v-text-field
          v-if="question.question_type !== 'free_text'"
          label="Новый вариант ответа"
          v-model="question.newOptionText"
          @keyup.enter="addOption(qIndex)"
        ></v-text-field>
        <v-btn small color="primary" @click="addOption(qIndex)" v-if="question.question_type !== 'free_text'">
          Добавить вариант
        </v-btn>

        <!-- Отображение вариантов ответа -->
        <v-list dense>
          <v-list-item
            v-for="(option, oIndex) in question.options"
            :key="oIndex"
            class="d-flex align-center"
          >
            <v-checkbox
              v-if="question.question_type === 'multiple_choice'"
              v-model="option.is_correct"
            ></v-checkbox>
            <v-radio
              v-if="question.question_type === 'single_choice'"
              v-model="question.correctAnswerId"
              :value="option.id"
            ></v-radio>

            <v-text-field v-model="option.option_text"></v-text-field>

            <v-btn icon @click="removeOption(qIndex, oIndex)">
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </v-list-item>
        </v-list>

        <!-- Удаление вопроса -->
        <v-btn color="error" small @click="removeQuestion(qIndex)">Удалить вопрос</v-btn>
        <v-divider class="my-5"></v-divider>
      </div>

      <!-- Добавить новый вопрос -->
      <v-btn color="primary" @click="addQuestion">Добавить вопрос</v-btn>
      <!-- Сохранить изменения -->
      <v-btn color="success" @click="saveChanges" class="mt-3">Сохранить изменения</v-btn>
    </v-form>
  </v-container>
</template>

<script>
import { supabase } from '../supabase';

export default {
  name: 'EditTest',
  data() {
    return {
      testId: null,
      test: {
        title: '',
        description: '',
        questions: [],
      },
      questionTypeOptions: ['single_choice', 'multiple_choice', 'free_text'],
    };
  },
  async created() {
    this.testId = this.$route.params.testId;
    await this.fetchTest();
  },
  methods: {
    async fetchTest() {
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .select('id, title, description, questions (id, question_text, question_type, options (id, option_text, is_correct))')
        .eq('id', this.testId)
        .single();

      if (testError) {
        console.error('Ошибка при загрузке теста:', testError.message);
        return;
      }

      this.test = {
        ...testData,
        questions: testData.questions.map(q => ({
          ...q,
          newOptionText: '',
        })),
      };
    },
    
    addQuestion() {
      this.test.questions.push({
        id: null,
        question_text: '',
        question_type: 'single_choice',
        options: [],
        newOptionText: '',
      });
    },
    
    async removeQuestion(qIndex) {
      const question = this.test.questions[qIndex];
      if (question.id) {
        await supabase.from('questions').delete().eq('id', question.id);
      }
      this.test.questions.splice(qIndex, 1);
    },

    addOption(qIndex) {
      const question = this.test.questions[qIndex];
      if (question.newOptionText.trim()) {
        question.options.push({
          id: null,
          option_text: question.newOptionText,
          is_correct: false,
        });
        question.newOptionText = '';
      }
    },
    
    async removeOption(qIndex, oIndex) {
      const option = this.test.questions[qIndex].options[oIndex];
      if (option.id) {
        await supabase.from('options').delete().eq('id', option.id);
      }
      this.test.questions[qIndex].options.splice(oIndex, 1);
    },

    async saveChanges() {
  try {
    // Сначала обновляем название и описание теста
    await supabase
      .from('tests')
      .update({
        title: this.test.title,
        description: this.test.description,
      })
      .eq('id', this.testId);

    // Присваиваем order_number для новых и существующих вопросов
    let orderNumber = 1;

    for (const question of this.test.questions) {
      let questionId = question.id;

      if (question.id) {
        // Обновляем существующий вопрос
        await supabase
          .from('questions')
          .update({
            question_text: question.question_text,
            question_type: question.question_type,
            order_number: orderNumber++, // Устанавливаем порядок
          })
          .eq('id', question.id);
      } else {
        // Добавляем новый вопрос и получаем его ID
        const { data: newQuestion, error: questionError } = await supabase
          .from('questions')
          .insert({
            test_id: this.testId,
            question_text: question.question_text,
            question_type: question.question_type,
            order_number: orderNumber++, // Устанавливаем порядок
          })
          .select()
          .single();

        if (questionError) {
          console.error('Ошибка при добавлении нового вопроса:', questionError);
          continue;
        }

        questionId = newQuestion.id; // Используем ID добавленного вопроса
      }

      // Обработка опций для текущего вопроса
      for (const option of question.options) {
        if (option.id) {
          // Обновляем существующую опцию
          await supabase
            .from('options')
            .update({
              option_text: option.option_text,
              is_correct: option.is_correct,
            })
            .eq('id', option.id);
        } else {
          // Добавляем новую опцию, связанную с вопросом
          await supabase
            .from('options')
            .insert({
              question_id: questionId,
              option_text: option.option_text,
              is_correct: option.is_correct,
            });
        }
      }
    }

    alert('Изменения сохранены.');
    this.$router.push('/my-tests');
  } catch (error) {
    console.error('Ошибка при сохранении изменений:', error);
    alert('Не удалось сохранить изменения.');
  }
}
  },
};
</script>

<style>
.question-block {
  margin-bottom: 20px;
}
</style>