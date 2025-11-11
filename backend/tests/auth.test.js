import { expect } from 'chai';
import request from 'supertest';
import { app, httpServer } from '../server.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';
import mongoose from 'mongoose';

describe('Auth API Tests', function() {
  let connection;

  before(async function() {
    connection = await connectDB();
  });

  afterEach(async function() {
    await User.deleteMany({});
  });

  after(async function() {
    await mongoose.connection.close();
    httpServer.close();
  });

  describe('POST /api/auth/register', function() {
    it('should register a new user', async function() {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(res.body).to.have.property('token');
      expect(res.body).to.have.property('username', 'testuser');
      expect(res.body).to.have.property('email', 'test@example.com');
      expect(res.body).to.not.have.property('password');
    });

    it('should not register user with existing email', async function() {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      await request(app).post('/api/auth/register').send(userData);

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(res.body).to.have.property('message', 'User already exists');
    });

    it('should not register user with missing fields', async function() {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(res.body).to.have.property('message', 'Please provide all fields');
    });
  });

  describe('POST /api/auth/login', function() {
    beforeEach(async function() {
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });
    });

    it('should login with valid credentials', async function() {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(res.body).to.have.property('token');
      expect(res.body).to.have.property('username', 'testuser');
    });

    it('should not login with invalid password', async function() {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(res.body).to.have.property('message', 'Invalid email or password');
    });

    it('should not login with non-existent email', async function() {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);

      expect(res.body).to.have.property('message', 'Invalid email or password');
    });
  });

  describe('GET /api/auth/me', function() {
    let token;

    beforeEach(async function() {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      token = res.body.token;
    });

    it('should get current user with valid token', async function() {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).to.have.property('username', 'testuser');
      expect(res.body).to.have.property('email', 'test@example.com');
    });

    it('should not get user without token', async function() {
      const res = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(res.body).to.have.property('message', 'Not authorized, no token');
    });

    it('should not get user with invalid token', async function() {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);

      expect(res.body).to.have.property('message', 'Not authorized, token failed');
    });
  });
});
