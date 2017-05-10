var gulp = require('gulp'),
    autoprefixer = require('gulp-autoprefixer'),
    mainBowerFiles = require('main-bower-files'),
    browserSync = require('browser-sync').get('aveda'),
    config = require('../../gulp.config'),
    del = require('del'),
    filter = require('gulp-filter'),
    concat = require('gulp-concat-css'),
    less = require('gulp-less'),

    importLess = require('gulp-less-import');

gulp.task('clean-styles', function() {
    return del(config.build + '**/*.css');
});

gulp.task('styles', ['clean-styles'], function() {
    var lessFilter = filter('**/*.less', {restore: true}),
        cssFilter = filter('**/*.css');

    return gulp.src([].concat(
            mainBowerFiles({filter: '**/*.less'}),
            './bower_components/ordercloud-ui-angularjs/**/*.less',
            config.styleFiles
        ))
        .pipe(lessFilter)
        .pipe(importLess('aveda-less.less'))
        .pipe(less())
        .pipe(lessFilter.restore)
        .pipe(cssFilter)
        .pipe(autoprefixer({
            browsers: ['last 2 versions']
        }))
        .pipe(concat('OrderCloud.css'))
        .pipe(gulp.dest(config.build + 'assets/styles/'))
        .pipe(browserSync.stream());
});