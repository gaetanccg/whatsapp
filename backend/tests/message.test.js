import { expect } from 'chai';
import request from 'supertest';
import { app, httpServer } from '../server.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import connectDB from '../config/db.js';
import mongoose from 'mongoose';

describe('Message API Tests', function() {
  let connection;
  let user1Token, user2Token;
  let user1Id, user2Id;
  let conversationId;

  before(async function() {
    connection = await connectDB();
  });

  beforeEach(async function() {
    const user1Res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'user1',
        email: 'user1@example.com',
        password: 'password123'
      });

    user1Token = user1Res.body.token;
    user1Id = user1Res.body._id;

    const user2Res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'user2',
        email: 'user2@example.com',
        password: 'password123'
      });

    user2Token = user2Res.body.token;
    user2Id = user2Res.body._id;

    const convRes = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ participantId: user2Id });

    conversationId = convRes.body._id;
  });

  afterEach(async function() {
    await User.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
  });

  after(async function() {
    await mongoose.connection.close();
    httpServer.close();
  });

  describe('POST /api/messages', function() {
    it('should send a message', async function() {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          conversationId,
          content: 'Hello, this is a test message'
        })
        .expect(201);

      expect(res.body).to.have.property('content', 'Hello, this is a test message');
      expect(res.body).to.have.property('conversation', conversationId);
      expect(res.body.sender).to.have.property('username', 'user1');
    });

    it('should not send message without content', async function() {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ conversationId })
        .expect(400);

      expect(res.body).to.have.property('message', 'Conversation ID and content are required');
    });

    it('should not send message to non-existent conversation', async function() {
      const fakeId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          conversationId: fakeId,
          content: 'Test message'
        })
        .expect(404);

      expect(res.body).to.have.property('message', 'Conversation not found');
    });
  });

  describe('GET /api/messages/:conversationId', function() {
    beforeEach(async function() {
      await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          conversationId,
          content: 'Message 1'
        });

      await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          conversationId,
          content: 'Message 2'
        });
    });

    it('should get messages from a conversation', async function() {
      const res = await request(app)
        .get(`/api/messages/${conversationId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf(2);
      expect(res.body[0]).to.have.property('content', 'Message 1');
      expect(res.body[1]).to.have.property('content', 'Message 2');
    });

    it('should not get messages without authorization', async function() {
      await request(app)
        .get(`/api/messages/${conversationId}`)
        .expect(401);
    });

    it('should not get messages from conversation user is not part of', async function() {
      const user3Res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user3',
          email: 'user3@example.com',
          password: 'password123'
        });

      const res = await request(app)
        .get(`/api/messages/${conversationId}`)
        .set('Authorization', `Bearer ${user3Res.body.token}`)
        .expect(404);

      expect(res.body).to.have.property('message', 'Conversation not found');
    });
  });

  describe('POST /api/messages/reply', function() {
    it('should send a reply to an existing message', async function() {
      // créer message original
      const originalRes = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ conversationId, content: 'Original message' })
        .expect(201);

      const replyRes = await request(app)
        .post('/api/messages/reply')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ conversationId, content: 'Reply content', replyTo: originalRes.body._id })
        .expect(201);

      expect(replyRes.body).to.have.property('content', 'Reply content');
      expect(replyRes.body).to.have.property('replyTo');
      expect(replyRes.body.replyTo).to.have.property('_id', originalRes.body._id);
      expect(replyRes.body.replyTo).to.have.property('content', 'Original message');
    });

    it('should fail replying without replyTo id', async function() {
      await request(app)
        .post('/api/messages/reply')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ conversationId, content: 'No target' })
        .expect(400);
    });
  });
});
