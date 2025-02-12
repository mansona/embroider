import { Package } from '@real_ate/fake-embroider-core';
import Plugin from 'broccoli-plugin';
import { writeJSONSync } from 'fs-extra';
import { join } from 'path';

export default class extends Plugin {
  private built = false;

  constructor(private originalPackage: Package) {
    super([], {
      annotation: 'empty-package-tree',
      persistentOutput: true,
      needsCache: false,
    });
  }
  build() {
    if (!this.built) {
      writeJSONSync(join(this.outputPath, 'package.json'), {
        name: this.originalPackage.name,
        version: this.originalPackage.version,
        '//': 'This empty package was created by embroider. See https://github.com/embroider-build/embroider/blob/main/docs/empty-package-output.md',
      });
    }
  }
}
