import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import connectDB from '../config/db.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Session from '../models/Session.js';
import authRoutes from '../routes/authRoutes.js';
import userRoutes from '../routes/userRoutes.js';
import messageRoutes from '../routes/messageRoutes.js';
import conversationRoutes from '../routes/conversationRoutes.js';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);

describe('User Blocking Tests', function () {
    let connection;
    let user1Token, user2Token;
    let user1Id, user2Id;
    let conversationId;

    before(async function () {
        connection = await connectDB();
    });

    beforeEach(async function () {
        await User.deleteMany({});
        await Conversation.deleteMany({});
        await Message.deleteMany({});
        await Session.deleteMany({});

        const res1 = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'user1',
                email: 'user1@test.com',
                password: 'password123'
            });

        user1Token = res1.body.token;
        user1Id = res1.body.user._id;

        const res2 = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'user2',
                email: 'user2@test.com',
                password: 'password123'
            });

        user2Token = res2.body.token;
        user2Id = res2.body.user._id;

        const convRes = await request(app)
            .post('/api/conversations')
            .set('Authorization', `Bearer ${user1Token}`)
            .send({ participantId: user2Id });

        conversationId = convRes.body._id;
    });

    after(async function () {
        await User.deleteMany({});
        await Conversation.deleteMany({});
        await Message.deleteMany({});
        await Session.deleteMany({});
        await mongoose.connection.close();
    });

    describe('POST /api/users/:id/block', function () {
        it('should block a user', async function () {
            const res = await request(app)
                .post(`/api/users/${user2Id}/block`)
                .set('Authorization', `Bearer ${user1Token}`);

            expect(res.status).to.equal(200);
            expect(res.body).to.have.property('message');
            expect(res.body.message).to.include('blocked');
        });

        it('should unblock a previously blocked user', async function () {
            await request(app)
                .post(`/api/users/${user2Id}/block`)
                .set('Authorization', `Bearer ${user1Token}`);

            const res = await request(app)
                .post(`/api/users/${user2Id}/block`)
                .set('Authorization', `Bearer ${user1Token}`);

            expect(res.status).to.equal(200);
            expect(res.body.message).to.include('unblocked');
        });

        it('should not block without authentication', async function () {
            const res = await request(app)
                .post(`/api/users/${user2Id}/block`);

            expect(res.status).to.equal(401);
        });

        it('should not block self', async function () {
            const res = await request(app)
                .post(`/api/users/${user1Id}/block`)
                .set('Authorization', `Bearer ${user1Token}`);

            expect(res.status).to.equal(400);
        });
    });

    describe('GET /api/users/blocked', function () {
        it('should return list of blocked users', async function () {
            await request(app)
                .post(`/api/users/${user2Id}/block`)
                .set('Authorization', `Bearer ${user1Token}`);

            const res = await request(app)
                .get('/api/users/blocked')
                .set('Authorization', `Bearer ${user1Token}`);

            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array');
            expect(res.body).to.have.lengthOf(1);
            expect(res.body[0]._id).to.equal(user2Id);
        });

        it('should return empty array when no blocked users', async function () {
            const res = await request(app)
                .get('/api/users/blocked')
                .set('Authorization', `Bearer ${user1Token}`);

            expect(res.status).to.equal(200);
            expect(res.body).to.be.an('array');
            expect(res.body).to.have.lengthOf(0);
        });

        it('should not return blocked users without authentication', async function () {
            const res = await request(app)
                .get('/api/users/blocked');

            expect(res.status).to.equal(401);
        });
    });

    describe('Message blocking enforcement', function () {
        it('should prevent sending message to blocked user', async function () {
            await request(app)
                .post(`/api/users/${user2Id}/block`)
                .set('Authorization', `Bearer ${user1Token}`);

            const res = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({
                    conversationId: conversationId,
                    content: 'This should fail'
                });

            expect(res.status).to.equal(403);
        });

        it('should prevent receiving messages from blocked user', async function () {
            await request(app)
                .post(`/api/users/${user1Id}/block`)
                .set('Authorization', `Bearer ${user2Token}`);

            const res = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({
                    conversationId: conversationId,
                    content: 'This should fail'
                });

            expect(res.status).to.equal(403);
        });

        it('should allow messaging after unblocking', async function () {
            await request(app)
                .post(`/api/users/${user2Id}/block`)
                .set('Authorization', `Bearer ${user1Token}`);

            await request(app)
                .post(`/api/users/${user2Id}/block`)
                .set('Authorization', `Bearer ${user1Token}`);

            const res = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${user1Token}`)
                .send({
                    conversationId: conversationId,
                    content: 'This should succeed'
                });

            expect(res.status).to.equal(201);
            expect(res.body).to.have.property('content', 'This should succeed');
        });

        it('should prevent viewing messages from blocked conversation', async function () {
            await request(app)
                .post(`/api/users/${user2Id}/block`)
                .set('Authorization', `Bearer ${user1Token}`);

            const res = await request(app)
                .get(`/api/messages/${conversationId}`)
                .set('Authorization', `Bearer ${user1Token}`);

            expect(res.status).to.equal(403);
        });
    });

    describe('User model blocking', function () {
        it('should add user to blocked array', async function () {
            await request(app)
                .post(`/api/users/${user2Id}/block`)
                .set('Authorization', `Bearer ${user1Token}`);

            const user = await User.findById(user1Id);
            expect(user.blocked).to.be.an('array');
            expect(user.blocked).to.have.lengthOf(1);
            expect(user.blocked[0].toString()).to.equal(user2Id);
        });

        it('should remove user from blocked array on unblock', async function () {
            await request(app)
                .post(`/api/users/${user2Id}/block`)
                .set('Authorization', `Bearer ${user1Token}`);

            await request(app)
                .post(`/api/users/${user2Id}/block`)
                .set('Authorization', `Bearer ${user1Token}`);

            const user = await User.findById(user1Id);
            expect(user.blocked).to.be.an('array');
            expect(user.blocked).to.have.lengthOf(0);
        });
    });
});
