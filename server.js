'use strict';
var config = require('./gulp.config'),
    fs = require('fs');

var express = require('express'),
    enforce = require('express-sslify'),
    favicon = require('serve-favicon'),
    env = process.env.NODE_ENV = process.env.NODE_ENV || 'dev',
    ssl_enabled = process.env.EXPEDITEDSSL_ID != null,
    app = express(),
    port = process.env.PORT || 4452,
    bodyParser = require('body-parser');

app.use(favicon(__dirname + '/aveda-favicon.ico'));

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, authorization, Administrator, dc-token, Identity, environment");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, PATCH, DELETE, OPTIONS");
    //res.header("Access-Control-Allow-Headers", "*");
    next();
});

if (ssl_enabled) {
    app.use(enforce.HTTPS({trustProtoHeader: true}));
}

app.use(bodyParser.json({limit: '50mb'}));

app.use('/api/*', require('./middleware/middleware'));
app.use('/api/azure', require('./routes/azure'));

switch(env) {
    case 'production':
        var revManifest = JSON.parse(fs.readFileSync(config.compile + 'rev-manifest.json'));
        console.log('*** PROD ***');
        app.use(express.static(config.root + config.compile.replace('.', '')));
        app.get('/*', function(req, res) {
            res.sendFile(config.root + config.compile.replace('.', '') + revManifest["index.html"]);
        });
        break;
    default:
        console.log('*** DEV ***');
        app.use(express.static(config.root + config.build.replace('.', '')));
        app.use(express.static(config.root + config.src.replace('.', '') + 'app/'));
        app.use(express.static(config.root));
        app.get('/*', function(req, res) {
            res.sendFile(config.root + config.build.replace('.', '') + 'index.html');
        });
        break;
}

app.listen(port);
console.log('Listening on port ' + port + '...');
