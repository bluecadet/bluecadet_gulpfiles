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
var path = require('path');
var fractal = require('./fractal.js');
var logger = fractal.cli.console;


// Sass
const sass = require('gulp-sass');
const sassGlob = require('gulp-sass-glob');
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


// Definition Vars
const dest_dir_name = 'assets/dist';
const src_dir_name  = 'assets/src';
let   production    = yargs.production ? yargs.production : false;


// Drupal Definitions
const base_theme       = 'bluecadet_base';
const base_theme_path  = `web/themes/custom/`;
const base_module_path = 'web/modules/custom/';

//
// Config Settings
//
const config = {
  drupal: {
    themes: [           // Theme Directory Names
      base_theme
    ],
    modules: [          // Module Directory Names
      'test'
    ]
  },
  paths: {
    js: {
      main:    src_dir_name + '/js/*.js',
      watch:   src_dir_name + '/js/**/*',
      dest:   dest_dir_name + '/js/'
    },
    sass: {
      main:    src_dir_name + '/scss/*.scss',
      watch:   src_dir_name + '/scss/**/*',
      lib:     src_dir_name + '/components/**/*',
      dest:   dest_dir_name + '/css/',
    },
    images: {
      main:    src_dir_name + '/images/**/*',
      dest:   dest_dir_name + '/images/'
    },
    watch_files: [
      '**/*.php',
      '**/*.html',
      '**/*.twig'
    ],
  },
  fractal: {
    use: true,
    components: base_theme_path + base_theme + '/assets/src/components',
  },
  autoprefixerBrowsers: ['last 2 versions', '> 2%', 'ie 10', 'iOS 8', 'iOS 9'],
  gulpConfig: '.gulp-config.json',
  useProxy: true,
  browsersyncOpts: {
    ghostMode: false
  }
}



// -------------------
// Gulp Task Functions
// -------------------


//
// Reload Browsersync
//
const reload = (done) => {
  browsersync.reload();
  // fractalServer.reload();
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
  production = true;
  done();
};



//
// Compile Sass
// Tasks for each sass file
//
const compileSass = (stream, css_dest_path) => {
  return stream
    .pipe(sassGlob())
    .pipe(gulpIf(!production, sourcemaps.init()))
      .pipe(sass({
        includePaths: ['node_modules']
      }).on('error', sass.logError))
      .pipe(autoprefixer({
        grid: true,
        browsers: config.autoprefixerBrowsers
      }))
      .pipe(gulpIf(production, mediaQuery()))
      .pipe(gulpIf(production, cssnano()))
    .pipe(gulpIf(!production, sourcemaps.write('.')))
    .pipe(gulp.dest(css_dest_path))
    .pipe(browsersync.stream({ match: '**/*.css' }));
}


//
// Compile JS with Rollup
//
const compileJS = (src_path, dest_path) => {
  return gulp.src([ src_path ])
    .pipe(gulpIf( !production, sourcemaps.init() ))
      .pipe(rollupEach({
        // external: [],
        plugins: [
          rollupBabel(),
          rollupResolve(),
          rollupESLint()
        ],
      }, {
        format: 'es',
        // globals: {}
      }))
    .pipe(gulpIf( !production, sourcemaps.write('.') ))
    .pipe(gulpIf( production, uglify() ))
    .pipe(gulp.dest( dest_path ));
}


//
// Compile Images
//
const compileImages = (src_path, dest_path) => {
  return gulp.src( src_path )
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
    .pipe(gulp.dest(dest_path));
}


let watch_manifest      = {},
    sass_task_manifest  = [],
    js_task_manifest    = [],
    image_task_manifest = [];


//
// Task Builder
// ------------
// Create tasks based on inputs
//
// @param task_name {string} Name of task to be used to suffix task types
// @param base_path {string} Directory path for the task to do its thang
//

