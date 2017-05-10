var gulp = require('gulp'),
    config = require('../../gulp.config'),
    cache = require('gulp-cached'),
    del = require('del'),
    ngAnnotate = require('gulp-ng-annotate'),
    wrapper = require('gulp-wrapper');

gulp.task('clean-scripts', function() {
    return del([].concat(config.build + '**/*.js', '!' + config.build + '**/app.config.js'));
});

gulp.task('scripts', ['clean-scripts'], function() {
    return gulp.src(config.src + '**/*.js')
        .pipe(cache(config.jsCache))
        .pipe(ngAnnotate())
        .pipe(wrapper(config.wrapper))
        .pipe(gulp.dest(config.build))
});

gulp.task('rebuild-scripts', function() {
    return gulp.src(config.src + '**/*.js')
        .pipe(cache(config.jsCache))
        .pipe(ngAnnotate())
        .pipe(wrapper(config.wrapper))
        .pipe(gulp.dest(config.build))
});
