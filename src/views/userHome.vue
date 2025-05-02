<template>
  <v-container>
    <!-- Тесты пользователя -->
    <v-row>
      <v-col cols="12">
        <h3>Мои тесты</h3>
      </v-col>
      <v-col cols="12" md="6" v-for="test in filteredMyTests" :key="test.id">
        <v-card class="mb-4">
          <v-card-title>{{ test.title }}</v-card-title>
          <v-card-text>{{ test.description }}</v-card-text>
          <v-card-actions>
            <!--<v-btn color="primary" @click="editTest(test)">Редактировать</v-btn>-->
            <v-btn color="error" @click="deleteTest(test.id)">Удалить</v-btn>
            <v-spacer></v-spacer>
            <v-icon v-if="test.password">mdi-lock</v-icon>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Кнопка "Создать тест" -->
    <v-row justify="center" class="my-5">
      <v-btn color="primary" @click="goToCreateTest">
        Создать тест
      </v-btn>
    </v-row>

    <!-- Поиск и фильтрация тестов -->
    <v-row class="my-3">
      <v-col cols="12" sm="8">
        <v-text-field
          v-model="searchQuery"
          label="Поиск"
          append-icon="mdi-magnify"
          @input="fetchTests"
          outlined
          dense
        ></v-text-field>
      </v-col>
      <v-col cols="12" sm="4">
        <v-checkbox
          v-model="showPasswordTests"
          label="Показывать тесты с паролями"
          hide-details
          dense
        ></v-checkbox>
      </v-col>
    </v-row>

    <!-- Тесты других пользователей -->
    <v-row>
      <v-col cols="12">
        <h3>Тесты других пользователей</h3>
      </v-col>
      <v-col cols="12" md="6" v-for="test in filteredOtherTests" :key="test.id">
        <v-card class="mb-4">
          <v-card-title>{{ test.title }}</v-card-title>
          <v-card-subtitle>Автор: {{ test.author }}</v-card-subtitle>
          <v-card-text>{{ test.description }}</v-card-text>
          <v-card-actions>
            <v-btn color="secondary" @click="takeTest(test)">
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
  name: 'userHome',
  data() {
    return {
      tests: [], // Список всех тестов
      myTests: [], // Список тестов пользователя
      searchQuery: '', // Поле для поиска
      showPasswordTests: false, // Флаг для показа тестов с паролями (только для тестов других пользователей)
    };
  },
  computed: {
    // Фильтрация тестов пользователя
    filteredMyTests() {
      return this.myTests.filter(test => {
        const matchesSearch = test.title.toLowerCase().includes(this.searchQuery.toLowerCase());
        return matchesSearch; // Тесты пользователя всегда показываются, независимо от публичности или пароля
      });
    },
    // Фильтрация тестов других пользователей
    filteredOtherTests() {
      return this.tests.filter(test => {
        const matchesSearch = test.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          test.author.toLowerCase().includes(this.searchQuery.toLowerCase());
        const matchesPassword = this.showPasswordTests || !test.password; // Фильтрация по паролю только для чужих тестов
        const isPublicTest = test.publick; // Только публичные тесты показываются
        const isNotUserTest = !this.myTests.some(myTest => myTest.id === test.id); // Исключаем тесты пользователя
        return matchesSearch && matchesPassword && isPublicTest && isNotUserTest;
      });
    },
  },
  methods: {
    // Функция получения списка тестов
    async fetchTests() {
      const { data: tests, error } = await supabase
        .from('tests')
        .select('*, users(username)')
        .order('created_at', { ascending: false }); // Упорядочиваем тесты по дате создания, новые тесты сверху

      if (error) {
        console.error('Ошибка при получении тестов:', error);
      } else {
        this.tests = tests.map((test) => ({
          ...test,
          author: test.users.username, // Присваиваем имя пользователя как автора
        }));
        this.fetchMyTests(); // Получаем тесты пользователя
      }
    },

    // Получение тестов пользователя
    async fetchMyTests() {
      const { data: { user } } = await supabase.auth.getUser();
      this.myTests = this.tests
        .filter(test => test.user_id === user.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Дополнительная сортировка на случай, если это не применяется по умолчанию
    },

    // Переход к созданию теста
    goToCreateTest() {
      this.$router.push('/create-test');
    },

    // Обработка нажатия на кнопку "Пройти тест"
    takeTest(test) {
      if (test.password) {
        this.promptPassword(test);
      } else {
        this.$router.push(`/tests/${test.id}`);
      }
    },

    // Окно для ввода пароля
    async promptPassword(test) {
      const password = prompt('Введите пароль для теста:');
      if (password === test.password) {
        this.$router.push(`/tests/${test.id}`);
      } else {
        alert('Неверный пароль');
      }
    },

    // Редактирование теста
    //editTest(test) {
    //  this.$router.push({ name: 'EditTest', params: { testId: test.id } });
   // },

    // Удаление теста
    async deleteTest(testId) {
      const { error } = await supabase.from('tests').delete().eq('id', testId);
      if (error) {
        console.error('Ошибка при удалении теста:', error);
      } else {
        console.log('Тест успешно удален');
        this.fetchTests(); // Обновляем список тестов после удаления
      }
    },
  },

  // При создании компонента загружаем список тестов
  created() {
    this.fetchTests();
  },
};
</script>

<style>
.v-container {
  padding: 16px;
}
.v-btn {
  margin-bottom: 16px;
}
.v-card {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.v-card-title {
  font-size: 16px;
  font-weight: bold;
}
.v-card-subtitle {
  font-size: 14px;
  color: #757575;
}
.v-card-text {
  font-size: 14px;
  margin-bottom: 16px;
}
</style>
