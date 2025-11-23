import {expect} from 'chai';
import request from 'supertest';
import {app, httpServer} from '../server.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import connectDB from '../config/db.js';
import mongoose from 'mongoose';

describe('Middleware Tests', function () {
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

    describe('Auth Middleware', function () {
        let validToken;
        let userId;

        beforeEach(async function () {
            const user = await User.create({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            });

            userId = user._id;
            validToken = jwt.sign({id: user._id}, process.env.JWT_SECRET, {expiresIn: '30d'});
        });

        it('should allow access with valid token', async function () {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);

            expect(res.body).to.be.an('array');
        });

        it('should reject request without token', async function () {
            const res = await request(app)
                .get('/api/users')
                .expect(401);

            expect(res.body).to.have.property('message', 'Not authorized, no token');
        });

        it('should reject request with invalid token', async function () {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', 'Bearer invalidtoken123')
                .expect(401);

            expect(res.body).to.have.property('message', 'Not authorized, token failed');
        });

        it('should reject request with expired token', async function () {
            const expiredToken = jwt.sign({id: userId}, process.env.JWT_SECRET, {expiresIn: '0s'});

            await new Promise(resolve => setTimeout(resolve, 100));

            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${expiredToken}`)
                .expect(401);

            expect(res.body).to.have.property('message', 'Not authorized, token failed');
        });

        it('should reject request with token for non-existent user', async function () {
            await User.findByIdAndDelete(userId);

            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(401);

            expect(res.body).to.have.property('message', 'User not found');
        });

        it('should reject request with malformed Authorization header', async function () {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', validToken)
                .expect(401);

            expect(res.body).to.have.property('message', 'Not authorized, no token');
        });

        it('should reject request with wrong secret', async function () {
            const wrongToken = jwt.sign({id: userId}, 'wrong-secret', {expiresIn: '30d'});

            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${wrongToken}`)
                .expect(401);

            expect(res.body).to.have.property('message', 'Not authorized, token failed');
        });

        it('should attach user to request object', async function () {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);

            expect(res.body).to.have.property('_id');
            expect(res.body).to.have.property('username', 'testuser');
            expect(res.body).to.not.have.property('password');
        });
    });

    describe('Error Handling Middleware', function () {
        it('should return 404 for non-existent routes', async function () {
            const res = await request(app)
                .get('/api/nonexistent')
                .expect(404);
        });

        it('should handle server errors gracefully', async function () {
            const token = jwt.sign({id: 'invalid-id'}, process.env.JWT_SECRET);

            const res = await request(app)
                .get('/api/users/invalid-id')
                .set('Authorization', `Bearer ${token}`)
                .expect(500);

            expect(res.body).to.have.property('message');
        });
    });

    describe('CORS Middleware', function () {
        it('should include CORS headers', async function () {
            const res = await request(app)
                .get('/')
                .expect(200);

            expect(res.headers).to.have.property('access-control-allow-origin');
        });

        it('should handle OPTIONS requests', async function () {
            const res = await request(app)
                .options('/api/users')
                .expect(204);
        });
    });

    describe('JSON Body Parser', function () {
        it('should parse JSON request body', async function () {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'newuser',
                    email: 'new@example.com',
                    password: 'password123'
                })
                .expect(201);

            expect(res.body).to.have.property('username', 'newuser');
        });

        it('should handle malformed JSON', async function () {
            const res = await request(app)
                .post('/api/auth/register')
                .set('Content-Type', 'application/json')
                .send('{ invalid json }')
                .expect(400);
        });
    });
});
