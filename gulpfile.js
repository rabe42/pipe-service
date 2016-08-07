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
var ts = require("gulp-typescript");
var sourcemaps = require("gulp-sourcemaps");
var runSequence = require('run-sequence');
var del = require('del');
var path = require('path');

var tsProject = ts.createProject("tsconfig.json");

gulp.task("clean:all", function() {
    return del(['dist/**/*']);
});

gulp.task("transpile", function() {
    var tsResult = gulp.src(['src/**/*.ts'])
        .pipe(sourcemaps.init())
        .pipe(ts(tsProject));

    return tsResult.js
        .pipe(sourcemaps.write('.', {
            sourceRoot: function(file) {
                let sourceFile = path.join(file.cwd, file.sourceMap.file);
                let result = path.relative(sourceFile, file.cwd) + "/src";
                return result;
            } 
        }))
        .pipe(gulp.dest("dist"));
});

gulp.task("test", ["transpile"], function() {
    return gulp.src('dist/**/*.spec.js')
        .pipe(jasmine());
});

gulp.task("build", ["transpile"], function() {
});

gulp.task("default", ["test"], function () {
});
