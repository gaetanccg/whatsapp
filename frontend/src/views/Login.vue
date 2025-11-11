<template>
  <v-app>
    <v-main>
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="4">
            <v-card class="elevation-12">
              <v-toolbar color="green-darken-1" dark>
                <v-toolbar-title>WhatsApp Clone - Login</v-toolbar-title>
              </v-toolbar>
              <v-card-text>
                <v-form @submit.prevent="handleLogin">
                  <v-text-field
                    v-model="email"
                    label="Email"
                    type="email"
                    prepend-icon="mdi-email"
                    required
                    :error-messages="errors.email"
                  ></v-text-field>

                  <v-text-field
                    v-model="password"
                    label="Password"
                    type="password"
                    prepend-icon="mdi-lock"
                    required
                    :error-messages="errors.password"
                  ></v-text-field>

                  <v-alert v-if="error" type="error" class="mt-3">
                    {{ error }}
                  </v-alert>
                </v-form>
              </v-card-text>
              <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn
                  color="green-darken-1"
                  variant="text"
                  :to="{ name: 'Register' }"
                >
                  Register
                </v-btn>
                <v-btn
                  color="green-darken-1"
                  variant="elevated"
                  @click="handleLogin"
                  :loading="loading"
                >
                  Login
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/index.js';

const router = useRouter();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const errors = ref({});

const handleLogin = async () => {
  errors.value = {};
  error.value = '';

  if (!email.value) {
    errors.value.email = 'Email is required';
    return;
  }

  if (!password.value) {
    errors.value.password = 'Password is required';
    return;
  }

  try {
    loading.value = true;
    await authStore.login({
      email: email.value,
      password: password.value
    });
    router.push('/');
  } catch (err) {
    error.value = err.response?.data?.message || 'Login failed';
  } finally {
    loading.value = false;
  }
};
</script>
