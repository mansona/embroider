import { NodePath } from '@babel/traverse';
import evaluate from './evaluate-json';
import { IfStatement, ConditionalExpression, CallExpression } from '@babel/types';
import error from './error';
import { BoundVisitor } from './visitor';
import State from './state';

export type MacroConditionPath = NodePath<IfStatement | ConditionalExpression> & {
  get(test: 'test'): NodePath<CallExpression>;
};

export function isMacroConditionPath(path: NodePath<IfStatement | ConditionalExpression>): path is MacroConditionPath {
  let test = path.get('test');
  if (test.isCallExpression()) {
    let callee = test.get('callee');
    if (callee.referencesImport('@embroider/macros', 'macroCondition')) {
      return true;
    }
  }
  return false;
}

export default function macroCondition(conditionalPath: MacroConditionPath, state: State, visitor: BoundVisitor) {
  let args = conditionalPath.get('test').get('arguments');
  if (args.length !== 1) {
    throw error(conditionalPath, `macroCondition accepts exactly one argument, you passed ${args.length}`);
  }

  let [predicatePath] = args;
  let predicate = evaluate(predicatePath, visitor);
  if (!predicate.confident) {
    throw error(args[0], `the first argument to macroCondition must be statically known`);
  }

  let consequent = conditionalPath.get('consequent');
  let alternate = conditionalPath.get('alternate');

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
