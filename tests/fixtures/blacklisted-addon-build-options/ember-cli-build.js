'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  let app = new EmberApp(defaults, {
    // Add options here
    addons: {
      exclude: ['blacklisted-in-repo-addon'],
    },
  });

  const { Webpack } = require('@real_ate/fake-embroider-webpack');
  return require('@real_ate/fake-embroider-compat').compatBuild(app, Webpack, {
    skipBabel: [
      {
        package: 'qunit',
      },
    ],
  });
};
