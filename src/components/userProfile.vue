<template>
  <v-container>
    <v-card>
      <v-card-title>Личный кабинет</v-card-title>
      <v-card-text>
        <p><strong>Имя пользователя:</strong> {{ user.username }}</p>
        <p><strong>Электронная почта:</strong> {{ user.email }}</p>
        <!-- Кнопка удаления аккаунта удалена -->
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import { supabase } from '../supabase';

export default {
  name: 'UserProfile',
  data() {
    return {
      user: {
        username: '',
        email: '',
      },
    };
  },
  async mounted() {
    await this.fetchUserProfile();
  },
  methods: {
    async fetchUserProfile() {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error) {
        console.error('Ошибка при получении данных о пользователе:', error.message);
        return;
      }

      if (user) {
        const { data, error: userDataError } = await supabase
          .from('users')
          .select('username, email')
          .eq('id', user.id)
          .single();

        if (userDataError) {
          console.error('Ошибка при загрузке профиля:', userDataError.message);
        } else {
          this.user.username = data.username;
          this.user.email = data.email;
        }
      }
    },
  },
};
</script>

<style>
.error {
  color: red;
}
.success {
  color: green;
}
</style>
