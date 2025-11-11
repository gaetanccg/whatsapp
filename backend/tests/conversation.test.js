import { expect } from 'chai';
import request from 'supertest';
import { app, httpServer } from '../server.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import connectDB from '../config/db.js';
import mongoose from 'mongoose';

describe('Conversation API Tests', function() {
  let connection;
  let user1Token, user2Token;
  let user1Id, user2Id;

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
  });

  afterEach(async function() {
    await User.deleteMany({});
    await Conversation.deleteMany({});
  });

  after(async function() {
    await mongoose.connection.close();
    httpServer.close();
  });

  describe('POST /api/conversations', function() {
    it('should create a new conversation', async function() {
      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ participantId: user2Id })
        .expect(200);

      expect(res.body).to.have.property('participants');
      expect(res.body.participants).to.have.lengthOf(2);
      expect(res.body).to.have.property('isGroup', false);
    });

    it('should return existing conversation if already exists', async function() {
      const res1 = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ participantId: user2Id });

      const res2 = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ participantId: user2Id })
        .expect(200);

      expect(res1.body._id).to.equal(res2.body._id);
    });

    it('should not create conversation without participant ID', async function() {
      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({})
        .expect(400);

      expect(res.body).to.have.property('message', 'Participant ID is required');
    });
  });

  describe('POST /api/conversations/group', function() {
    it('should create a group conversation', async function() {
      const user3Res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'user3',
          email: 'user3@example.com',
          password: 'password123'
        });

      const res = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantIds: [user2Id, user3Res.body._id],
          groupName: 'Test Group'
        })
        .expect(201);

      expect(res.body).to.have.property('isGroup', true);
      expect(res.body).to.have.property('groupName', 'Test Group');
      expect(res.body.participants).to.have.lengthOf(3);
    });

    it('should not create group without enough participants', async function() {
      const res = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantIds: [user2Id],
          groupName: 'Test Group'
        })
        .expect(400);

      expect(res.body).to.have.property('message', 'At least 2 participants are required');
    });

    it('should not create group without group name', async function() {
      const res = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          participantIds: [user2Id, user1Id]
        })
        .expect(400);

      expect(res.body).to.have.property('message', 'Group name is required');
    });
  });

  describe('GET /api/conversations', function() {
    beforeEach(async function() {
      await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ participantId: user2Id });
    });

    it('should get all conversations for user', async function() {
      const res = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf(1);
    });

    it('should not get conversations without authorization', async function() {
      await request(app)
        .get('/api/conversations')
        .expect(401);
    });
  });
});
