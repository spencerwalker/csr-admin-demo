var gulp = require('gulp'),
    config = require('../../gulp.config'),
    del = require('del'),
    flatten = require('gulp-flatten');

gulp.task('clean:compile-fonts', function() {
    return del(config.compile + 'fonts/');
});

gulp.task('compile-fonts', ['clean:compile-fonts'], function() {
    return gulp
        .src(config.fontFiles)
        .pipe(flatten())
        .pipe(gulp.dest(config.compile + 'fonts/'))
});
