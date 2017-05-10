var gulp = require('gulp'),
    config = require('../../gulp.config'),
    flatten = require('gulp-flatten'),
    del = require('del');

gulp.task('clean-fonts', function() {
    return del(config.build + 'assets/fonts/**/*');
});

gulp.task('fonts', ['clean-fonts'], function() {
    return gulp.src(config.fontFiles)
        .pipe(flatten())
        .pipe(gulp.dest(config.build + 'assets/fonts/'));
});
