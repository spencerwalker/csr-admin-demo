var gulp = require('gulp'),
    serve = require('../serve');

gulp.task('compile', ['use-ref'], function() {
    serve(false /*isDev*/);
});