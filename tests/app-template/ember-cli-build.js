'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const { maybeEmbroider } = require('@real_ate/fake-embroider-test-setup');

module.exports = function (defaults) {
  let app = new EmberApp(defaults, {});

  return maybeEmbroider(app, {
    skipBabel: [
      {
        package: 'qunit',
      },
    ],
  });
};
