import { helper } from '@ember/component/helper';
import { getConfig } from '@real_ate/fake-embroider-macros';

export function reflectAddonConfig(/*params, hash*/) {
  return getConfig('macro-sample-addon');
}

export default helper(reflectAddonConfig);
