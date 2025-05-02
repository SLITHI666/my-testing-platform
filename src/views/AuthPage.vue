<template>
  <v-container class="pa-16 d-flex align-center justify-center">
    <v-card class="pa-5" max-width="500">
      <v-card-title class="text-h5 text-center">Войдите или зарегистрируйтесь</v-card-title>

      <v-tabs v-model="authMode" background-color="primary" dark>
        <v-tab>Вход</v-tab>
        <v-tab>Регистрация</v-tab>
      </v-tabs>

      <!-- Вкладка для входа -->
      <v-tab-item v-if="authMode === 0">
        <v-text-field
          label="Email"
          v-model="loginData.email"
          type="email"
          required
        ></v-text-field>
        <v-text-field
          label="Пароль"
          v-model="loginData.password"
          type="password"
          required
        ></v-text-field>
        <v-btn color="primary" @click="login">Войти</v-btn>
        <p v-if="loginError" class="error">{{ loginError }}</p>
      </v-tab-item>

      <!-- Вкладка для регистрации -->
      <v-tab-item v-if="authMode === 1">
        <v-text-field
          label="Имя пользователя"
          v-model="registerData.username"
          required
        ></v-text-field>
        <v-text-field
          label="Email"
          v-model="registerData.email"
          type="email"
          required
        ></v-text-field>
        <v-text-field
          label="Пароль"
          v-model="registerData.password"
          type="password"
          required
        ></v-text-field>
        <v-btn color="primary" @click="register">Зарегистрироваться</v-btn>
        <p v-if="registerError" class="error">{{ registerError }}</p>
        <p v-if="registerSuccess" class="success">{{ registerSuccess }}</p>
      </v-tab-item>
    </v-card>
  </v-container>
</template>

<script>
import { supabase } from '../supabase';

export default {
  name: 'AuthPage',
  data() {
    return {
      authMode: 0, // 0 для входа, 1 для регистрации
      loginData: {
        email: '',
        password: '',
      },
      registerData: {
        username: '',
        email: '',
        password: '',
      },
      loginError: null,
      registerError: null,
      registerSuccess: null,
    };
  },
  methods: {
    async login() {
      const { email, password } = this.loginData;
      this.loginError = null;

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        this.loginError = 'Неверный email или пароль';
      } else {
        this.$router.push('/home'); // Перенаправляем на главную страницу
      }
    },
    
    async register() {
      const { email, password, username } = this.registerData;
      this.registerError = null;
      this.registerSuccess = null;

      // Регистрация пользователя в Supabase
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } } // Передаем username как метаданные
      });

      if (signUpError) {
        this.registerError = 'Ошибка при регистрации: ' + signUpError.message;
      } else if (data.user) {
        // Добавляем пользователя в таблицу users с использованием его UID
        const { error: insertError } = await supabase.from('users').insert([
          {
            id: data.user.id, // Используем UID из auth.users
            username,
            email,
            password_hash: password, // Сохраните пароль в безопасном виде, если это необходимо
          }
        ]);

        if (insertError) {
          this.registerError = 'Ошибка при добавлении пользователя в базу данных: ' + insertError.message;
        } else {
          this.registerSuccess = 'Успешная регистрация! Теперь вы можете войти.';
          
          // Перенаправление на страницу userHome после успешной регистрации
          setTimeout(() => {
            this.$router.push('/home');
          }, 2000); // Пауза в 2 секунды перед перенаправлением

          // Очистка данных после успешной регистрации
          this.registerData = { username: '', email: '', password: '' };
        }
      }
    },
  },
};
</script>

<style>
.error {
  color: red;
  margin-top: 10px;
}
.success {
  color: green;
  margin-top: 10px;
}
</style>
