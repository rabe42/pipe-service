var gulp = require("gulp");
var jasmine = require('gulp-jasmine');
var ts = require("gulp-typescript");
var tsProject = ts.createProject("tsconfig.json");

gulp.task("transpile", function () {
    return tsProject.src()
        .pipe(ts(tsProject))
        .js.pipe(gulp.dest("dist"));
});

gulp.task("test", function() {
    return gulp.src('spec/*.js')
        .pipe(jasmine());
});

gulp.task("default", ["transpile"], function () {
    runSequence("transpile", "test");
});

