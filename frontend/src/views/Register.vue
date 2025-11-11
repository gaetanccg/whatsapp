<template>
  <v-app>
    <v-main>
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="4">
            <v-card class="elevation-12">
              <v-toolbar color="green-darken-1" dark>
                <v-toolbar-title>WhatsApp Clone - Register</v-toolbar-title>
              </v-toolbar>
              <v-card-text>
                <v-form @submit.prevent="handleRegister">
                  <v-text-field
                    v-model="username"
                    label="Username"
                    prepend-icon="mdi-account"
                    required
                    :error-messages="errors.username"
                  ></v-text-field>

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

                  <v-text-field
                    v-model="confirmPassword"
                    label="Confirm Password"
                    type="password"
                    prepend-icon="mdi-lock-check"
                    required
                    :error-messages="errors.confirmPassword"
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
                  :to="{ name: 'Login' }"
                >
                  Login
                </v-btn>
                <v-btn
                  color="green-darken-1"
                  variant="elevated"
                  @click="handleRegister"
                  :loading="loading"
                >
                  Register
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

const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');
const errors = ref({});

const handleRegister = async () => {
  errors.value = {};
  error.value = '';

  if (!username.value) {
    errors.value.username = 'Username is required';
    return;
  }

  if (!email.value) {
    errors.value.email = 'Email is required';
    return;
  }

  if (!password.value) {
    errors.value.password = 'Password is required';
    return;
  }

  if (password.value.length < 6) {
    errors.value.password = 'Password must be at least 6 characters';
    return;
  }

  if (password.value !== confirmPassword.value) {
    errors.value.confirmPassword = 'Passwords do not match';
    return;
  }

  try {
    loading.value = true;
    await authStore.register({
      username: username.value,
      email: email.value,
      password: password.value
    });
    router.push('/');
  } catch (err) {
    error.value = err.response?.data?.message || 'Registration failed';
  } finally {
    loading.value = false;
  }
};
</script>
