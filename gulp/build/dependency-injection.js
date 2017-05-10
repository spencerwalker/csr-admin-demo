var gulp = require('gulp'),
    config = require('../../gulp.config'),
    del = require('del'),
    fileSort = require('gulp-angular-filesort'),
    inject = require('gulp-inject'),
    mainBowerFiles = require('main-bower-files');

gulp.task('clean-index-file', function() {
    return del(config.build + config.index);
});

gulp.task('dependency-injection', ['clean-index-file', 'scripts', 'styles', 'config-variables'], function() {
    var target = gulp.src(config.src + config.index),
        bowerFiles = gulp.src([].concat(
            mainBowerFiles({filter: ['**/*.js', '!**/*.min.js', '**/*.css']}),
            './bower_components/ordercloud-ui-angularjs/dist/ordercloud-ui-angularjs.js'
        ), {read: false}),
        jsFiles = gulp.src(config.appFiles).pipe(fileSort()),
        cssFiles = gulp.src(config.build + '**/*.css');

    return target
        .pipe(inject(bowerFiles, {name: 'bower'}))
        .pipe(inject(jsFiles))
        .pipe(inject(cssFiles))
        .pipe(gulp.dest(config.build));
});