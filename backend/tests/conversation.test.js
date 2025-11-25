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

  describe('PATCH /api/conversations/:id/archive & unarchive', function() {
    let conversationId;
    beforeEach(async function() {
      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ participantId: user2Id });
      conversationId = res.body._id;
    });

    it('should archive a conversation', async function() {
      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/archive`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(res.body).to.have.property('archived', true);
    });

    it('should unarchive a conversation', async function() {
      await request(app)
        .patch(`/api/conversations/${conversationId}/archive`)
        .set('Authorization', `Bearer ${user1Token}`);

      const res = await request(app)
        .patch(`/api/conversations/${conversationId}/unarchive`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(res.body).to.have.property('archived', false);
    });
  });

  describe('DELETE /api/conversations/:id', function() {
    let conversationId;
    beforeEach(async function() {
      const res = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ participantId: user2Id });
      conversationId = res.body._id;
    });

    it('should soft delete a conversation', async function() {
      await request(app)
        .delete(`/api/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // Should not appear in list afterwards
      const listRes = await request(app)
        .get('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(listRes.body.find(c => c._id === conversationId)).to.be.undefined;
    });
  });

  describe('GET /api/conversations with search & filter', function() {
    beforeEach(async function() {
      // create two direct
      await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ participantId: user2Id });
      // create group
      const user3Res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'guser3', email: 'guser3@example.com', password: 'password123' });
      await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ participantIds: [user2Id, user3Res.body._id], groupName: 'AlphaTeam' });
    });

    it('should filter group conversations', async function() {
      const res = await request(app)
        .get('/api/conversations?filter=group')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(res.body.every(c => c.isGroup)).to.be.true;
    });

    it('should search by group name', async function() {
      const res = await request(app)
        .get('/api/conversations?search=Alpha')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);
      expect(res.body.some(c => c.groupName === 'AlphaTeam')).to.be.true;
    });
  });

  describe('Group management endpoints', function() {
    let groupId;
    let user3Id, user3Token, user4Id;

    beforeEach(async function() {
      // create extra users
      const u3 = await request(app).post('/api/auth/register').send({ username: 'user3g', email: 'user3g@example.com', password: 'password123' });
      user3Id = u3.body._id;
      user3Token = u3.body.token;

      const u4 = await request(app).post('/api/auth/register').send({ username: 'user4g', email: 'user4g@example.com', password: 'password123' });
      user4Id = u4.body._id;

      // create group with user2 and user3
      const grp = await request(app)
        .post('/api/conversations/group')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ participantIds: [user2Id, user3Id], groupName: 'MgmtGroup' });

      groupId = grp.body._id;
    });

    it('admin can update group info', async function() {
      const res = await request(app)
        .patch(`/api/conversations/${groupId}/group-info`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ groupName: 'NewName', groupDescription: 'Desc', groupAvatar: 'avatar.png' })
        .expect(200);

      expect(res.body).to.have.property('message', 'Group info updated');
      expect(res.body.conversation).to.have.property('groupName', 'NewName');
    });

    it('non-admin cannot update group info', async function() {
      await request(app)
        .patch(`/api/conversations/${groupId}/group-info`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ groupName: 'Bad' })
        .expect(403);
    });

    it('admin can add group members', async function() {
      const res = await request(app)
        .post(`/api/conversations/${groupId}/members`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ userIds: [user4Id] })
        .expect(200);

      expect(res.body).to.have.property('message', 'Members added');
      expect(res.body.conversation.participants.map(p => p.toString ? p.toString() : p)).to.include(user4Id);
    });

    it('non-admin cannot add group members', async function() {
      await request(app)
        .post(`/api/conversations/${groupId}/members`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({ userIds: [user4Id] })
        .expect(403);
    });

    it('admin can remove a member', async function() {
      // remove user3
      const res = await request(app)
        .delete(`/api/conversations/${groupId}/members/${user3Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body).to.have.property('message', 'Member removed');
      expect(res.body.conversation.participants.map(p => p.toString ? p.toString() : p)).to.not.include(user3Id);
    });

    it('member can remove themselves', async function() {
      // user3 removes self
      const res = await request(app)
        .delete(`/api/conversations/${groupId}/members/${user3Id}`)
        .set('Authorization', `Bearer ${user3Token}`)
        .expect(200);

      expect(res.body).to.have.property('message', 'Member removed');
    });

    it('admin can promote member to admin', async function() {
      const res = await request(app)
        .patch(`/api/conversations/${groupId}/members/${user2Id}/promote`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(res.body).to.have.property('message', 'Member promoted to admin');
      expect(res.body.conversation.admins.map(a => a.toString ? a.toString() : a)).to.include(user2Id);
    });

    it('non-admin cannot promote', async function() {
      await request(app)
        .patch(`/api/conversations/${groupId}/members/${user2Id}/promote`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);
    });

    it('promote non-member returns 404', async function() {
      const fakeId = mongoose.Types.ObjectId();
      await request(app)
        .patch(`/api/conversations/${groupId}/members/${fakeId}/promote`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);
    });

    it('update notification settings stores values', async function() {
      const res = await request(app)
        .patch(`/api/conversations/${groupId}/notifications`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ muted: true, muteUntil: Date.now() + 10000 })
        .expect(200);

      expect(res.body).to.have.property('message', 'Notification settings updated');
      expect(res.body.settings).to.be.an('object');
    });

    it('invalid conversation id returns 400 for members endpoint', async function() {
      await request(app)
        .post('/api/conversations/invalid-id/members')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ userIds: [user4Id] })
        .expect(400);
    });
  });
});
