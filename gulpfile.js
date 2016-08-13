"use strict";

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
var coverage = require('gulp-coverage');
var ts = require("gulp-typescript");
var sourcemaps = require("gulp-sourcemaps");
var runSequence = require('run-sequence');
var istanbul = require('gulp-istanbul');
var remapIstanbul = require('remap-istanbul/lib/gulpRemapIstanbul');
var del = require('del');
var path = require('path');

var tsProject = ts.createProject("tsconfig.json");

var srcs = ['src/**/*.ts'];
var tests = ['dist/**/*.spec.js'];

gulp.task("clean:dist", function() {
    return del(['dist/**/*']);
});

gulp.task("clean:logs", function() {
    return del(['**.log.json']);
});

gulp.task("clean:all", ['clean:dist', 'clean:logs']);

gulp.task("transpile", function() {
    var tsResult = gulp.src(srcs)
        .pipe(sourcemaps.init())
        .pipe(ts(tsProject));

    return tsResult.js
        .pipe(sourcemaps.write('.', {
            sourceRoot: function(file) {
                return file.cwd + '/src';
            } 
        }))
        .pipe(gulp.dest("dist"));
});

gulp.task("test", ["clean:logs", "transpile"], function() {
    return gulp.src(tests)
        .pipe(jasmine());
});

gulp.task('pre-test', ['clean:logs', 'transpile'], function () {
    // TODO: Hier gibt es noch einiges zu tun!
    return gulp.src(['dist/**/*.js'])
        // Covering files
        .pipe(istanbul())
        // Force `require` to return covered files
        .pipe(istanbul.hookRequire());
});

gulp.task('test-coverage', ['pre-test'], function () {
    return gulp.src(tests)
        .pipe(jasmine())
        // Creating the reports after tests ran
        .pipe(istanbul.writeReports())
        // Enforce a coverage of at least 90%
        .pipe(istanbul.enforceThresholds({ thresholds: { global: 90 } }));
});

gulp.task('remap-istanbul', function () {
    return gulp.src('coverage-final.json')
        .pipe(remapIstanbul())
        .pipe(gulp.dest('coverage-remapped.json'));
});

gulp.task("build", ["transpile"], function() {
});

gulp.task("default", ["test"], function () {
});
