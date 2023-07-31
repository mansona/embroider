import type { NodePath } from '@babel/traverse';
import { Evaluator } from './evaluate-json';
import type { types as t } from '@babel/core';
import error from './error';
import State from './state';

export type MacroConditionPath = NodePath<t.IfStatement | t.ConditionalExpression> & {
  get(test: 'test'): NodePath<t.CallExpression> & { get(callee: 'callee'): NodePath<t.Identifier> };
};

export function isMacroConditionPath(
  path: NodePath<t.IfStatement | t.ConditionalExpression>
): path is MacroConditionPath {
  let test = path.get('test');
  if (test.isCallExpression()) {
    let callee = test.get('callee');
    if (callee.referencesImport('@real_ate/fake-embroider-macros', 'macroCondition')) {
      return true;
    }
  }
  return false;
}

export default function macroCondition(conditionalPath: MacroConditionPath, state: State) {
  let args = conditionalPath.get('test').get('arguments');
  if (args.length !== 1) {
    throw error(conditionalPath, `macroCondition accepts exactly one argument, you passed ${args.length}`);
  }

  let [predicatePath] = args;
  let predicate = new Evaluator({ state }).evaluate(predicatePath);
  if (!predicate.confident) {
    throw error(args[0], `the first argument to macroCondition must be statically known`);
  }

  let consequent = conditionalPath.get('consequent');
  let alternate = conditionalPath.get('alternate');

  if (state.opts.mode === 'run-time' && predicate.hasRuntimeImplementation !== false) {
    let callee = conditionalPath.get('test').get('callee');
    callee.replaceWith(state.importUtil.import(callee, state.pathToOurAddon('runtime'), 'macroCondition'));
  } else {
    let [kept, removed] = predicate.value ? [consequent.node, alternate.node] : [alternate.node, consequent.node];
    if (kept) {
      conditionalPath.replaceWith(kept);
    } else {
      conditionalPath.remove();
    }
    if (removed) {
      state.removed.add(removed);
    }
  }
}
