import { readJSONSync } from 'fs-extra';
import { Resolver, Options } from './module-resolver';
import { locateEmbroiderWorkingDir } from '@real_ate/fake-embroider-shared-internals';
import { join } from 'path';
import { watch as fsWatch, FSWatcher } from 'fs';

export class ResolverLoader {
  #resolver: Resolver | undefined;
  #configFile: string;
  #watcher: FSWatcher | undefined;

  constructor(readonly appRoot: string, watch = false) {
    this.#configFile = join(locateEmbroiderWorkingDir(this.appRoot), 'resolver.json');
    if (watch) {
      this.#watcher = fsWatch(this.#configFile, { persistent: false }, () => {
        this.#resolver = undefined;
      });
    }
  }

  close() {
    this.#watcher?.close();
  }

  get resolver(): Resolver {
    if (!this.#resolver) {
      let config: Options = readJSONSync(join(locateEmbroiderWorkingDir(this.appRoot), 'resolver.json'));
      this.#resolver = new Resolver(config);
    }
    return this.#resolver;
  }
}
