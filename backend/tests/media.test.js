import {expect} from 'chai';
import request from 'supertest';
import express from 'express';
import {createServer} from 'http';
import connectDB from '../config/db.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Media from '../models/Media.js';
import Session from '../models/Session.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import authRoutes from '../routes/authRoutes.js';
import mediaRoutes from '../routes/mediaRoutes.js';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json({limit: '10mb'}));
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
        await Conversation.deleteMany({});
        await Message.deleteMany({});

        const res = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'mediauser',
                email: 'media@test.com',
                password: 'password123'
            });

        userToken = res.body.token;
        userId = res.body._id || res.body.user?._id;

        // Create conversation
        const conv = await Conversation.create({
            participants: [userId],
            unreadCount: {}
        });
        this.conversationId = conv._id.toString();

        // Create message
        const msg = await Message.create({
            conversation: conv._id,
            sender: userId
        });

        this.messageId = msg._id.toString();

        // Ensure upload directories
        fs.mkdirSync(path.join(process.cwd(), 'backend', 'uploads', 'original', this.conversationId), {recursive: true});
        fs.mkdirSync(path.join(process.cwd(), 'backend', 'uploads', 'thumbs', this.conversationId), {recursive: true});
    });

    after(async function () {
        await User.deleteMany({});
        await Media.deleteMany({});
        await Session.deleteMany({});
        await Message.deleteMany({});
        await mongoose.connection.close();
    });

    describe('File-backed media endpoints', function () {
        let mediaId;
        let storedFilename = 'testfile.bin';
        let thumbnailFilename = 'thumb.jpg';

        beforeEach(async function () {
            const originalPath = path.join(process.cwd(), 'backend', 'uploads', 'original', this.conversationId, storedFilename);
            const thumbPath = path.join(process.cwd(), 'backend', 'uploads', 'thumbs', this.conversationId, thumbnailFilename);

            fs.writeFileSync(originalPath, 'original-file-content');
            fs.writeFileSync(thumbPath, 'thumb-content');

            const media = await Media.create({
                user: userId,
                conversation: this.conversationId,
                message: this.messageId,
                type: 'image',
                originalFilename: 'orig.png',
                storedFilename,
                sizeBytes: 123,
                mimeType: 'image/png',
                thumbnailFilename
            });

            mediaId = media._id.toString();
        });

        afterEach(function () {
            const orig = path.join(process.cwd(), 'backend', 'uploads', 'original', this.conversationId, storedFilename);
            const thumb = path.join(process.cwd(), 'backend', 'uploads', 'thumbs', this.conversationId, thumbnailFilename);
            if (fs.existsSync(orig)) fs.unlinkSync(orig);
            if (fs.existsSync(thumb)) fs.unlinkSync(thumb);
        });

        it('should download media by ID', async function () {
            const res = await request(app)
                .get(`/api/media/${mediaId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(res.headers['content-type']).to.include('image/png');
            expect(res.headers['content-disposition']).to.include('attachment');
            expect(res.body.toString()).to.include('original-file-content');
        });

        it('should stream raw media', async function () {
            const res = await request(app)
                .get(`/api/media/${mediaId}/raw`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(res.headers['content-type']).to.include('image/png');
            expect(res.body.toString()).to.include('original-file-content');
        });

        it('should return thumbnail', async function () {
            const res = await request(app)
                .get(`/api/media/${mediaId}/thumbnail`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(res.headers['content-type']).to.include('image/jpeg');
            expect(res.body.toString()).to.include('thumb-content');
        });

        it('should list conversation media', async function () {
            const res = await request(app)
                .get(`/api/media/conversation/${this.conversationId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(res.body).to.be.an('array');
            expect(res.body.some(m => m._id === mediaId)).to.be.true;
        });

        it('should delete own media (soft delete)', async function () {
            await request(app)
                .delete(`/api/media/${mediaId}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            const m = await Media.findById(mediaId);
            expect(m.deletedAt).to.exist;
        });

        it('should forbid deleting other users media', async function () {
            const other = await request(app)
                .post('/api/auth/register')
                .send({
                    username: 'other',
                    email: 'o@test.com',
                    password: 'password123'
                });

            const otherToken = other.body.token;

            await request(app)
                .delete(`/api/media/${mediaId}`)
                .set('Authorization', `Bearer ${otherToken}`)
                .expect(403);
        });
    });

    describe('Media Model', function () {
        it('should create media with required fields', async function () {
            const media = await Media.create({
                user: userId,
                conversation: this.conversationId,
                message: this.messageId,
                type: 'image',
                originalFilename: 'orig.jpg',
                storedFilename: 'orig-stored.jpg',
                sizeBytes: 1024,
                mimeType: 'image/jpeg',
                url: 'http://example.com/image.jpg'
            });

            expect(media).to.have.property('type', 'image');
            expect(media).to.have.property('url');
            expect(media).to.have.property('sizeBytes', 1024);
        });

        it('should have default processed flag as false', async function () {
            const media = await Media.create({
                user: userId,
                conversation: this.conversationId,
                message: this.messageId,
                type: 'video',
                originalFilename: 'vid.mp4',
                storedFilename: 'vid-stored.mp4',
                sizeBytes: 2048,
                mimeType: 'video/mp4',
                url: 'http://example.com/video.mp4'
            });

            expect(media).to.have.property('processed', false);
        });

        it('should store metadata', async function () {
            const media = await Media.create({
                user: userId,
                conversation: this.conversationId,
                message: this.messageId,
                type: 'image',
                originalFilename: 'meta.jpg',
                storedFilename: 'meta-stored.jpg',
                sizeBytes: 1024,
                mimeType: 'image/jpeg',
                url: 'http://example.com/image.jpg',
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
