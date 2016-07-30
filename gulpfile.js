var gulp = require("gulp");
var jasmine = require('gulp-jasmine');
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");
var runSequence = require('run-sequence');

gulp.task("transpile", function () {
    return tsProject.src()
        .pipe(ts(tsProject))
        .pipe(gulp.dest("dist"));
});

gulp.task("test", ["transpile"], function() {
    return gulp.src('dist/spec/*.js')
        .pipe(jasmine());
});

gulp.task("default", ["test"], function () {
});

