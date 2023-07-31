import type { PipelineOptions } from '@real_ate/fake-embroider-compat';
import type { PackagerConstructor } from '@real_ate/fake-embroider-core';
import type { Webpack } from '@real_ate/fake-embroider-webpack';

type EmberWebpackOptions = typeof Webpack extends PackagerConstructor<infer Options> ? Options : never;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ourPeerDeps = require('../package.json').peerDependencies;

const embroiderDevDeps = {
  '@real_ate/fake-embroider-core': `${ourPeerDeps['@real_ate/fake-embroider-core']}`,
  '@real_ate/fake-embroider-webpack': `${ourPeerDeps['@real_ate/fake-embroider-webpack']}`,
  '@real_ate/fake-embroider-compat': `${ourPeerDeps['@real_ate/fake-embroider-compat']}`,
  // Webpack is a peer dependency of `@real_ate/fake-embroider-webpack`
  webpack: '^5.0.0',
};

/*
  Use this instead of `app.toTree()` in your ember-cli-build.js:

    return maybeEmbroider(app);

*/
export function maybeEmbroider(app: any, opts: PipelineOptions<EmberWebpackOptions> = {}) {
  if (!shouldUseEmbroider(app)) {
    return app.toTree(opts?.extraPublicTrees);
  }

  // we're using `require` here on purpose because
  //  - we don't want to load any of these things until they're actually needed;
  //  - we can't use `await import()` because this function needs to be synchronous to go inside ember-cli-build.js
  /* eslint-disable @typescript-eslint/no-require-imports */
  let { Webpack } = require(require.resolve('@real_ate/fake-embroider-webpack', {
    paths: [app.project.root],
  })) as typeof import('@real_ate/fake-embroider-webpack');
  let Compat = require(require.resolve('@real_ate/fake-embroider-compat', {
    paths: [app.project.root],
  })) as typeof import('@real_ate/fake-embroider-compat');
  let mergeWith = require('lodash/mergeWith') as typeof import('lodash/mergeWith');
  /* eslint-enable @typescript-eslint/no-require-imports */

  if (process.env.EMBROIDER_TEST_SETUP_OPTIONS) {
    let scenario = Compat.recommendedOptions[process.env.EMBROIDER_TEST_SETUP_OPTIONS];
    if (scenario) {
      opts = mergeWith({}, scenario, opts, appendArrays);
      console.log(`Successfully applied EMBROIDER_TEST_SETUP_OPTIONS=${process.env.EMBROIDER_TEST_SETUP_OPTIONS}`);
    } else {
      throw new Error(`No such scenario EMBROIDER_TEST_SETUP_OPTIONS=${process.env.EMBROIDER_TEST_SETUP_OPTIONS}`);
    }
  }

  return Compat.compatBuild(app, Webpack, opts);
}

export function embroiderSafe(extension?: object) {
  return extendScenario(
    {
      name: 'embroider-safe',
      npm: {
        devDependencies: embroiderDevDeps,
      },
      env: {
        EMBROIDER_TEST_SETUP_OPTIONS: 'safe',
      },
    },
    extension
  );
}

export function embroiderOptimized(extension?: object) {
  return extendScenario(
    {
      name: 'embroider-optimized',
      npm: {
        devDependencies: embroiderDevDeps,
      },
      env: {
        EMBROIDER_TEST_SETUP_OPTIONS: 'optimized',
      },
    },
    extension
  );
}

function extendScenario(scenario: object, extension?: object) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  let mergeWith = require('lodash/mergeWith') as typeof import('lodash/mergeWith');
  return mergeWith(scenario, extension, appendArrays);
}

function appendArrays(objValue: any, srcValue: any) {
  if (Array.isArray(objValue)) {
    return objValue.concat(srcValue);
  }
}

function shouldUseEmbroider(app: any): boolean {
  if (process.env.EMBROIDER_TEST_SETUP_FORCE === 'classic') {
    return false;
  }
  if (process.env.EMBROIDER_TEST_SETUP_FORCE === 'embroider') {
    return true;
  }
  return '@real_ate/fake-embroider-core' in app.dependencies();
}
