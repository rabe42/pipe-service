/*
 * A minimal gulpfile for Typescript node projects.
 * Includes:
 * transpile - For translation of Typescript files
 * test - For running the tests.
 */
var gulp = require("gulp");
var jasmine = require('gulp-jasmine');
var ts = require("gulp-typescript");
var runSequence = require('run-sequence');

var tsProject = ts.createProject("tsconfig.json");

gulp.task("transpile", function () {
    return gulp.src(['src/*.ts', 'spec/*.spec.ts'])
        .pipe(ts(tsProject))
        .pipe(gulp.dest("dist"));
});

gulp.task("test", ["transpile"], function() {
    return gulp.src('dist/spec/*.js')
        .pipe(jasmine());
});

gulp.task("build", ["transpile"], function() {
});

gulp.task("default", ["test"], function () {
});
