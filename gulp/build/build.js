var gulp = require('gulp'),
    serve = require('../serve');

gulp.task('build', ['dependency-injection', 'fonts'], function() {
    return serve(true /*isDev*/);
});