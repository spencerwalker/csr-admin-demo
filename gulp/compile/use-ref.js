var gulp = require('gulp'),
    config = require('../../gulp.config'),
    CleanCSS = require('gulp-clean-css'),
    del = require('del'),
    filter = require('gulp-filter'),
    uglify = require('gulp-uglify'),
    inject = require('gulp-inject'),
    rev = require('gulp-rev'),
    revReplace = require('gulp-rev-replace'),
    useref = require('gulp-useref');

gulp.task('clean-compile', function() {
    return del(config.compile);
});

gulp.task('use-ref', ['dependency-injection', 'compile-fonts', 'clean-compile', 'templates'], function() {
    var jsFilter = filter('**/*.js', {restore: true}),
        cssFilter = filter('**/*.css', {restore: true}),
        templateFile = gulp.src(config.temp + '**/*.js', {read: false});

    return gulp.src(config.build + config.index)
        .pipe(inject(templateFile, {name: 'templates'}))
        .pipe(useref({searchPath: config.root}))
        .pipe(jsFilter)
        .pipe(uglify({mangle: false}))
        .pipe(jsFilter.restore)
        .pipe(cssFilter)
        .pipe(CleanCSS({keepSpecialComments: false, processImportFrom: ['!fonts.googleapis.com']}))
        .pipe(cssFilter.restore)
        .pipe(rev())
        .pipe(revReplace())
        .pipe(gulp.dest(config.compile))
        .pipe(rev.manifest())
        .pipe(gulp.dest(config.compile));
});