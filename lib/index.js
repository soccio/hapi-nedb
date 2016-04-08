'use strict';

const Async = require('neo-async');
const Crypto = require('crypto');
const Joi = require('joi');
const NeDB = require('nedb');
const Path = require('path');

const internals = {};

internals.after = (algorithm, secretKey) => {

    return function (str) {

        const cipher = Crypto.createCipher(algorithm, secretKey);
        let encrypted = cipher.update(str, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    };

};

internals.before = (algorithm, secretKey) => {

    return function (str) {

        const decipher = Crypto.createDecipher(algorithm, secretKey);
        let decrypted = decipher.update(str, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    };

};

internals.onload = (collection, next) => {

    return function (err) {
        // $lab:coverage:off$
        if (err) {
            return next(new Error(`NeDB failed to load collection name ${collection} due to ${err}`));
        }
        // $lab:coverage:on$
    };
};

internals.alphaKeys = new RegExp('^[a-zA-Z]*$');

internals.dataStore = Joi.object().keys({

    directory: Joi.string(),
    timestampData: Joi.boolean().default(false),
    autoload: Joi.boolean().default(true),
    onload: Joi.func(),
    serializers: Joi.object().keys({
        algorithm: Joi.string().default('aes256'),
        secretKey: Joi.string().required(),
        afterSerialization: Joi.func().default(internals.after),
        beforeDeserialization: Joi.func().default(internals.before)
    }),
    corruptAlertThreshold: Joi.string().regex(/^([0-9]|10)$/)

}).required();

internals.schema = {

    collections: Joi.object().keys({

    }).pattern(internals.alphaKeys, internals.dataStore).min(1).required(),
    directory: Joi.string(),
    timestampData: Joi.boolean().default(false),
    autoload: Joi.boolean().default(true),
    onload: Joi.func(),
    serializers: Joi.object().keys({
        algorithm: Joi.string().default('aes256'),
        secretKey: Joi.string().required(),
        afterSerialization: Joi.func().default(internals.after),
        beforeDeserialization: Joi.func().default(internals.before)
    }),
    corruptAlertThreshold: Joi.string().regex(/^([0-9]|10)$/)

};

exports.register = (server, options, next) => {

    const dataStores = {};

    Joi.validate(options, internals.schema, (err, result) => {

        if (err) {
            return next(err);
        }

        const nedbOpts = internals.parseOptions(result);
        const collections = Object.keys(result.collections);

        const iterator = (collection, done) => {

            const dsOpts = nedbOpts[collection];

            if (!dsOpts.filename) {
                return done(new Error(`Filename missing for datastore ${collection}`), null);
            }

            if (!dsOpts.onload) {
                dsOpts.onload = internals.onload;
            }

            dsOpts.onload(collection, done);

            dataStores[collection] = new NeDB(dsOpts);
            return done();
        };

        Async.map(collections, iterator, (err) => {

            if (err) {
                return next(err, null);
            }

            server.app.nedb = dataStores;
            return next();
        });

    });

};

exports.register.attributes = {

    name: 'hapi-nedb'
};

internals.parseOptions = (options) => {

    const parsedOptions = {};
    const collections = Object.keys(options.collections);

    collections.map((collection) => {

        const name = collection;
        const result = options.collections[name];
        parsedOptions[name] = {};

        const dbPath = result.directory ? result.directory : options.directory;
        const autoload = result.autoload ? result.autoload : options.autoload;
        const onload = result.onload ? result.onload : options.onload;
        const serializers = result.serializers ? result.serializers : options.serializers;
        const timestampData = result.timestampData ? result.timestampData : options.timestampData;
        const corruptAlertThreshold = result.corruptAlertThreshold ? Number(result.corruptAlertThreshold) : Number(options.corruptAlertThreshold);

        if (dbPath) {
            if (!Path.isAbsolute(dbPath)) {
                parsedOptions[name].filename = Path.resolve(dbPath, `${name}.nedb`);
            }
            else {
                parsedOptions[name].filename = `${dbPath}${Path.sep}${name}.nedb`;
            }
        }

        parsedOptions[name].autoload = autoload;
        if (onload) {
            parsedOptions[name].onload = onload;
        }


        if (serializers) {

            const algorithm = serializers.algorithm;
            const secretKey = serializers.secretKey;
            const afterSerialization = serializers.afterSerialization;
            const beforeDeserialization = serializers.beforeDeserialization;
            parsedOptions[name].beforeDeserialization = beforeDeserialization(algorithm, secretKey);
            parsedOptions[name].afterSerialization = afterSerialization(algorithm, secretKey);
        }

        if (corruptAlertThreshold) {
            parsedOptions[name].corruptAlertThreshold = corruptAlertThreshold;
        }

        if (timestampData) {
            parsedOptions[name].timestampData = timestampData;
        }



    });

    return parsedOptions;


};
