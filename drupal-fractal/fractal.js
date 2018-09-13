'use strict';

const themeDir = 'bluecadet_base';
const baseThemePath = `web/themes/custom/${themeDir}/`;
const distPath = `${baseThemePath}/assets/dist/`;
const libPath = `${baseThemePath}/assets/src/`;

/*
* Require the path module
*/
const path = require('path');
const twigAdapter = require('@wondrousllc/fractal-twig-drupal-adapter');

/*
 * Require the Fractal module
 */
const fractal = module.exports = require('@frctl/fractal').create();
const twig = twigAdapter({
  handlePrefix: '@components/',
});

/*
 * Give your project a title.
 */
fractal.set('project.title', 'Bluecadet Style Guide');

/*
 * Tell Fractal where to look for components.
 */
 fractal.components.engine(twigAdapter);

fractal.components.set('path', path.join(__dirname, `${libPath}`, 'components'));

// Use Twig instead of handlebars
fractal.components.set('ext', '.twig');

/*
 * Tell Fractal where to look for documentation pages.
 */
fractal.docs.set('path', path.join(__dirname, `${libPath}`, 'docs'));

/*
 * Tell the Fractal web preview plugin where to look for static assets.
 */
fractal.web.set('static.path', path.join(__dirname, `${distPath}`));