import { expect } from 'chai';
import request from 'supertest';
import { app, httpServer } from '../server.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';
import mongoose from 'mongoose';

// Basic security tests: NoSQL injection, XSS, and authentication checks

describe('Basic Security Tests', function () {
  let connection;

  before(async function () {
    connection = await connectDB();
  });

  afterEach(async function () {
    await User.deleteMany({});
  });

  after(async function () {
    await mongoose.connection.close();
    httpServer.close();
  });

  describe('NoSQL Injection protection', function () {
    it('should not allow login via NoSQL injection payloads', async function () {
      // Register a valid user first
      await request(app)
        .post('/api/auth/register')
        .send({ username: 'injtest', email: 'inj@example.com', password: 'password123' })
        .expect(201);

      // Attempt injection: send objects instead of strings for email/password
      const payload = { email: { $ne: null }, password: { $ne: null } };

      const res = await request(app)
        .post('/api/auth/login')
        .send(payload)
        // We expect the server to reject this attempt (401 or 400)
      ;

      // Accept either 400 or 401 as correct rejection of injection
      expect([400, 401]).to.include(res.status);
    });
  });

  describe('XSS protection (basic)', function () {
    it('should not return raw <script> tags in user data', async function () {
      const xssName = '<script>alert("xss")</script>';
      const email = 'xss@example.com';

      const reg = await request(app)
        .post('/api/auth/register')
        .send({ username: xssName, email, password: 'password123' })
        .expect(201);

      const token = reg.body.token;
      expect(token).to.exist;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const returnedName = res.body.username;
      // The backend should not return raw script tags; at minimum the string should not contain <script
      expect(returnedName).to.be.a('string');
      expect(returnedName.toLowerCase()).to.not.include('<script');
    });
  });

  describe('Authentication enforcement for protected routes', function () {
    it('should require authentication to access conversations', async function () {
      // call conversations without token
      await request(app)
        .get('/api/conversations')
        .expect(401);

      // Register and get token
      const reg = await request(app)
        .post('/api/auth/register')
        .send({ username: 'authtest', email: 'auth@example.com', password: 'password123' })
        .expect(201);

      const token = reg.body.token;

      // Now call conversations with token - expect 200 (or 204/200)
      const r2 = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${token}`);

      // It should not respond with 401
      expect(r2.status).to.not.equal(401);
    });
  });
});

