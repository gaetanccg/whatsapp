import {expect} from 'chai';
import request from 'supertest';
import {app, httpServer} from '../server.js';
import User from '../models/User.js';
import connectDB from '../config/db.js';
import mongoose from 'mongoose';

describe('User API Tests', function () {
    let connection;
    let authToken;
    let userId;

    before(async function () {
        connection = await connectDB();
    });

    beforeEach(async function () {
        await User.deleteMany({});

        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            });

        authToken = res.body.token;
        userId = res.body._id;
    });

    afterEach(async function () {
        await User.deleteMany({});
    });

    after(async function () {
        await mongoose.connection.close();
        httpServer.close();
    });

    describe('GET /api/users', function () {
        it('should get all users except current user', async function () {
            await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'user2',
                    email: 'user2@example.com',
                    password: 'password123'
                });

            await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'user3',
                    email: 'user3@example.com',
                    password: 'password123'
                });

            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body).to.be.an('array');
            expect(res.body).to.have.lengthOf(2);
            expect(res.body[0]).to.not.have.property('password');
        });

        it('should not get users without authentication', async function () {
            await request(app)
                .get('/api/users')
                .expect(401);
        });

        it('should return empty array when only one user exists', async function () {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body).to.be.an('array');
            expect(res.body).to.have.lengthOf(0);
        });
    });

    describe('GET /api/users/search', function () {
        beforeEach(async function () {
            await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'john',
                    email: 'john@example.com',
                    password: 'password123'
                });

            await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'jane',
                    email: 'jane@example.com',
                    password: 'password123'
                });
        });

        it('should search users by username', async function () {
            const res = await request(app)
                .get('/api/users/search?query=john')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body).to.be.an('array');
            expect(res.body).to.have.lengthOf(1);
            expect(res.body[0].username).to.equal('john');
        });

        it('should search users by email', async function () {
            const res = await request(app)
                .get('/api/users/search?query=jane@')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body).to.be.an('array');
            expect(res.body).to.have.lengthOf(1);
            expect(res.body[0].email).to.equal('jane@example.com');
        });

        it('should not search without query parameter', async function () {
            const res = await request(app)
                .get('/api/users/search')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(400);

            expect(res.body).to.have.property('message', 'Search query is required');
        });

        it('should return empty array for non-matching query', async function () {
            const res = await request(app)
                .get('/api/users/search?query=nonexistent')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body).to.be.an('array');
            expect(res.body).to.have.lengthOf(0);
        });

        it('should be case insensitive', async function () {
            const res = await request(app)
                .get('/api/users/search?query=JOHN')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body).to.be.an('array');
            expect(res.body).to.have.lengthOf(1);
        });
    });

    describe('GET /api/users/:id', function () {
        let otherUserId;

        beforeEach(async function () {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'otheruser',
                    email: 'other@example.com',
                    password: 'password123'
                });

            otherUserId = res.body._id;
        });

        it('should get user by ID', async function () {
            const res = await request(app)
                .get(`/api/users/${otherUserId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(res.body).to.have.property('username', 'otheruser');
            expect(res.body).to.not.have.property('password');
        });

        it('should return 404 for non-existent user', async function () {
            const fakeId = new mongoose.Types.ObjectId();

            const res = await request(app)
                .get(`/api/users/${fakeId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(res.body).to.have.property('message', 'User not found');
        });

        it('should not get user without authentication', async function () {
            await request(app)
                .get(`/api/users/${otherUserId}`)
                .expect(401);
        });
    });
});
