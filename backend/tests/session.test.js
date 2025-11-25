import { expect } from 'chai';
import request from 'supertest';
import { app, httpServer } from '../server.js';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Session from '../models/Session.js';
import LoginHistory from '../models/LoginHistory.js';

describe('Session Management Tests', function() {
  before(async function() {
    await connectDB();
  });

  afterEach(async function() {
    await Promise.all([
      User.deleteMany({}),
      Session.deleteMany({}),
      LoginHistory.deleteMany({})
    ]);
  });

  after(async function() {
    await mongoose.connection.close();
    httpServer.close();
  });

  it('should create session and login history on register', async function() {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'u1', email: 'u1@example.com', password: 'password123' })
      .expect(201);
    expect(res.body).to.have.property('token');
    const sessions = await Session.find({});
    expect(sessions.length).to.equal(1);
    const histories = await LoginHistory.find({});
    expect(histories.length).to.equal(1);
    expect(histories[0].eventType).to.equal('login');
  });

  it('should create session and login history on login', async function() {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'u1', email: 'u1@example.com', password: 'password123' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'u1@example.com', password: 'password123' })
      .expect(200);
    expect(res.body).to.have.property('token');
    const sessions = await Session.find({});
    expect(sessions.length).to.equal(2); // register + login
    const histories = await LoginHistory.find({ eventType: 'login' });
    expect(histories.length).to.equal(2);
  });

  it('should list active sessions', async function() {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'u1', email: 'u1@example.com', password: 'password123' });
    const token = reg.body.token;
    const listRes = await request(app)
      .get('/api/sessions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(listRes.body).to.be.an('array');
    expect(listRes.body.length).to.equal(1);
    expect(listRes.body[0]).to.have.property('ip');
  });

  it('should revoke a session', async function() {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'u1', email: 'u1@example.com', password: 'password123' });
    const token = reg.body.token;
    const sessions = await Session.find({});
    const sessionId = sessions[0]._id.toString();
    const revokeRes = await request(app)
      .delete(`/api/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(revokeRes.body).to.have.property('message', 'Session revoked');
    const refreshed = await Session.findById(sessionId);
    expect(refreshed.revoked).to.be.true;
  });

  it('should create logout history on /api/auth/logout', async function() {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'u1', email: 'u1@example.com', password: 'password123' });
    const token = reg.body.token;
    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const histories = await LoginHistory.find({ eventType: 'logout' });
    expect(histories.length).to.equal(1);
  });

  it('should list login history', async function() {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'u1', email: 'u1@example.com', password: 'password123' });
    const token = reg.body.token;
    // perform a login to add second history
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'u1@example.com', password: 'password123' });
    const historyRes = await request(app)
      .get('/api/sessions/history?limit=10&page=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(historyRes.body).to.have.property('items');
    expect(historyRes.body.items.length).to.equal(2);
    expect(historyRes.body).to.have.property('total');
  });

  it('should filter login history by eventType', async function() {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'u1', email: 'u1@example.com', password: 'password123' });
    const token = reg.body.token;

    await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    const historyRes = await request(app)
      .get('/api/sessions/history?eventType=logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(historyRes.body.items).to.be.an('array');
    expect(historyRes.body.items.length).to.be.at.least(1);
    historyRes.body.items.forEach(item => {
      expect(item.eventType).to.equal('logout');
    });
  });

  it('should not revoke already revoked session', async function() {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'u1', email: 'u1@example.com', password: 'password123' });
    const token = reg.body.token;
    const sessions = await Session.find({});
    const sessionId = sessions[0]._id.toString();

    await request(app)
      .delete(`/api/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const revokeRes = await request(app)
      .delete(`/api/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('should not revoke non-existent session', async function() {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'u1', email: 'u1@example.com', password: 'password123' });
    const token = reg.body.token;
    const fakeId = new mongoose.Types.ObjectId();

    const revokeRes = await request(app)
      .delete(`/api/sessions/${fakeId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);

    expect(revokeRes.body).to.have.property('message', 'Session not found');
  });

  it('should handle pagination in history', async function() {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ username: 'u1', email: 'u1@example.com', password: 'password123' });
    const token = reg.body.token;

    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'u1@example.com', password: 'password123' });
    }

    const historyRes = await request(app)
      .get('/api/sessions/history?limit=3&page=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(historyRes.body.items.length).to.equal(3);
    expect(historyRes.body.page).to.equal(1);
    expect(historyRes.body.limit).to.equal(3);
    expect(historyRes.body.total).to.be.at.least(6);
  });
});

