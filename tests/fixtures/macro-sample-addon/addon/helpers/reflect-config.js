import { helper } from '@ember/component/helper';
import { getOwnConfig } from '@real_ate/fake-embroider-macros';

export function reflectConfig(/*params, hash*/) {
  return getOwnConfig();
}

export default helper(reflectConfig);
