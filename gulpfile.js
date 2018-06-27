// Util
const gulp = require('gulp');
const browsersync = require('browser-sync');
const yargs = require('yargs').argv;
const fs = require('fs');
const del = require('del');
const log = require('fancy-log');
const flatmap = require('gulp-flatmap');
const sourcemaps = require('gulp-sourcemaps');
const gulpIf = require('gulp-if');
const colors = require('colors');

// Sass
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const cssnano = require('gulp-cssnano');
const mediaQuery = require('gulp-group-css-media-queries');

// Rollup and Scripts
const rollup        = require('rollup');
const rollupEach    = require('gulp-rollup-each');
const rollupBabel   = require('rollup-plugin-babel');
const rollupResolve = require('rollup-plugin-node-resolve');
const rollupCommon  = require('rollup-plugin-commonjs');
const rollupESLint  = require('rollup-plugin-eslint');
const uglify        = require('gulp-uglify');
const imagemin      = require('gulp-imagemin');

//
// Config Settings
//
const config = {
  production: yargs.production ? yargs.production : false,
  dest: 'dist',
  js: {
    main: 'src/js/*.js',
    watch: 'src/js/**/*',
    dest: 'dist/js/'
  },
  sass: {
    main: 'src/scss/main/*',
    watch: 'src/scss/**/*',
    dest: 'dist/css/'
  },
  images: {
    src: 'src/img/**/*',
    dest: 'dist/img/'
  },
  fonts: {
    src: 'src/fonts/**/*',
    dest: 'dist/fonts/'
  },
  miscWatchFiles: ['**/*.php', '**/*.html', '**/*.twig'],
  autoprefixerBrowsers: ['last 2 versions', '> 2%', 'ie 10', 'iOS 8', 'iOS 9'],
  gulpConfig: '.gulp-config.json',
  useProxy: true,
  browsersyncOpts: {
    ghostMode: false
  }
}

//
// Rollup plugins
//
let rollupPlugins = [
  rollupBabel(),
  rollupResolve(),
  rollupESLint(),
  // rollupCommon(),
];





// -------------------
// Gulp Task Functions
// -------------------


//
// Reload Browsersync
//
const reload = (done) => {
  browsersync.reload();
  done();
};



//
// Check to see if a .gulp-config.json file exists, if
// not, creates one from .ex-gulp-config.json
//
const checkGulpConfig = (done) => {

  if ( !config.useProxy ) {
    return false;
  }

  fs.access(config.gulpConfig, fs.constants.F_OK, (err) => {

    if (err) {
      let source = fs.createReadStream('.ex-gulp-config.json');
      let dest = fs.createWriteStream(config.gulpConfig);
      source.pipe(dest);
      source.on('end', () => {
        log(`Edit the proxy value in ${config.gulpConfig} \n`.underline.red);
        process.exit(1);
      });
      source.on('error', (err) => {
        log(`Copy .ex-gulp-config.json to ${config.gulpConfig} and edit the proxy value \n`.underline.red);
        process.exit(1);
      });
    }
  });
  done();
};


//
// Check to see if a .gulp-config.json file exists, if
// not, creates one from .ex-gulp-config.json
//
const setProductionTrue = (done) => {
  config.production = true;
  done();
};





// ----------
// GULP TASKS
// ----------


//
// Clean
// -----
//
gulp.task('clean', () => {
  return del([`./${config.dest}/**/*`]);
});



//
// SASS task
// ---------
// Runs on every file in config.scss.main glob
//
gulp.task('sass', () => {
  return gulp.src(config.sass.main)
    .pipe(flatmap( (stream) => {
      return stream
        .pipe(gulpIf(!config.production, sourcemaps.init()))
          .pipe(sass().on('error', sass.logError))
          .pipe(autoprefixer({
            grid: true,
            browsers: config.autoprefixerBrowsers
          }))
          .pipe(gulpIf(config.production, mediaQuery()))
          .pipe(gulpIf(config.production, cssnano()))
        .pipe(gulpIf(!config.production, sourcemaps.write('.')))
        .pipe(gulp.dest(config.sass.dest))
        .pipe(browsersync.stream({ match: '**/*.css' }));
      }));
});



//
// JS task
// -------------
// Process each js file into a rollup bundle
//
gulp.task('js', () => {
  return gulp.src([config.js.main])
    .pipe(gulpIf( !config.production, sourcemaps.init() ))
      .pipe(rollupEach({
        // external: [],
        plugins: [
          rollupBabel(),
          rollupResolve(),
          rollupESLint()
        ],
      }, {
        format: 'iife',
        // globals: {}
      }))
    .pipe(gulpIf( !config.production, sourcemaps.write('.') ))
    .pipe(gulpIf( config.production, uglify() ))
    .pipe(gulp.dest(config.js.dest));
});



//
// Build Images
// ------------
// Process images with imagemin
//
gulp.task('images',  () => {
  return gulp.src( config.images.src )
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
    .pipe(gulp.dest(config.images.dest));
});



//
// Fonts Task
// ----------
// Copy fonts to dist folder
//
gulp.task('fonts', () => {
  return gulp.src( config.fonts.src ).pipe(gulp.dest(config.fonts.dest));
});



//
// Default task
// ------------
//
gulp.task('default', gulp.series('clean', gulp.parallel('sass', 'js', 'images', 'fonts')));


//
// Build task
// ----------
// Runs with config.production set to true
//
gulp.task('build', gulp.series(
  'clean',
  setProductionTrue,
  'default'
));



//
// Run Browsersync
//
gulp.task('serve:run', (cb) => {

  if ( config.useProxy ) {
    const g_config = JSON.parse(fs.readFileSync(config.gulpConfig));

    if (g_config.proxy == null) {
      log(`Edit the proxy value in ${config.gulpConfig} \n`.underline.red);
      process.exit(1);
    }

    config.browsersyncOpts['proxy'] = g_config.proxy;
  }

  browsersync.init(config.browsersyncOpts, cb);

});



//
// Watch Tasks
// -----------
//
gulp.task('watch', () => {
  gulp.watch(config.sass.watch, gulp.series('sass'));
  gulp.watch(config.js.watch, gulp.series('js', reload));
  gulp.watch(config.miscWatchFiles, reload);
});



//
// Serve task - Run Browser-sync
//
gulp.task('serve', gulp.series(
  checkGulpConfig,
  'default',
  'serve:run',
  'watch'
));
