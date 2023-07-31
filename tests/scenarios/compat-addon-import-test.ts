import { expectFilesAt, ExpectFile } from '@real_ate/fake-embroider-test-support/file-assertions/qunit';
import { PreparedApp } from 'scenario-tester';
import { throwOnWarnings } from '@real_ate/fake-embroider-core';
import { appScenarios, baseAddon } from './scenarios';
import QUnit from 'qunit';
import { merge } from 'lodash';
const { module: Qmodule, test } = QUnit;

appScenarios
  .map('compat-addon-import', project => {
    let addon1 = baseAddon();
    addon1.pkg.name = 'my-addon1';

    merge(addon1.files, {
      'index.js': `
        module.exports = {
          name: require('./package.json').name,
          included(app) {
            this.import('node_modules/third-party1/index.js', {
              using: [{ transformation: 'amd' }],
              type: 'test'
            });
          }
        }
      `,
    });

    addon1.addDependency('third-party1', '1.2.3').files = {
      'index.js': 'module.exports = function() { console.log("hello world"); }',
    };

    project.addDependency(addon1);
  })
  .forEachScenario(scenario => {
    Qmodule(scenario.name, function (hooks) {
      throwOnWarnings(hooks);

      let app: PreparedApp;

      let expectFile: ExpectFile;

      hooks.before(async assert => {
        app = await scenario.prepare();
        let result = await app.execute('ember build', { env: { STAGE1_ONLY: 'true' } });
        assert.equal(result.exitCode, 0, result.output);
      });

      hooks.beforeEach(assert => {
        expectFile = expectFilesAt(app.dir, { qunit: assert });
      });

      test('synthesized-vendor has imported file in node modules', function () {
        expectFile(
          './node_modules/.embroider/rewritten-packages/@real_ate/fake-embroider-synthesized-vendor/node_modules/third-party1/index.js'
        ).matches(`(function(define){
module.exports = function() { console.log(\"hello world\"); }
})((function(){ function newDefine(){ var args = Array.prototype.slice.call(arguments); return define.apply(null, args); }; newDefine.amd = true; return newDefine; })());`);
      });
    });
  });
