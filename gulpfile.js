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

gulp.task('clean:coverage', function() {
    return del(['coverage', 'coverage-remapped']);
});

gulp.task("clean:all", ['clean:dist', 'clean:logs', 'clean:coverage']);

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

gulp.task('pre-istanbul', ['clean:logs', 'clean:coverage', 'transpile'], function () {
    return gulp.src(['!dist/**/*.spec.js', 'dist/**/*.js'])
        .pipe(istanbul())
        .pipe(istanbul.hookRequire());
});

gulp.task('test-istanbul', ['pre-istanbul'], function () {
    return gulp.src(tests)
        .pipe(jasmine())
        .pipe(istanbul.writeReports())
        .pipe(istanbul.enforceThresholds({ thresholds: { global: 50 } }));
});

gulp.task('remap-istanbul', ['test-istanbul'], function () {
    return gulp.src('coverage/coverage-final.json')
        .pipe(remapIstanbul({
            reports: {
                'json': 'coverage-remapped/coverage.json',
                'html': 'coverage-remapped/lcov-report'
            }
        }));
});

gulp.task("build", ["transpile"], function() {
});

gulp.task("default", ["test"], function () {
});
