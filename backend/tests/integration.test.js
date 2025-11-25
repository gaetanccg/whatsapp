import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Client from 'socket.io-client';
import connectDB from '../config/db.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Session from '../models/Session.js';
import authRoutes from '../routes/authRoutes.js';
import conversationRoutes from '../routes/conversationRoutes.js';
import messageRoutes from '../routes/messageRoutes.js';
import userRoutes from '../routes/userRoutes.js';
import { setupSocket } from '../sockets/chatSocket.js';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

setupSocket(io);

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

describe('Integration Tests', function () {
    let connection;
    let server;
    const PORT = 5555;

    before(async function () {
        connection = await connectDB();
        server = httpServer.listen(PORT);
    });

    beforeEach(async function () {
        await User.deleteMany({});
        await Conversation.deleteMany({});
        await Message.deleteMany({});
        await Session.deleteMany({});
    });

    after(async function () {
        await User.deleteMany({});
        await Conversation.deleteMany({});
        await Message.deleteMany({});
        await Session.deleteMany({});
        server.close();
        await mongoose.connection.close();
    });

    describe('Complete User Flow', function () {
        it('should complete full registration to message flow', async function () {
            const user1Res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'alice',
                    email: 'alice@test.com',
                    password: 'password123'
                });

            expect(user1Res.status).to.equal(201);
            const user1Token = user1Res.body.token;
            const user1Id = user1Res.body.user._id;

            const user2Res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'bob',
                    email: 'bob@test.com',
                    password: 'password123'
                });

            expect(user2Res.status).to.equal(201);
            const user2Token = user2Res.body.token;
            const user2Id = user2Res.body.user._id;

            const addContactRes = await request(app)
                .post(`/api/users/contacts/${user2Id}`)
                .set('Authorization', `Bearer ${user1Token}`);

            expect(addContactRes.status).to.equal(200);

            const convRes = await request(app)
                .post('/api/conversations')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({ participantId: user2Id });

            expect(convRes.status).to.equal(201);
            const conversationId = convRes.body._id;

            const msgRes = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({
                    conversationId: conversationId,
                    content: 'Hello Bob!'
                });

            expect(msgRes.status).to.equal(201);
            expect(msgRes.body.content).to.equal('Hello Bob!');

            const getMessagesRes = await request(app)
                .get(`/api/messages/${conversationId}`)
                .set('Authorization', `Bearer ${user2Token}`);

            expect(getMessagesRes.status).to.equal(200);
            expect(getMessagesRes.body).to.be.an('array');
            expect(getMessagesRes.body).to.have.lengthOf(1);
            expect(getMessagesRes.body[0].content).to.equal('Hello Bob!');
        });
    });

    describe('Group Conversation Flow', function () {
        it('should create group and send messages', async function () {
            const user1Res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'groupuser1',
                    email: 'group1@test.com',
                    password: 'password123'
                });

            const user1Token = user1Res.body.token;
            const user1Id = user1Res.body.user._id;

            const user2Res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'groupuser2',
                    email: 'group2@test.com',
                    password: 'password123'
                });

            const user2Id = user2Res.body.user._id;

            const user3Res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'groupuser3',
                    email: 'group3@test.com',
                    password: 'password123'
                });

            const user3Id = user3Res.body.user._id;

            const groupRes = await request(app)
                .post('/api/conversations/group')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({
                    groupName: 'Test Group',
                    participantIds: [user2Id, user3Id]
                });

            expect(groupRes.status).to.equal(201);
            expect(groupRes.body.isGroup).to.be.true;
            expect(groupRes.body.groupName).to.equal('Test Group');
            expect(groupRes.body.participants).to.have.lengthOf(3);

            const conversationId = groupRes.body._id;

            const msgRes = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({
                    conversationId: conversationId,
                    content: 'Hello group!'
                });

            expect(msgRes.status).to.equal(201);
        });
    });

    describe('Message Edit and Delete Flow', function () {
        it('should edit and delete messages', async function () {
            const userRes = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'edituser',
                    email: 'edit@test.com',
                    password: 'password123'
                });

            const userToken = userRes.body.token;
            const userId = userRes.body.user._id;

            const user2Res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'edituser2',
                    email: 'edit2@test.com',
                    password: 'password123'
                });

            const user2Id = user2Res.body.user._id;

            const convRes = await request(app)
                .post('/api/conversations')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ participantId: user2Id });

            const conversationId = convRes.body._id;

            const msgRes = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    conversationId: conversationId,
                    content: 'Original message'
                });

            const messageId = msgRes.body._id;

            const editRes = await request(app)
                .patch('/api/messages/edit')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    messageId: messageId,
                    content: 'Edited message'
                });

            expect(editRes.status).to.equal(200);
            expect(editRes.body.content).to.equal('Edited message');
            expect(editRes.body.edited).to.be.true;

            const deleteRes = await request(app)
                .delete(`/api/messages/${messageId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(deleteRes.status).to.equal(200);

            const message = await Message.findById(messageId);
            expect(message.deleted).to.be.true;
        });
    });

    describe('Contact Management Flow', function () {
        it('should add, list, and remove contacts', async function () {
            const user1Res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'contactuser1',
                    email: 'contact1@test.com',
                    password: 'password123'
                });

            const user1Token = user1Res.body.token;

            const user2Res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'contactuser2',
                    email: 'contact2@test.com',
                    password: 'password123'
                });

            const user2Id = user2Res.body.user._id;

            const addRes = await request(app)
                .post(`/api/users/contacts/${user2Id}`)
                .set('Authorization', `Bearer ${user1Token}`);

            expect(addRes.status).to.equal(200);

            const listRes = await request(app)
                .get('/api/users/contacts')
                .set('Authorization', `Bearer ${user1Token}`);

            expect(listRes.status).to.equal(200);
            expect(listRes.body).to.be.an('array');
            expect(listRes.body).to.have.lengthOf(1);
            expect(listRes.body[0]._id).to.equal(user2Id);

            const removeRes = await request(app)
                .delete(`/api/users/contacts/${user2Id}`)
                .set('Authorization', `Bearer ${user1Token}`);

            expect(removeRes.status).to.equal(200);

            const listRes2 = await request(app)
                .get('/api/users/contacts')
                .set('Authorization', `Bearer ${user1Token}`);

            expect(listRes2.body).to.have.lengthOf(0);
        });
    });

    describe('Session Management', function () {
        it('should create session on login and list active sessions', async function () {
            const userRes = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'sessionuser',
                    email: 'session@test.com',
                    password: 'password123'
                });

            const userToken = userRes.body.token;

            const sessionsRes = await request(app)
                .get('/api/sessions')
                .set('Authorization', `Bearer ${userToken}`);

            expect(sessionsRes.status).to.equal(200);
            expect(sessionsRes.body).to.be.an('array');
            expect(sessionsRes.body.length).to.be.at.least(1);
        });

        it('should revoke session', async function () {
            const userRes = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'revokeuser',
                    email: 'revoke@test.com',
                    password: 'password123'
                });

            const userToken = userRes.body.token;

            const sessionsRes = await request(app)
                .get('/api/sessions')
                .set('Authorization', `Bearer ${userToken}`);

            const sessionId = sessionsRes.body[0]._id;

            const revokeRes = await request(app)
                .post(`/api/sessions/${sessionId}/revoke`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(revokeRes.status).to.equal(200);

            const meRes = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${userToken}`);

            expect(meRes.status).to.equal(401);
        });
    });

    describe('Conversation Archive Flow', function () {
        it('should archive and unarchive conversation', async function () {
            const user1Res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'archiveuser1',
                    email: 'archive1@test.com',
                    password: 'password123'
                });

            const user1Token = user1Res.body.token;

            const user2Res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'archiveuser2',
                    email: 'archive2@test.com',
                    password: 'password123'
                });

            const user2Id = user2Res.body.user._id;

            const convRes = await request(app)
                .post('/api/conversations')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({ participantId: user2Id });

            const conversationId = convRes.body._id;

            const archiveRes = await request(app)
                .patch(`/api/conversations/${conversationId}/archive`)
                .set('Authorization', `Bearer ${user1Token}`);

            expect(archiveRes.status).to.equal(200);

            const conversation = await Conversation.findById(conversationId);
            expect(conversation.archived).to.be.true;

            const unarchiveRes = await request(app)
                .patch(`/api/conversations/${conversationId}/unarchive`)
                .set('Authorization', `Bearer ${user1Token}`);

            expect(unarchiveRes.status).to.equal(200);

            const conversation2 = await Conversation.findById(conversationId);
            expect(conversation2.archived).to.be.false;
        });
    });
});
