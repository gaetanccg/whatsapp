<template>
  <v-app>
    <v-main>
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="4">
            <v-card class="elevation-12">
              <v-toolbar color="green-darken-1" dark>
                <v-toolbar-title>Reset Password</v-toolbar-title>
              </v-toolbar>
              <v-card-text>
                <v-alert v-if="successMessage" type="success" class="mb-3">
                  {{ successMessage }}
                </v-alert>
                <v-form v-if="!successMessage" @submit.prevent="handleResetPassword">
                  <v-text-field
                    v-model="password"
                    label="New Password"
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
                <v-btn
                  color="green-darken-1"
                  variant="text"
                  :to="{ name: 'Login' }"
                >
                  Back to Login
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn
                  v-if="!successMessage"
                  color="green-darken-1"
                  variant="elevated"
                  @click="handleResetPassword"
                  :loading="loading"
                >
                  Reset Password
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
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { authAPI } from '../services/api.js';

const route = useRoute();
const router = useRouter();

const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref('');
const errors = ref({});
const successMessage = ref('');
const token = ref('');

onMounted(() => {
  token.value = route.query.token || '';
  if (!token.value) {
    error.value = 'Invalid or missing reset token';
  }
});

const handleResetPassword = async () => {
  errors.value = {};
  error.value = '';
  successMessage.value = '';

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

  if (!token.value) {
    error.value = 'Invalid or missing reset token';
    return;
  }

  try {
    loading.value = true;
    await authAPI.resetPassword(token.value, password.value);
    successMessage.value = 'Password reset successfully! Redirecting to login...';
    setTimeout(() => {
      router.push({ name: 'Login' });
    }, 2000);
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to reset password. The link may have expired.';
  } finally {
    loading.value = false;
  }
};
</script>
