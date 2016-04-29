'use strict';

const Code = require('code');
const Hapi = require('hapi');
const Lab = require('lab');
const Path = require('path');
// const MkDir = require('mkdirp');
const RmDir = require('rimraf');
const NedbPlugin = require('../lib/index');

// Fixtures
const NeDbPath = Path.resolve(__dirname, 'fixtures/db');


// Set-up lab
const lab = exports.lab = Lab.script();
const describe = lab.describe;
const it = lab.it;
const expect = Code.expect;
const beforeEach = lab.beforeEach;
const afterEach = lab.afterEach;


describe('initialise', () => {

    let server;
    let plugin;


    beforeEach((done) => {

        server = new Hapi.Server();
        server.connection({
            host: '127.0.0.1',
            port: 3000
        });
        plugin = {
            register: NedbPlugin,
            options: {}

        };

        done();
    });

    afterEach((done) => {

        server = null;
        plugin = null;
        RmDir(NeDbPath, { maxBusyTries: 5 },  (err) => {

            // expect(err).to.not.exist();
            console.log(err);
            done();
        });

    });


    it('should return an error due to no options passed to plugin', (done) => {

        const noOpts = {};
        plugin.options = noOpts;
        server.register(plugin, (err) => {

            expect(err).to.exist();
            done();
        });
    });

    it('should return an error due to no directory being used', (done) => {

        const opts = {
            collections: {
                test: {

                }
            }
        };
        plugin.options = opts;
        server.register(plugin, (err) => {

            expect(err).to.exist();
            done();
        });
    });



    it('should load plugin with valid options', (done) => {

        const validOpts = {
            collections: {
                session: {
                    autoload: false
                }
            },
            serializers: {
                secretKey: 'secret'
            },
            autoload: true,
            directory: NeDbPath

        };

        plugin.options = validOpts;

        server.register(plugin, (err) => {

            expect(err).to.not.exist();
            server.start((err) => {

                expect(err).to.not.exist();
                server.stop(done);
            });

        });
    });

    it('should load plugin with extended options', (done) => {

        const validOpts = {
            collections: {
                user: {
                    onload: function (collection, next) {

                        return function (err) {

                            if (err) {
                                return next(err);
                            }
                        };
                    }
                }
            },
            directory: NeDbPath,
            autoload: false
        };

        plugin.options = validOpts;

        server.register(plugin, (err) => {

            expect(err).to.not.exist();

            server.start((err) => {

                expect(err).to.not.exist();
                server.stop(done);
            });
        });
    });

    it('should load plugin with mix of collection and global options', (done) => {

        const validOpts = {
            collections: {
                product: {
                    serializers: {
                        secretKey: 'anotherSecret'
                    },
                    timestampData: true
                }
            },
            onload: function (collection, next) {

                return function (err) {

                    if (err) {
                        return next(err);
                    }
                };
            },
            directory: 'test/fixtures/db'
        };

        plugin.options = validOpts;

        server.register(plugin, (err) => {

            expect(err).to.not.exist();
            server.start((err) => {

                expect(err).to.not.exist();
                server.stop(done);
            });
        });
    });

    it('should load plugin with more options globally', (done) => {

        const validOpts = {
            collections: {
                licence: {

                }
            },
            directory: NeDbPath,
            timestampData: true,
            corruptAlertThreshold: 0
        };

        plugin.options = validOpts;

        server.register(plugin, (err) => {

            expect(err).to.not.exist();
            server.start((err) => {

                expect(err).to.not.exist();
                server.stop(done);
            });
        });
    });

    it('should load plugin with more options on collection', (done) => {

        const validOpts = {
            collections: {
                state: {

                },
                country: {
                    directory: NeDbPath,
                    corruptAlertThreshold: 5
                }
            },
            directory: NeDbPath

        };

        plugin.options = validOpts;

        server.register(plugin, (err) => {

            expect(err).to.not.exist();
            server.start((err) => {

                expect(err).to.not.exist();
                server.stop(done);
            });
        });
    });

});