function task_builder(task_name, base_path) {
  // Build task based watch files
  let misc_watchers = [];

  config.paths.watch_files.forEach((watch_path) => {
    misc_watchers.push(base_path + watch_path);
  });

  watch_manifest[task_name] = {
    sass: base_path + config.paths.sass.watch,
    js: base_path + config.paths.sass.watch,
    images: base_path + config.paths.images.watch,
    misc: misc_watchers
  };

  // Setup task names
  const sass_task = 'sass:' + task_name;
  const js_task = 'js:' + task_name;
  const image_task = 'images:' + task_name;

  // Push task names into task manifest arrays
  sass_task_manifest.push(sass_task);
  js_task_manifest.push(js_task);
  image_task_manifest.push(image_task);

  //
  // SASS TASK
  // ---------
  // Can be run via `sass:TASK_NAME`
  //
  gulp.task(sass_task, () => {
    return gulp.src( base_path + config.paths.sass.main )
      .pipe(flatmap( (stream) => {
        return compileSass(stream, base_path + config.paths.sass.dest)
      }));
  });


  //
  // JS TASK
  // -------
  // Can be run via `js:TASK_NAME`
  //
  gulp.task(js_task, () => {
    return compileJS(
      base_path + config.paths.js.main,
      base_path + config.paths.js.dest
    );
  });


  //
  // MODULE IMAGES TASK
  // ------------------
  // Can be run via `images:TASK_NAME`
  //
  gulp.task(image_task, () => {
    return compileImages(
      base_path + config.paths.images.main,
      base_path + config.paths.images.dest
    );
  });
}



// --------------------
// MODULE & THEME TASKS
// --------------------

//
// Create Module tasks for each module
//
config.drupal.modules.forEach((mod_dir) => {
  task_builder('module--' + mod_dir, base_module_path + mod_dir + '/');
});

//
// Create Theme tasks for each theme
// Tasks namespaced as 'GULP_TASK_NAME:theme--THEME_DIR`
// ex: js:theme--bluecadet_base
//
config.drupal.themes.forEach((theme_dir) => {
  task_builder('theme--' + theme_dir, base_theme_path + theme_dir + '/');
});



// --------------
// Fractal Server
// --------------
let fractalDrupalFiles = [];

Object.keys(watch_manifest).forEach(function(task) {
  const manifest = watch_manifest[task];
  fractalDrupalFiles.push(manifest.sass);
  fractalDrupalFiles.push(manifest.js);
  fractalDrupalFiles.push(manifest.images);
  manifest.misc.forEach(function(filePath) {
    fractalDrupalFiles.push(filePath);
  });
});

fractal.web.set('server.syncOptions', {
  open: true,
  notify: true,
  // files: fractalDrupalFiles
});

log(fractal.web.get('server.syncOptions'));

const fractalServer = fractal.web.server({
  sync: true
});



//
// Default task
// ------------
//
gulp.task('default', gulp.series(
  gulp.parallel(
    sass_task_manifest,
    js_task_manifest,
    image_task_manifest
  )
));



//
// Build task
// ----------
// Runs with production set to true
//
gulp.task('build', gulp.series(
  setProductionTrue,
  'default'
));



//
// Watch Tasks
// -----------
//
gulp.task('watch', () => {

  // Include files from watch manifest
  Object.keys(watch_manifest).forEach(function(task) {
    const manifest = watch_manifest[task];
    gulp.watch( manifest.sass, gulp.series('sass:' + task) );
    gulp.watch( manifest.js, gulp.series('js:' + task, reload));
    gulp.watch( manifest.images, gulp.series('images:' + task) );
    gulp.watch( manifest.misc, reload);
  });

  // Fractal
  if (config.fractal.use) {
    var fractalSass = config.fractal.components + '/**/*.scss';
    var fractalTwig = config.fractal.components + '/**/*.twig';
    gulp.watch( fractalSass, gulp.series('sass:theme--' + base_theme) );
    gulp.watch( fractalTwig, reload );
  }

});



//
// Run Drupal Browsersync Server
//
gulp.task('startsync:drupal', (cb) => {

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
// Run Fractal Browsersync Server
//
gulp.task('startsync:fractal', function(done){

  if (!config.fractal.use) {
    return done();
  }

  fractalServer.on('error', err => logger.error(err.message));

  return fractalServer.start().then(() => {
    logger.success(`Fractal server is now running at ${fractalServer.url}`);
    done();
  });

});



//
// Serve task - Run Browser-sync
//
gulp.task('serve', gulp.series(
  checkGulpConfig,
  'default',
  'startsync:drupal',
  'startsync:fractal',
  'watch',
));


//
// Serve task - Run Browser-sync
//
gulp.task('serve:fractal', gulp.series(
  checkGulpConfig,
  'default',
  'startsync:fractal',
  'watch',
));



//
// Serve task - Run Browser-sync
//
gulp.task('serve:drupal', gulp.series(
  checkGulpConfig,
  'default',
  'startsync:drupal',
  'watch',
));

