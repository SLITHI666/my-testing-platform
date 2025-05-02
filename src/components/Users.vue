<!-- src/components/Users.vue -->
<template>
  <v-container>
    <h2>Пользователи</h2>
    <v-text-field
      v-model="searchQuery"
      label="Поиск пользователей"
      append-icon="mdi-magnify"
      outlined
      dense
      @input="fetchUsers"
    ></v-text-field>

    <v-list>
      <v-list-item
        v-for="user in filteredUsers"
        :key="user.id"
        @click="goToUserProfile(user.id)"
      >
        <v-list-item-content>
          <v-list-item-title>{{ user.username }}</v-list-item-title>
          <v-list-item-subtitle>{{ user.email }}</v-list-item-subtitle>
        </v-list-item-content>
      </v-list-item>
    </v-list>
  </v-container>
</template>

<script>
import { supabase } from '../supabase';

export default {
  name: 'UsersPage', // Измените на многословное имя, например, UsersPage
  data() {
    return {
      users: [],
      searchQuery: '',
    };
  },
  computed: {
    filteredUsers() {
      return this.users.filter(user =>
        user.username.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    },
  },
  methods: {
  async fetchUsers() {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, email');

    if (error) {
      console.error('Ошибка при получении пользователей:', error);
    } else {
      this.users = users;
    }
  },
  goToUserProfile(userId) {
    this.$router.push({ name: 'ProfileUsers', params: { userId } }); // Перенаправляем на страницу ProfileUsers
  },
},
};
</script>
