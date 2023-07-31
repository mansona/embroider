import { throwOnWarnings } from '@real_ate/fake-embroider-core';
import { PreparedApp } from 'scenario-tester';
import { appScenarios } from './scenarios';
import QUnit from 'qunit';
const { module: Qmodule, test } = QUnit;

appScenarios
  .map('compat-app-embroider-concat-stats', () => {})
  .forEachScenario(function (scenario) {
    Qmodule(scenario.name, function (hooks) {
      throwOnWarnings(hooks);

      let app: PreparedApp;

      test('building with EMBROIDER_CONCAT_STATS works', async function (assert) {
        app = await scenario.prepare();
        let result = await app.execute('ember build', {
          env: { STAGE2_ONLY: 'true', EMBROIDER_CONCAT_STATS: 'true' },
        });
        assert.equal(result.exitCode, 0, result.output);
      });
    });
  });
