import { expect } from 'chai';
import { io as ioClient } from 'socket.io-client';
import request from 'supertest';
import { app, httpServer, io } from '../server.js';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import connectDB from '../config/db.js';
import mongoose from 'mongoose';
import { setupSocket } from '../sockets/chatSocket.js';

describe('Socket.IO Tests', function() {
  let connection;
  let clientSocket1, clientSocket2;
  let user1Token, user2Token;
  let user1Id, user2Id;
  let conversationId;
  const SOCKET_URL = 'http://localhost:5000';

  before(async function() {
    connection = await connectDB();
    setupSocket(io);

    if (!httpServer.listening) {
      await new Promise((resolve) => {
        httpServer.listen(5000, resolve);
      });
    }
  });

  beforeEach(async function() {
    const user1Res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'socketuser1',
        email: 'socketuser1@example.com',
        password: 'password123'
      });

    user1Token = user1Res.body.token;
    user1Id = user1Res.body._id;

    const user2Res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'socketuser2',
        email: 'socketuser2@example.com',
        password: 'password123'
      });

    user2Token = user2Res.body.token;
    user2Id = user2Res.body._id;

    const convRes = await request(app)
      .post('/api/conversations')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ participantId: user2Id });

    conversationId = convRes.body._id;

    clientSocket1 = ioClient(SOCKET_URL, {
      auth: { token: user1Token },
      transports: ['websocket']
    });

    clientSocket2 = ioClient(SOCKET_URL, {
      auth: { token: user2Token },
      transports: ['websocket']
    });

    await Promise.all([
      new Promise((resolve) => clientSocket1.on('connect', resolve)),
      new Promise((resolve) => clientSocket2.on('connect', resolve))
    ]);
  });

  afterEach(async function() {
    if (clientSocket1?.connected) clientSocket1.disconnect();
    if (clientSocket2?.connected) clientSocket2.disconnect();

    await User.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
  });

  after(async function() {
    await mongoose.connection.close();
    if (httpServer.listening) {
      await new Promise((resolve) => {
        httpServer.close(resolve);
      });
    }
  });

  describe('Connection', function() {
    it('should connect two users', function(done) {
      expect(clientSocket1.connected).to.be.true;
      expect(clientSocket2.connected).to.be.true;
      done();
    });

    it('should receive online users list', function(done) {
      clientSocket1.on('onlineUsers', (users) => {
        expect(users).to.be.an('array');
        expect(users.length).to.be.at.least(2);
        done();
      });
    });
  });

  describe('Messaging', function() {
    it('should send and receive messages', function(done) {
      clientSocket2.on('receiveMessage', (message) => {
        expect(message).to.have.property('content', 'Hello from user1');
        expect(message).to.have.property('conversation', conversationId);
        done();
      });

      clientSocket1.emit('sendMessage', {
        conversationId,
        content: 'Hello from user1'
      });
    });

    it('should receive new message notification', function(done) {
      clientSocket2.on('newMessageNotification', (data) => {
        expect(data).to.have.property('conversationId', conversationId);
        expect(data.message).to.have.property('content', 'Test notification');
        expect(data).to.have.property('unreadCount');
        done();
      });

      clientSocket1.emit('sendMessage', {
        conversationId,
        content: 'Test notification'
      });
    });
  });

  describe('User Status', function() {
    it('should broadcast user status on connect', function(done) {
      clientSocket1.on('userStatusUpdate', (data) => {
        expect(data).to.have.property('userId');
        expect(data).to.have.property('isOnline');
        done();
      });

      const tempSocket = ioClient(SOCKET_URL, {
        auth: { token: user1Token },
        transports: ['websocket']
      });
    });

    it('should broadcast user status on disconnect', function(done) {
      clientSocket1.on('userStatusUpdate', (data) => {
        if (!data.isOnline && data.userId === user2Id) {
          expect(data).to.have.property('isOnline', false);
          done();
        }
      });

      setTimeout(() => {
        clientSocket2.disconnect();
      }, 100);
    });
  });

  describe('Typing Indicator', function() {
    it('should broadcast typing status', function(done) {
      clientSocket2.on('userTyping', (data) => {
        expect(data).to.have.property('userId', user1Id);
        expect(data).to.have.property('conversationId', conversationId);
        expect(data).to.have.property('isTyping', true);
        done();
      });

      clientSocket1.emit('joinConversation', conversationId);
      clientSocket2.emit('joinConversation', conversationId);

      setTimeout(() => {
        clientSocket1.emit('typing', {
          conversationId,
          isTyping: true
        });
      }, 100);
    });
  });
});
