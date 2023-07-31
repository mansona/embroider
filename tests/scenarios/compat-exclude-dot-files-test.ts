import { ExpectFile, expectRewrittenFilesAt } from '@real_ate/fake-embroider-test-support/file-assertions/qunit';
import { throwOnWarnings } from '@real_ate/fake-embroider-core';
import { PreparedApp } from 'scenario-tester';
import { appScenarios, baseAddon } from './scenarios';
import QUnit from 'qunit';
import { merge } from 'lodash';
const { module: Qmodule, test } = QUnit;

appScenarios
  .map('compat-exclude-dot-files', app => {
    merge(app.files, {
      app: {
        '.foobar.js': `// foobar content`,
        '.barbaz.js': `// barbaz content`,
        'bizbiz.js': `// bizbiz content`,
      },
    });

    let addon = baseAddon();
    addon.pkg.name = 'my-addon';
    merge(addon.files, {
      addon: {
        '.fooaddon.js': `// fooaddon content`,
        'baraddon.js': `// bizbiz content`,
      },
    });
    app.addDevDependency(addon);
  })
  .forEachScenario(function (scenario) {
    Qmodule(scenario.name, function (hooks) {
      throwOnWarnings(hooks);

      let app: PreparedApp;

      let expectFile: ExpectFile;

      hooks.before(async assert => {
        app = await scenario.prepare();
        let result = await app.execute('ember build', { env: { STAGE2_ONLY: 'true' } });
        assert.equal(result.exitCode, 0, result.output);
      });

      hooks.beforeEach(assert => {
        expectFile = expectRewrittenFilesAt(app.dir, { qunit: assert });
      });

      test('dot files are not included as app modules', function () {
        // dot files should exist on disk
        expectFile('./.foobar.js').exists();
        expectFile('./.barbaz.js').exists();
        expectFile('./bizbiz.js').exists();

        // dot files should not be included as modules
        expectFile('./assets/app-template.js').doesNotMatch('app-template/.foobar');
        expectFile('./assets/app-template.js').doesNotMatch('app-template/.barbaz');
        expectFile('./assets/app-template.js').matches('app-template/bizbiz');
      });

      test('dot files are not included as addon implicit-modules', function () {
        // Dot files should exist on disk
        expectFile('./node_modules/my-addon/.fooaddon.js').exists();
        expectFile('./node_modules/my-addon/baraddon.js').exists();

        let myAddonPackage = expectFile('./node_modules/my-addon/package.json').json();

        // dot files are not included as implicit-modules
        myAddonPackage.get(['ember-addon', 'implicit-modules']).deepEquals(['./baraddon']);
      });
    });
  });
