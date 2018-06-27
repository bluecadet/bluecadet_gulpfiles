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
const mediaQuery = require('gulp-group-css-media-queries');

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
const colors = require('colors');

const gulpConfig = '.gulp-config.json';

//
// Config Settings
//
const config = {
  production: yargs.production ? yargs.production : false,
  dest: 'dist',
  js: 'src/js/*.js',
  sass: 'src/scss/main/*',
  images: 'src/img/**/*',
  fonts: 'src/fonts/**/*',
  miscWatchFiles: ['**/*.php', '**/*.html', '**/*.twig'],
  useProxy: true,
  browsersyncOpts: {
    ghostMode: false
  }
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
];


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
const build_sass = () => {
  return gulp.src(config.sass)
    .pipe(flatmap( (stream) => {
      return stream
        // .pipe(gulpIf(!config.production, plumber()))
        .pipe(gulpIf(!config.production, sourcemaps.init()))
          .pipe(sass().on('error', sass.logError))
          .pipe(postcss(postcssPlugins))
          .pipe(gulpIf(config.production, mediaQuery()))
        .pipe(gulpIf(!config.production, sourcemaps.write('.')))
        .pipe(gulp.dest(`${config.dest}/css/`))
        .pipe(browsersync.stream({ match: '**/*.css' }));
      }));
}

gulp.task('sass', gulp.series(build_sass));





//
// JS Task
// -------
// Process each file into a ruollup bundle
//
const build_js = () => {
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
};

gulp.task('js', gulp.series(build_js));


//
// JS - Reload Browsersync on save
function reload(done) {
  browsersync.reload();
  done();
}

gulp.task('serve:js', gulp.series(build_js, reload));




//
// Image Task
// ----------
// Process images with imagemin
//
const build_images = () => {
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
}

gulp.task('images', gulp.series(build_images));


//
// Fonts Task
// ----------
// Copy fonts to dist folder
//
const copy_fonts = (files, dest) => {
  return gulp.src( config.fonts ).pipe(gulp.dest(`${config.dest}/fonts/`));
}

gulp.task('fonts', gulp.series(copy_fonts));





// ---------------
// Gulp bulk tasks
// ---------------


//
// Default task
//
gulp.task('default', gulp.series(
  'clean',
  gulp.parallel(build_sass, build_js, build_images, copy_fonts)
));



//
// Check to see if a .gulp-config.json file exists, if
// not, creates one from .ex-gulp-config.json
//
const check_gulp_config = (done) => {

  if ( !config.useProxy ) {
    return false;
  }

  fs.access(gulpConfig, fs.constants.F_OK, (err) => {

    if (err) {
      let source = fs.createReadStream('.ex-gulp-config.json');
      let dest = fs.createWriteStream(gulpConfig);
      source.pipe(dest);
      source.on('end', () => {
        log(`Edit the proxy value in ${gulpConfig} \n`.underline.red);
        process.exit(1);
      });
      source.on('error', (err) => {
        log(`Copy .ex-gulp-config.json to ${gulpConfig} and edit the proxy value \n`.underline.red);
        process.exit(1);
      });
    }
  });
  done();
}


//
// Run Browsersync
//
const run_serve = () => {

  if ( config.useProxy ) {
    const g_config = JSON.parse(fs.readFileSync(gulpConfig));

    if (g_config.proxy == null) {
      log(`Edit the proxy value in ${gulpConfig} \n`.underline.red);
      process.exit(1);
    }

    config.browsersyncOpts['proxy'] = g_config.proxy;
  }

  browsersync.init(config.browsersyncOpts);

  gulp.watch(config.scss).on('all', gulp.parallel(build_sass));
  gulp.watch(config.js).on('all', gulp.series(build_js, reload));
  gulp.watch(config.miscWatchFiles).on('all', gulp.series(reload));

};

//
// Serve task - Run Browser-sync
//
gulp.task('serve', gulp.series(
  check_gulp_config,
  run_serve
));
