var gulp = require('gulp'),
    config = require('../../gulp.config'),
    del = require('del'),
    templateCache = require('gulp-angular-templatecache');

gulp.task('clean-templateCache', function() {
    return del(config.temp)
});

gulp.task('templates', ['clean-templateCache'], function() {
    return gulp.src([config.src + 'app/**/*.html', '!' + config.src + config.index])
        .pipe(templateCache(config.templateCacheSettings))
        .pipe(gulp.dest(config.temp));
});