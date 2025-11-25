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

                  <v-checkbox
                    v-model="rememberMe"
                    label="Remember me"
                    color="green-darken-1"
                    hide-details
                    class="mb-2"
                  ></v-checkbox>

                  <v-btn
                    variant="text"
                    size="small"
                    color="green-darken-1"
                    :to="{ name: 'ForgotPassword' }"
                    class="text-none pa-0"
                  >
                    Forgot password?
                  </v-btn>

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
const rememberMe = ref(false);
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

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value)) {
    errors.value.email = 'Please enter a valid email address';
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

  try {
    loading.value = true;
    await authStore.login({
      email: email.value,
      password: password.value,
      rememberMe: rememberMe.value
    });
    router.push('/');
  } catch (err) {
    if (err.response?.status === 401) {
      error.value = 'Invalid email or password. Please try again.';
    } else if (err.response?.status === 429) {
      error.value = 'Too many login attempts. Please try again later.';
    } else if (err.response?.status === 403) {
      error.value = 'Your account has been suspended. Please contact support.';
    } else {
      error.value = err.response?.data?.message || 'Login failed. Please check your connection and try again.';
    }
  } finally {
    loading.value = false;
  }
};
</script>
