/*
 * A minimal gulpfile for Typescript node projects.
 * Includes:
 * transpile - For translation of Typescript files
 * test - For running the tests.
 * build - As an alias for the transpile command.
 * default - As an alias for the test command.
 */
var gulp = require("gulp");
var jasmine = require('gulp-jasmine');
var ts = require("gulp-typescript");
var runSequence = require('run-sequence');
var del = require('del');

var tsProject = ts.createProject("tsconfig.json");

gulp.task("clean:all", function() {
    return del(['dist/**/*']);
});

gulp.task("transpile", function() {
    return gulp.src(['src/*.ts', 'spec/*.spec.ts'])
        .pipe(ts(tsProject))
        .pipe(gulp.dest("dist"));
});

gulp.task("test", ["transpile"], function() {
    return gulp.src('dist/spec/*.spec.js')
        .pipe(jasmine());
});

gulp.task("build", ["transpile"], function() {
});

gulp.task("default", ["test"], function () {
});
