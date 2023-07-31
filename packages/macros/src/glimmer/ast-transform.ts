import literal from './literal';
import getConfig from './get-config';
import dependencySatisfies from './dependency-satisfies';
import { maybeAttrs } from './macro-maybe-attrs';
import { macroIfBlock, macroIfExpression, macroIfMustache } from './macro-condition';
import { failBuild } from './fail-build';
import { RewrittenPackageCache } from '@real_ate/fake-embroider-shared-internals';

export interface BuildPluginParams {
  // Glimmer requires this on ast transforms.
  name: string;

  // this is the location of @real_ate/fake-embroider-macros itself. Glimmer requires this on
  // ast transforms.
  baseDir: string;

  methodName: string;

  firstTransformParams: FirstTransformParams;
}

export interface FirstTransformParams {
  // this is the location of the particular package (app or addon) that is
  // depending on @real_ate/fake-embroider-macros *if* we're in a classic build. Under
  // embroider the build is global and there's no single packageRoot.
  packageRoot: string | undefined;

  // this is the path to the topmost package
  appRoot: string;

  // this holds all the actual user configs that were sent into the macros
  configs: { [packageRoot: string]: object };
}

export function buildPlugin(params: BuildPluginParams) {
  return {
    name: params.name,
    plugin:
      params.methodName === 'makeFirstTransform'
        ? makeFirstTransform(params.firstTransformParams)
        : makeSecondTransform(),
    baseDir: () => params.baseDir,
  };
}

export function makeFirstTransform(opts: FirstTransformParams) {
  function embroiderFirstMacrosTransform(env: {
    syntax: { builders: any };
    meta: { moduleName: string };
    filename: string;
  }) {
    if (!opts.packageRoot && !env.filename) {
      throw new Error(`bug in @real_ate/fake-embroider-macros. Running without packageRoot but don't have filename.`);
    }

    let packageCache = RewrittenPackageCache.shared('embroider', opts.appRoot);

    let scopeStack: string[][] = [];

    // packageRoot is set when we run inside classic ember-cli. Otherwise we're in
    // Embroider, where we can use absolute filenames.
    const moduleName = opts.packageRoot ? env.meta.moduleName : env.filename;

    return {
      name: '@real_ate/fake-embroider-macros/first',

      visitor: {
        Program: {
          enter(node: any) {
            if (node.blockParams.length > 0) {
              scopeStack.push(node.blockParams);
            }
          },
          exit(node: any) {
            if (node.blockParams.length > 0) {
              scopeStack.pop();
            }
          },
        },
        SubExpression(node: any) {
          if (node.path.type !== 'PathExpression') {
            return;
          }
          if (inScope(scopeStack, node.path.parts[0])) {
            return;
          }
          if (node.path.original === 'macroGetOwnConfig') {
            return literal(
              getConfig(node, opts.configs, opts.packageRoot, moduleName, true, packageCache),
              env.syntax.builders
            );
          }
          if (node.path.original === 'macroGetConfig') {
            return literal(
              getConfig(node, opts.configs, opts.packageRoot, moduleName, false, packageCache),
              env.syntax.builders
            );
          }
          if (node.path.original === 'macroDependencySatisfies') {
            return literal(dependencySatisfies(node, opts.packageRoot, moduleName, packageCache), env.syntax.builders);
          }
        },
        MustacheStatement(node: any) {
          if (node.path.type !== 'PathExpression') {
            return;
          }
          if (inScope(scopeStack, node.path.parts[0])) {
            return;
          }
          if (node.path.original === 'macroGetOwnConfig') {
            return env.syntax.builders.mustache(
              literal(
                getConfig(node, opts.configs, opts.packageRoot, moduleName, true, packageCache),
                env.syntax.builders
              )
            );
          }
          if (node.path.original === 'macroGetConfig') {
            return env.syntax.builders.mustache(
              literal(
                getConfig(node, opts.configs, opts.packageRoot, moduleName, false, packageCache),
                env.syntax.builders
              )
            );
          }
          if (node.path.original === 'macroDependencySatisfies') {
            return env.syntax.builders.mustache(
              literal(dependencySatisfies(node, opts.packageRoot, moduleName, packageCache), env.syntax.builders)
            );
          }
        },
      },
    };
  }
  (embroiderFirstMacrosTransform as any).embroiderMacrosASTMarker = true;
  (embroiderFirstMacrosTransform as any).parallelBabel = {
    requireFile: __filename,
    buildUsing: 'makeFirstTransform',
    get params(): FirstTransformParams {
      return opts;
    },
  };
  return embroiderFirstMacrosTransform;
}

export function makeSecondTransform() {
  function embroiderSecondMacrosTransform(env: { syntax: { builders: any } }) {
    let scopeStack: string[][] = [];
    return {
      name: '@real_ate/fake-embroider-macros/second',

      visitor: {
        Program: {
          enter(node: any) {
            if (node.blockParams.length > 0) {
              scopeStack.push(node.blockParams);
            }
          },
          exit(node: any) {
            if (node.blockParams.length > 0) {
              scopeStack.pop();
            }
          },
        },
        BlockStatement(node: any) {
          if (node.path.type !== 'PathExpression') {
            return;
          }
          if (inScope(scopeStack, node.path.parts[0])) {
            return;
          }
          if (node.path.original === 'if') {
            return macroIfBlock(node);
          }
        },
        SubExpression(node: any) {
          if (node.path.type !== 'PathExpression') {
            return;
          }
          if (inScope(scopeStack, node.path.parts[0])) {
            return;
          }
          if (node.path.original === 'if') {
            return macroIfExpression(node, env.syntax.builders);
          }
          if (node.path.original === 'macroFailBuild') {
            failBuild(node);
          }
        },
        ElementNode(node: any) {
          node.modifiers = node.modifiers.filter((modifier: any) => {
            if (
              modifier.path.type === 'SubExpression' &&
              modifier.path.path.type === 'PathExpression' &&
              modifier.path.path.original === 'if'
            ) {
              modifier.path = macroIfExpression(modifier.path, env.syntax.builders);
              if (modifier.path.type === 'UndefinedLiteral') {
                return false;
              }
            }
            if (modifier.path.type !== 'PathExpression') {
              return true;
            }
            if (inScope(scopeStack, modifier.path.parts[0])) {
              return true;
            }
            if (modifier.path.original === 'macroMaybeAttrs') {
              maybeAttrs(node, modifier, env.syntax.builders);
            } else {
              return true;
            }
          });
        },
        MustacheStatement(node: any) {
          if (node.path.type !== 'PathExpression') {
            return;
          }
          if (inScope(scopeStack, node.path.parts[0])) {
            return;
          }
          if (node.path.original === 'if') {
            return macroIfMustache(node, env.syntax.builders);
          }
          if (node.path.original === 'macroFailBuild') {
            failBuild(node);
          }
        },
      },
    };
  }
  (embroiderSecondMacrosTransform as any).embroiderMacrosASTMarker = true;
  (embroiderSecondMacrosTransform as any).parallelBabel = {
    requireFile: __filename,
    buildUsing: 'makeSecondTransform',
    params: undefined,
  };
  return embroiderSecondMacrosTransform;
}

function inScope(scopeStack: string[][], name: string) {
  for (let scope of scopeStack) {
    if (scope.includes(name)) {
      return true;
    }
  }
  return false;
}
