<template>
  <v-app>
    <v-main>
      <v-container class="fill-height" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="4">
            <v-card class="elevation-12">
              <v-toolbar color="green-darken-1" dark>
                <v-toolbar-title>Forgot Password</v-toolbar-title>
              </v-toolbar>
              <v-card-text>
                <v-alert v-if="successMessage" type="success" class="mb-3">
                  {{ successMessage }}
                </v-alert>
                <v-form v-if="!successMessage" @submit.prevent="handleForgotPassword">
                  <p class="text-body-2 mb-4">
                    Enter your email address and we'll send you instructions to reset your password.
                  </p>
                  <v-text-field
                    v-model="email"
                    label="Email"
                    type="email"
                    prepend-icon="mdi-email"
                    required
                    :error-messages="errors.email"
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
                  @click="handleForgotPassword"
                  :loading="loading"
                >
                  Send Reset Link
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
import { authAPI } from '../services/api.js';

const email = ref('');
const loading = ref(false);
const error = ref('');
const errors = ref({});
const successMessage = ref('');

const handleForgotPassword = async () => {
  errors.value = {};
  error.value = '';
  successMessage.value = '';

  if (!email.value) {
    errors.value.email = 'Email is required';
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value)) {
    errors.value.email = 'Please enter a valid email';
    return;
  }

  try {
    loading.value = true;
    await authAPI.forgotPassword(email.value);
    successMessage.value = 'Password reset instructions have been sent to your email.';
  } catch (err) {
    error.value = err.response?.data?.message || 'Failed to send reset email. Please try again.';
  } finally {
    loading.value = false;
  }
};
</script>
