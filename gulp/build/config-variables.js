var gulp = require('gulp'),
    config = require('../../gulp.config'),
    del = require('del'),
    ngConstant = require('gulp-ng-constant');

gulp.task('clean-constants', function() {
    return del(config.build + 'app/app.config.js');
});

gulp.task('config-variables', ['clean-constants'], function() {
    return gulp.src(config.src + '**/*.json')
        .pipe(ngConstant(config.ngConstantSettings))
        .pipe(gulp.dest(config.build));
});