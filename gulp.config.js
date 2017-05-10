var source = './src/',
    build = './build/',
    bowerFiles = './bower_components/',
    compile = './compile/',
    temp = './.temp/',
    index = 'index.html',
    root = __dirname,
    fs = require('fs');

module.exports = {
    src: source,
    compile: compile,
    build: build,
    index: index,
    root: root,
    temp: temp,

    appFiles: [
        build + '**/app.js',
        build + '**/app.config.js',
        build + '**/*.js'
    ],
    styleFiles: [
        source + 'aveda-ambient/ambient.less',
        source + 'app/**/*.less'
    ],
    fontFiles: [
        bowerFiles + '**/fonts/**/*'
    ],

    ngConstantSettings: {
        name: 'orderCloud',
        deps: false,
        constants: getConstants()
    },
    templateCacheSettings: {
        standalone: false,
        moduleSystem: 'IIFE',
        module: 'orderCloud'
    },
    jsCache: 'jsscripts',
    wrapper: {
        header: '(function ( window, angular, undefined ) {\n',
        footer: '\n})( window, window.angular );\n'
    }
};

function getConstants() {
    var result = {};
    var constants = JSON.parse(fs.readFileSync(source + 'app/app.config.json'));
    var environment = process.env.environment || constants.environment;
    result.environment = environment;
    switch (environment) {
        case 'local':
            result.authurl = 'https://auth.ordercloud.io';
            result.apiurl = 'https://api.ordercloud.io';
            result.devapiurl = 'http://localhost:4452/api';
            // result.integrationurl = 'http://core.four51.com:9004';
            result.firebaseurl = 'https://aveda-test.firebaseio.com';
            result.clientid = '00EE4D96-8539-405C-884A-638A12004E26';
            result.buyerclientid = '3F798589-5901-4C89-855B-9A4B35CC5C21';
            break;
        // case 'test':
        //     result.authurl = 'https://auth.ordercloud.io';
        //     result.apiurl = 'https://api.ordercloud.io';
        //     result.devapiurl = 'http://admin-test.avedacare.com/api';
        //     // result.integrationurl = 'https://integrations.ordercloud.io';
        //     // result.jitterbitauth = 'Basic YXZlZGF0ZXN0OmZhaWxzMzQ1';
        //     // result.firebaseurl = 'https://aveda-test.firebaseio.com';
        //     result.clientid = '4B57C324-BAB7-4391-BF87-A066691F4E6F';
        //     // result.bulkapproveurl = 'https://Four51TRIAL104401.jitterbit.net/Four51Test/v1/bulkapproveorders';
        //     result.buyerclientid = '3F798589-5901-4C89-855B-9A4B35CC5C21';
        //     break;
        // case 'qa':
        //     result.authurl = 'https://qaauth.ordercloud.io';
        //     result.apiurl = 'https://qaapi.ordercloud.io';
        //     result.devapiurl = 'http://admin-qa.avedacare.com/api';
        //     result.clientid = '00EE4D96-8539-405C-884A-638A12004E26';
        //     // result.integrationurl = 'https://integrations.ordercloud.io';
        //     // result.jitterbitauth = 'Basic YXZlZGF0ZXN0OmZhaWxzMzQ1';
        //     // result.firebaseurl = 'https://aveda-test.firebaseio.com';
        //     // result.bulkapproveurl = 'https://Four51TRIAL104401.jitterbit.net/Four51Test/v1/bulkapproveorders';
        //     result.buyerclientid = '3F798589-5901-4C89-855B-9A4B35CC5C21';
        //     break;
        // case 'staging':
        //     result.authurl = 'https://stagingauth.ordercloud.io';
        //     result.apiurl = 'https://stagingapi.ordercloud.io';
        //     // result.devapiurl = 'http://localhost:4452/api';
        //     result.devapiurl = 'https://bbc-staging-aveda-admin.herokuapp.com/api';
        //     // result.integrationurl = 'https://stagingintegrations.ordercloud.io';
        //     // result.jitterbitauth = 'Basic YXZlZGF0ZXN0OmZhaWxzMzQ1';
        //     // result.firebaseurl = 'https://aveda-test.firebaseio.com';
        //     result.clientid = '00EE4D96-8539-405C-884A-638A12004E26';
        //     result.bulkapproveurl = 'https://Four51TRIAL104401.jitterbit.net/Four51Test/v1/bulkapproveorders';
        //     result.buyerclientid = '3F798589-5901-4C89-855B-9A4B35CC5C21';
        //     break;
        default:
            result.authurl = 'https://auth.ordercloud.io';
            result.apiurl = 'https://api.ordercloud.io';
            result.devapiurl = 'https://enterprise-cosmetics-admin.herokuapp.com/api';
            // result.integrationurl = 'https://integrations.ordercloud.io';
            // result.jitterbitauth = 'Basic QXZlZGFBcHByb3ZlOjR2M2RhQXBwcjB2MyE=';
            result.firebaseurl = 'https://aveda.firebaseio.com';
            result.clientid = '00EE4D96-8539-405C-884A-638A12004E26';
            // result.bulkapproveurl = 'https://Four51TRIAL104401.jitterbit.net/Four51Prod/v1/bulkapproveorders';
            result.buyerclientid = '3F798589-5901-4C89-855B-9A4B35CC5C21';
            break;
    }
    if (process.env.apiurl && process.env.authurl) {
        result.authurl = process.env.authurl;
        result.apiurl = process.env.apiurl;
    }
    else if (!environment && !process.env.apiurl && !process.env.authurl) {
        result.authurl = 'https://auth.ordercloud.io/oauth/token';
        result.apiurl = 'https://api.ordercloud.io';
    }
    if (process.env.clientid) result.clientid = process.env.clientid;
    if (process.env.appname) result.appname = process.env.appname;
    if (process.env.ocscope) result.ocscope = process.env.ocscope;
    if (process.env.buyerid) result.buyerid = process.env.buyerid;
    return result;
}
