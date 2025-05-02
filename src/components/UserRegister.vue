<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title class="text-center">Регистрация</v-card-title>
          <v-card-text>
            <v-form>
              <v-text-field label="E-mail" v-model="email" required></v-text-field>
              <v-text-field label="Пароль" v-model="password" type="password" required></v-text-field>
              <v-btn @click="register" color="error" block>Зарегистрироваться</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  name: 'UserRegister',
  data() {
    return {
      email: '',
      password: ''
    };
  },
  methods: {
    register() {
      console.log(this.email, this.password);
    }
  }
};

</script>
