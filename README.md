# hapi-nedb [![Build Status](https://travis-ci.org/circabs/hapi-nedb.svg?branch=master)](https://travis-ci.org/circabs/hapi-nedb)


A hapi plugin for nedb



# Install

 ```bash
 $ npm install hapi hapi-nedb --save
 ```

# Usage

Valid options for plugin are below, they can set as same options for each nedb collection created or can be unique to each collection.  Each collection is created by adding a key for collection name you want to create, the example below will create two collections for names session and user.

`options`:

 * `collections` object with keys being name of collection to create and value any global overrides of main options
 * `directory` string required to define base directory where all nedb filenames are stored
 * `timestampData` boolean for decorating stored documents with a timestamp
 * `autoload` boolean default true, if false each datastore created must be loaded manually
 * `onload` function with 2 parameters (collectionName, callback), function must return a function with an error parameter which must be called back if it occurs
 * `serializers` an object with the following keys
    * `algorithm` valid algorithm to encrypt and decrypt data with nodejs core crypto library, defaults to 'aes256'
    * `secretKey` string, secret used to encrypt and decrypt data
 * `corruptAlertThreshold` number between 0-10 for nedb option


 ```js

'use strict';

const Hapi = require('hapi');
const Plugin = {
    register: require('hapi-nedb'),
    options: {
        collections: {
            session: {},
            user: {}
        },
        serializers: {
            secretKey: 'secret'
        },
        directory: '/path/to/store/nedb/files',
        corruptAlertThreshold: '0',
        timestampData: true
    }
};

const server = new Hapi.Server();

server.connection({
   host: '127.0.0.1',
   port: 3000
});

server.route([{

    method: 'POST',
    path: '/',
    handler: function (request, reply) {

        request.server.app.nedb.session.insert(request.payload, (err, doc) => {

            if (err) {
                return reply(err);
            }
            return reply(doc);
        });
    }
},
{

    method: 'GET',
    path: '/',
    handler: function (request, reply) {

        request.server.app.nedb.session.find({}, (err, doc) => {

            if (err) {
                return reply(err);
            }
            return reply(doc);
        });

    }
}]);


server.register(Plugin, (err) => {

    if (err) {
        throw err;
    }

    server.start((err) => {

        if (err) {
            return console.error(err);
        }
        console.log(`Server running on host ${server.info.host} and port number ${server.info.port}`);
    });
});
```
