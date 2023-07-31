import Controller from '@ember/controller';
import { getOwnConfig, isTesting, isDevelopingApp, macroCondition, dependencySatisfies } from '@real_ate/fake-embroider-macros';

export default class Application extends Controller {
  constructor() {
    super(...arguments);
    this.mode = getOwnConfig()['mode'];
    this.isTesting = isTesting();
    this.isDeveloping = isDevelopingApp();

    if (macroCondition(dependencySatisfies('version-changer', '^4'))) {
      this.versionChangerVersion = 'four';
    } else {
      this.versionChangerVersion = 'three';
    }
  }
}
