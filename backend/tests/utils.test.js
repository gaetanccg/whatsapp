import { expect } from 'chai';
import { isFfmpegAvailable } from '../utils/mediaProcessing.js';
import { captureError, addBreadcrumb, setUserContext, startTransaction, captureMessage } from '../utils/sentry.js';

describe('Utils Tests', function () {
    describe('Media Processing Utils', function () {
        it('should check ffmpeg availability', function () {
            const result = isFfmpegAvailable();
            expect(result).to.be.a('boolean');
        });
    });

    describe('Sentry Utils', function () {
        beforeEach(function () {
            process.env.SENTRY_DSN = '';
        });

        describe('captureError', function () {
            it('should not throw when Sentry is disabled', function () {
                const error = new Error('Test error');
                expect(() => captureError(error)).to.not.throw();
            });

            it('should accept error with context', function () {
                const error = new Error('Test error');
                const context = {
                    tags: { test: 'tag' },
                    extra: { info: 'data' }
                };
                expect(() => captureError(error, context)).to.not.throw();
            });
        });

        describe('addBreadcrumb', function () {
            it('should not throw when adding breadcrumb', function () {
                expect(() => addBreadcrumb('Test message')).to.not.throw();
            });

            it('should accept breadcrumb with category and data', function () {
                expect(() => addBreadcrumb('Test', 'auth', { userId: '123' })).to.not.throw();
            });
        });

        describe('setUserContext', function () {
            it('should not throw when setting user context', function () {
                const user = {
                    _id: '123',
                    username: 'testuser',
                    email: 'test@example.com'
                };
                expect(() => setUserContext(user)).to.not.throw();
            });

            it('should handle null user', function () {
                expect(() => setUserContext(null)).to.not.throw();
            });

            it('should handle undefined user', function () {
                expect(() => setUserContext(undefined)).to.not.throw();
            });
        });

        describe('startTransaction', function () {
            it('should return transaction object', function () {
                const transaction = startTransaction('test');
                expect(transaction).to.be.an('object');
                expect(transaction).to.have.property('finish');
                expect(transaction).to.have.property('setStatus');
            });

            it('should accept name and operation', function () {
                const transaction = startTransaction('test', 'http.request');
                expect(transaction).to.be.an('object');
            });

            it('should not throw when finishing transaction', function () {
                const transaction = startTransaction('test');
                expect(() => transaction.finish()).to.not.throw();
            });

            it('should not throw when setting status', function () {
                const transaction = startTransaction('test');
                expect(() => transaction.setStatus('ok')).to.not.throw();
            });
        });

        describe('captureMessage', function () {
            it('should not throw when capturing message', function () {
                expect(() => captureMessage('Test message')).to.not.throw();
            });

            it('should accept message with level and context', function () {
                const context = {
                    tags: { test: 'tag' },
                    extra: { info: 'data' }
                };
                expect(() => captureMessage('Test', 'warning', context)).to.not.throw();
            });

            it('should handle different log levels', function () {
                expect(() => captureMessage('Info', 'info')).to.not.throw();
                expect(() => captureMessage('Warning', 'warning')).to.not.throw();
                expect(() => captureMessage('Error', 'error')).to.not.throw();
            });
        });
    });
});
