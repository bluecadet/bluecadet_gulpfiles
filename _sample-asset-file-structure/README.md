# Asset file structure

```
[Theme/Plugin/Module Directory - `web`, `docroot`, etc.]
|-- assets
  |-- src
    |-- img
      // any .jpg/.png/.svg in this folder will be optimized
      |-- *whatever.jpg*
      |-- *whatever.png*
      |-- *whatever.svg*
    |-- js
      // any js file at this level will be compiled into it's own bundle file
      |-- app.js
      |-- *modules* [if you want to write some module js for importing]
        |-- *whatever.js*
    |-- scss
      // any scss file at this level will be compiled into it's own file
      |-- app.scss
      |-- *partials* [folder can be whatever, just make sure your scss imports correctly]
        |-- *whatever.scss*
```