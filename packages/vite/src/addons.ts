import { ResolverLoader, packageName } from '@real_ate/fake-embroider-core';

export function addons(root: string): string[] {
  let rloader = new ResolverLoader(root);
  let { options } = rloader.resolver;
  let names = new Set<string>();
  for (let from of Object.keys(options.renameModules)) {
    let pName = packageName(from);
    if (pName) {
      names.add(pName);
    }
  }
  for (let from of Object.keys(options.renamePackages)) {
    names.add(from);
  }
  for (let name of Object.keys(options.activeAddons)) {
    names.add(name);
  }
  return [...names];
}
