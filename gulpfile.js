var gulp = require('gulp'), 
    sass = require('gulp-ruby-sass') ,
    notify = require("gulp-notify") ,
    bower = require('gulp-bower');

var paths = {
     sassPath: 'static/css',
     bowerDir: 'bower_components' 
}

gulp.task('bower', function() { 
    return bower().pipe(gulp.dest(paths.bowerDir)) 
});

gulp.task('css', function() { 
    return sass(paths.sassPath + '/styles2.scss', {
             style: 'compressed',
             loadPath: [
                 './static/css',
                 paths.bowerDir + '/bootstrap-sass/assets/stylesheets',
                 paths.bowerDir + '/bootstrap-material-design/sass',
             ]
         }) 
            
         .pipe(gulp.dest('./static/css')); 
});

// Rerun the task when a file changes
 gulp.task('watch', function() {
     gulp.watch(paths.sassPath + '/**/*.scss', ['css']); 
});

  gulp.task('default', ['bower', 'css', 'watch']);