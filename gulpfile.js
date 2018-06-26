// import { uglify } from 'rollup-plugin-uglify';

const gulp = require('gulp');
const browsersync = require('browser-sync');
const yargs = require('yargs').argv;
const path = require('path');
const fs = require('fs');
const del = require('del');
const log = require('fancy-log');

const plumber = require('gulp-plumber');
// const rename = require('gulp-rename');
const flatmap = require('gulp-flatmap');
const sourcemaps = require('gulp-sourcemaps');
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');

const rollup = require('rollup');
const rollupEach = require('gulp-rollup-each');
const rollupBabel = require('rollup-plugin-babel');
const rollupResolve = require('rollup-plugin-node-resolve');
const rollupCommon = require('rollup-plugin-commonjs');
const rollupESLint = require('rollup-plugin-eslint');
const rollupUglify = require('rollup-plugin-uglify');
const imagemin = require('gulp-imagemin');

// const runSequence = require('run-sequence');
const gulpIf = require('gulp-if');

//
// Config Settings
//
const config = {
  production: yargs.production ? yargs.production : false,
  dest: 'dist',
  js: 'src/js/*.js',
  sass: 'src/scss/main/*',
  images: 'src/img/**/*',
  fonts: 'src/fonts/**/*'
}

let rollupPlugins = [
  rollupBabel(),
  rollupResolve(),
  // rollupCommon(),
  rollupESLint()
];

let postcssPlugins = [
  autoprefixer({
    grid: true,
    browsers: ['last 2 versions', '> 2%', 'ie 10', 'iOS 8', 'iOS 9']
  })
]


//
// Push plugins if production build
//
if (config.production) {
  rollupPlugins.push(rollupUglify);
  postcssPlugins.push(cssnano());
}





//
// CLEAN
//
gulp.task('clean', () => {
  return del([`./${config.dest}/**/*`]);
});


//
// SCSS task
// ---------
// Runs on every file in config.scss glob
//
gulp.task('sass', () => {
  return gulp.src(config.sass)
    .pipe(flatmap( (stream) => {
      return stream
        .pipe(gulpIf(!config.production, plumber()))
        .pipe(gulpIf(!config.production, sourcemaps.init()))
          .pipe(sass().on('error', sass.logError))
          .pipe(postcss(postcssPlugins))
        .pipe(gulpIf(!config.production, sourcemaps.write('.')))
        .pipe(gulp.dest(`${config.dest}/css/`))
        .pipe(browsersync.stream({ match: '**/*.css' }));
      }));
});





//
// JS Task
// -------
// Process each file into a ruollup bundle
//
gulp.task('js', () => {
  return gulp.src([config.js])
    .pipe(gulpIf( !config.production, sourcemaps.init() ))
      .pipe(rollupEach({
        // external: [],
        plugins: rollupPlugins,
      }, {
        format: 'es',
        // globals: {}
      }))
    .pipe(gulpIf( !config.production, sourcemaps.write('.') ))
    .pipe(gulp.dest(`${config.dest}/js/`));
});





//
// Image Task
// ----------
// Process images with imagemin
//
gulp.task('images', function () {
  return gulp.src( config.images )
    .pipe(imagemin([
      imagemin.gifsicle({interlaced: true}),
      imagemin.jpegtran({progressive: true}),
      imagemin.optipng({optimizationLevel: 5}),
      imagemin.svgo({
        plugins: [
          {removeViewBox: true},
          {cleanupIDs: false},
          {cleanupNumericValues: {floatPrecision: 2}}
        ]
      })
    ]))
    .pipe(gulp.dest(`${config.dest}/img/`));
});





//
// Fonts Task
// ----------
// Copy fonts to dist folder
//
gulp.task('fonts', function () {
  return gulp.src( config.fonts ).pipe(gulp.dest(`${config.dest}/fonts/`));
});




// Serve task - Run Browser-sync
gulp.task('serve', () => {
  const gulpConfigFile = '.gulp-config.json';

  fs.exists(gulpConfigFile, (exists) => {
    if (!exists) {
      let source = fs.createReadStream('.ex-gulp-config.json');
      let dest = fs.createWriteStream(gulpConfigFile);
      source.pipe(dest);
      source.on('end', () => {
        console.log('Edit the proxy value in ${gulpConfigFile} \n'.underline.red);
        process.exit(1);
      });
      source.on('error', (err) => {
        console.log('Copy .ex-gulp-config.json to ${gulpConfigFile} and edit the proxy value \n'.underline.red);
        process.exit(1);
      });
    }
  });

  const config = JSON.parse(fs.readFileSync(gulpConfigFile));

  if (config.proxy == null) {
    console.log('Edit the proxy value in .gulp-config.json \n'.underline.red);
    process.exit(1);
  }

  browsersync.init({
    proxy: config.proxy,
    ghostMode: false,
  });

  // gulp.watch('./css/scss/*.scss', ['css']);
  // gulp.watch('./css/scss/**/*.scss', ['css']);
  // gulp.watch('./js/**/*.js', ['js:serve']);
  // gulp.watch(['**/*.php', '**/*.html', '**/*.twig'], ['watch_reload']);

});