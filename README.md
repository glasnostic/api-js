Glasnostic Javascript API
=========================

Javascript wrapper for the Glasnostic Rest API. 
Provides methods to create, update and delete Glasnostic views and to retrieve metrics.

Usage
-----

See `/example` folder for use cases to retrieve metrics and create and update views.

Build
-----

Run `npm install` first, and then `npm run build`.

This generates the Javascript bundle containing all the code in one single file (`glasnostic-api.js`) 
and places it in the `dist` folder.

Run Examples
------------

```
node example/create-view.js
node example/update-view.js
node example/get-metrics.js
```
