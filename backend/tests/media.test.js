import { expect } from 'chai';
import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import connectDB from '../config/db.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Media from '../models/Media.js';
import Session from '../models/Session.js';
import authRoutes from '../routes/authRoutes.js';
import mediaRoutes from '../routes/mediaRoutes.js';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/media', mediaRoutes);

describe('Media API Tests', function () {
    let connection;
    let userToken;
    let userId;

    before(async function () {
        connection = await connectDB();
    });

    beforeEach(async function () {
        await User.deleteMany({});
        await Media.deleteMany({});
        await Session.deleteMany({});

        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'mediauser',
                email: 'media@test.com',
                password: 'password123'
            });

        userToken = res.body.token;
        userId = res.body.user._id;
    });

    after(async function () {
        await User.deleteMany({});
        await Media.deleteMany({});
        await Session.deleteMany({});
        await mongoose.connection.close();
    });

    describe('POST /api/media/upload', function () {
        it('should require authentication', async function () {
            const res = await request(app)
                .post('/api/media/upload')
                .send({ data: 'test' });

            expect(res.status).to.equal(401);
        });

        it('should reject upload without data', async function () {
            const res = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${userToken}`)
                .send({});

            expect(res.status).to.equal(400);
        });

        it('should accept base64 image upload', async function () {
            const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

            const res = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    data: testImage,
                    type: 'image'
                });

            expect(res.status).to.equal(201);
            expect(res.body).to.have.property('_id');
            expect(res.body).to.have.property('type', 'image');
        });

        it('should store media metadata in database', async function () {
            const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

            const res = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    data: testImage,
                    type: 'image',
                    filename: 'test.png'
                });

            const media = await Media.findById(res.body._id);
            expect(media).to.not.be.null;
            expect(media.user.toString()).to.equal(userId);
            expect(media.type).to.equal('image');
        });
    });

    describe('GET /api/media/:id', function () {
        it('should retrieve media by ID', async function () {
            const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

            const uploadRes = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    data: testImage,
                    type: 'image'
                });

            const mediaId = uploadRes.body._id;

            const res = await request(app)
                .get(`/api/media/${mediaId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).to.equal(200);
            expect(res.body).to.have.property('_id', mediaId);
        });

        it('should return 404 for non-existent media', async function () {
            const fakeId = new mongoose.Types.ObjectId();

            const res = await request(app)
                .get(`/api/media/${fakeId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).to.equal(404);
        });

        it('should require authentication', async function () {
            const res = await request(app)
                .get(`/api/media/${new mongoose.Types.ObjectId()}`);

            expect(res.status).to.equal(401);
        });
    });

    describe('DELETE /api/media/:id', function () {
        it('should delete own media', async function () {
            const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

            const uploadRes = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    data: testImage,
                    type: 'image'
                });

            const mediaId = uploadRes.body._id;

            const res = await request(app)
                .delete(`/api/media/${mediaId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.status).to.equal(200);

            const media = await Media.findById(mediaId);
            expect(media).to.be.null;
        });

        it('should not delete other users media', async function () {
            const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

            const uploadRes = await request(app)
                .post('/api/media/upload')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    data: testImage,
                    type: 'image'
                });

            const mediaId = uploadRes.body._id;

            const res2 = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'otheruser',
                    email: 'other@test.com',
                    password: 'password123'
                });

            const otherToken = res2.body.token;

            const deleteRes = await request(app)
                .delete(`/api/media/${mediaId}`)
                .set('Authorization', `Bearer ${otherToken}`);

            expect(deleteRes.status).to.equal(403);

            const media = await Media.findById(mediaId);
            expect(media).to.not.be.null;
        });

        it('should require authentication', async function () {
            const res = await request(app)
                .delete(`/api/media/${new mongoose.Types.ObjectId()}`);

            expect(res.status).to.equal(401);
        });
    });

    describe('Media Model', function () {
        it('should create media with required fields', async function () {
            const media = await Media.create({
                user: userId,
                type: 'image',
                url: 'http://example.com/image.jpg',
                size: 1024,
                mimeType: 'image/jpeg'
            });

            expect(media).to.have.property('user');
            expect(media).to.have.property('type', 'image');
            expect(media).to.have.property('url');
            expect(media).to.have.property('size', 1024);
        });

        it('should have default processed flag as false', async function () {
            const media = await Media.create({
                user: userId,
                type: 'video',
                url: 'http://example.com/video.mp4',
                size: 2048,
                mimeType: 'video/mp4'
            });

            expect(media).to.have.property('processed', false);
        });

        it('should store metadata', async function () {
            const media = await Media.create({
                user: userId,
                type: 'image',
                url: 'http://example.com/image.jpg',
                size: 1024,
                mimeType: 'image/jpeg',
                metadata: {
                    width: 1920,
                    height: 1080
                }
            });

            expect(media.metadata).to.deep.equal({
                width: 1920,
                height: 1080
            });
        });
    });
});
