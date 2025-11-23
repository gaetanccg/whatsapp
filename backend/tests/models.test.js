import {expect} from 'chai';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import connectDB from '../config/db.js';
import mongoose from 'mongoose';

describe('Model Tests', function () {
    let connection;

    before(async function () {
        connection = await connectDB();
    });

    afterEach(async function () {
        await User.deleteMany({});
        await Message.deleteMany({});
        await Conversation.deleteMany({});
    });

    after(async function () {
        await mongoose.connection.close();
    });

    describe('User Model', function () {
        it('should create a user with valid data', async function () {
            const user = await User.create({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            });

            expect(user).to.have.property('username', 'testuser');
            expect(user).to.have.property('email', 'test@example.com');
            expect(user.password).to.not.equal('password123');
            expect(user).to.have.property('isOnline', false);
        });

        it('should hash password before saving', async function () {
            const user = await User.create({
                username: 'testuser',
                email: 'test@example.com',
                password: 'plainpassword'
            });

            expect(user.password).to.not.equal('plainpassword');
            expect(user.password).to.have.lengthOf.at.least(60);
        });

        it('should not hash password if not modified', async function () {
            const user = await User.create({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            });

            const hashedPassword = user.password;
            user.username = 'updateduser';
            await user.save();

            expect(user.password).to.equal(hashedPassword);
        });

        it('should match password correctly', async function () {
            const user = await User.create({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            });

            const isMatch = await user.matchPassword('password123');
            expect(isMatch).to.be.true;
        });

        it('should not match incorrect password', async function () {
            const user = await User.create({
                username: 'testuser',
                email: 'test@example.com',
                password: 'password123'
            });

            const isMatch = await user.matchPassword('wrongpassword');
            expect(isMatch).to.be.false;
        });

        it('should require username', async function () {
            try {
                await User.create({
                    email: 'test@example.com',
                    password: 'password123'
                });
                throw new Error('Should have failed');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should require email', async function () {
            try {
                await User.create({
                    username: 'testuser',
                    password: 'password123'
                });
                throw new Error('Should have failed');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should require unique email', async function () {
            await User.create({
                username: 'user1',
                email: 'test@example.com',
                password: 'password123'
            });

            try {
                await User.create({
                    username: 'user2',
                    email: 'test@example.com',
                    password: 'password123'
                });
                throw new Error('Should have failed');
            } catch (error) {
                expect(error.code).to.equal(11000);
            }
        });

        it('should require unique username', async function () {
            await User.create({
                username: 'testuser',
                email: 'test1@example.com',
                password: 'password123'
            });

            try {
                await User.create({
                    username: 'testuser',
                    email: 'test2@example.com',
                    password: 'password123'
                });
                throw new Error('Should have failed');
            } catch (error) {
                expect(error.code).to.equal(11000);
            }
        });

        it('should trim username and email', async function () {
            const user = await User.create({
                username: '  testuser  ',
                email: '  test@example.com  ',
                password: 'password123'
            });

            expect(user.username).to.equal('testuser');
            expect(user.email).to.equal('test@example.com');
        });

        it('should lowercase email', async function () {
            const user = await User.create({
                username: 'testuser',
                email: 'TEST@EXAMPLE.COM',
                password: 'password123'
            });

            expect(user.email).to.equal('test@example.com');
        });
    });

    describe('Conversation Model', function () {
        let user1, user2;

        beforeEach(async function () {
            user1 = await User.create({
                username: 'user1',
                email: 'user1@example.com',
                password: 'password123'
            });

            user2 = await User.create({
                username: 'user2',
                email: 'user2@example.com',
                password: 'password123'
            });
        });

        it('should create a conversation', async function () {
            const conversation = await Conversation.create({
                participants: [
                    user1._id,
                    user2._id
                ]
            });

            expect(conversation.participants).to.have.lengthOf(2);
            expect(conversation.isGroup).to.be.false;
            expect(conversation.groupName).to.be.null;
        });

        it('should create a group conversation', async function () {
            const user3 = await User.create({
                username: 'user3',
                email: 'user3@example.com',
                password: 'password123'
            });

            const conversation = await Conversation.create({
                participants: [
                    user1._id,
                    user2._id,
                    user3._id
                ],
                isGroup: true,
                groupName: 'Test Group'
            });

            expect(conversation.participants).to.have.lengthOf(3);
            expect(conversation.isGroup).to.be.true;
            expect(conversation.groupName).to.equal('Test Group');
        });

        it('should require participants', async function () {
            try {
                await Conversation.create({});
                throw new Error('Should have failed');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should store unread count as Map', async function () {
            const conversation = await Conversation.create({
                participants: [
                    user1._id,
                    user2._id
                ]
            });

            conversation.unreadCount.set(user1._id.toString(), 5);
            await conversation.save();

            const found = await Conversation.findById(conversation._id);
            expect(found.unreadCount.get(user1._id.toString())).to.equal(5);
        });
    });

    describe('Message Model', function () {
        let user1, user2, conversation;

        beforeEach(async function () {
            user1 = await User.create({
                username: 'user1',
                email: 'user1@example.com',
                password: 'password123'
            });

            user2 = await User.create({
                username: 'user2',
                email: 'user2@example.com',
                password: 'password123'
            });

            conversation = await Conversation.create({
                participants: [
                    user1._id,
                    user2._id
                ]
            });
        });

        it('should create a message', async function () {
            const message = await Message.create({
                conversation: conversation._id,
                sender: user1._id,
                content: 'Hello world'
            });

            expect(message.content).to.equal('Hello world');
            expect(message.messageType).to.equal('text');
            expect(message.readBy).to.be.an('array');
        });

        it('should require conversation', async function () {
            try {
                await Message.create({
                    sender: user1._id,
                    content: 'Hello'
                });
                throw new Error('Should have failed');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should require sender', async function () {
            try {
                await Message.create({
                    conversation: conversation._id,
                    content: 'Hello'
                });
                throw new Error('Should have failed');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should require content', async function () {
            try {
                await Message.create({
                    conversation: conversation._id,
                    sender: user1._id
                });
                throw new Error('Should have failed');
            } catch (error) {
                expect(error.name).to.equal('ValidationError');
            }
        });

        it('should trim content', async function () {
            const message = await Message.create({
                conversation: conversation._id,
                sender: user1._id,
                content: '  Hello world  '
            });

            expect(message.content).to.equal('Hello world');
        });

        it('should default messageType to text', async function () {
            const message = await Message.create({
                conversation: conversation._id,
                sender: user1._id,
                content: 'Hello'
            });

            expect(message.messageType).to.equal('text');
        });

        it('should accept different message types', async function () {
            const imageMessage = await Message.create({
                conversation: conversation._id,
                sender: user1._id,
                content: 'image.jpg',
                messageType: 'image'
            });

            expect(imageMessage.messageType).to.equal('image');
        });

        it('should track readBy users', async function () {
            const message = await Message.create({
                conversation: conversation._id,
                sender: user1._id,
                content: 'Hello',
                readBy: [user1._id]
            });

            expect(message.readBy).to.have.lengthOf(1);
            expect(message.readBy[0].toString()).to.equal(user1._id.toString());
        });
    });
});
