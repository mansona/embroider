import { supportMatrix } from './scenarios';
import { PreparedApp, Scenarios } from 'scenario-tester';
import QUnit from 'qunit';
import { dirname } from 'path';

const { module: Qmodule, test } = QUnit;

supportMatrix(Scenarios.fromDir(dirname(require.resolve('@real_ate/fake-embroider-util/package.json'))))
  .map('util', () => {})
  .forEachScenario(scenario => {
    Qmodule(scenario.name, function (hooks) {
      let app: PreparedApp;
      hooks.before(async () => {
        app = await scenario.prepare();
      });

      test(`pnpm test:ember`, async function (assert) {
        let result = await app.execute('pnpm test:ember');
        assert.equal(result.exitCode, 0, result.output);
      });

      test(`pnpm test:classic`, async function (assert) {
        let result = await app.execute('pnpm test:classic');
        assert.equal(result.exitCode, 0, result.output);
      });
    });
  });
