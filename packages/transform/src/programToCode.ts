import {
  type Generator,
  State,
  GENERATOR as _GENERATOR,
  generate,
} from 'astring';
import type {
  Program,
  ArrowFunctionExpression as TArrowFunctionExpression,
  FunctionExpression as TFunctionExpression,
  MethodDefinition as TMethodDefinition,
  UnaryExpression as TUnaryExpression,
} from 'estree';

import {
  WD_MODULE_EXPRESSION,
  WD_MODULE_NAME,
  WD_RAW_EXPRESSION,
} from './constants';

function ParenthesizedExpression(node: ParenthesizedExpression, state: State) {
  state.write('(');
  this[node.expression.type](node.expression, state);
  state.write(')');
}

const _UnaryExpression = _GENERATOR.UnaryExpression;

function UnaryExpression(node: TUnaryExpression, state: State) {
  return _UnaryExpression.bind(this)(
    {
      ...node,
      prefix: true,
    },
    state
  );
}

const _MethodDefinition = _GENERATOR.MethodDefinition;

function MethodDefinition(node: TFunctionExpression, state: State) {
  if (node.value.params.type === 'FormalParameters') {
    return _MethodDefinition.bind(this)(
      {
        ...node,
        value: {
          ...node.value,
          params: node.value.params.items,
        },
      },
      state
    );
  }

  return _MethodDefinition.bind(this)(node, state);
}

const _FunctionDeclaration = _GENERATOR.FunctionDeclaration;

function FunctionDeclaration(node: TFunctionDeclaration, state: State) {
  if (node.params.type === 'FormalParameters') {
    return _FunctionDeclaration.bind(this)(
      {
        ...node,
        params: node.params.items,
        body: {
          ...node.body,
          isArrow: false,
        },
      },
      state
    );
  }

  return _FunctionDeclaration.bind(this)(node, state);
}

function FormalParameter(node: any, state: State) {
  const param = node.pattern;

  return this[param.type](param, state);
}

const _ArrowFunctionExpression = _GENERATOR.ArrowFunctionExpression;

function ArrowFunctionExpression(node: TArrowFunctionExpression, state: State) {
  if (node.params.type === 'FormalParameters') {
    return ArrowFunctionExpression.bind(this)(
      {
        ...node,
        params: node.params.items,
        body: {
          ...node.body,
          expression: node.expression,
        },
      },
      state
    );
  }

  return _ArrowFunctionExpression.bind(this)(node, state);
}

function FunctionBody(node, state: State) {
  if (node.expression && node.statements.length === 1) {
    const statement = node.statements[0];

    return this[statement.expression.type](statement.expression, state);
  }

  return GENERATOR.BlockStatement.bind(this)(
    { ...node, body: node.statements },
    state
  );
}

function NullLiteral(node, state) {
  return state.write(node.value);
}

function ComputedMemberExpression(node, state) {
  return GENERATOR.MemberExpression.bind(this)(
    {
      ...node,
      property: node.expression,
      computed: true,
    },
    state
  );
}

function StaticMemberExpression(node, state) {
  return GENERATOR.MemberExpression.bind(this)(node, state);
}

function BindingProperty(node, state) {
  return _GENERATOR.Property.bind(this)(
    { ...node, method: false, kind: 'init' },
    state
  );
}

function CatchParameter(node, state) {
  return this[node.pattern.type](node.pattern, state);
}

const GENERATOR = Object.assign(_GENERATOR, {
  NullLiteral,
  BooleanLiteral: _GENERATOR.Literal,
  NumericLiteral: _GENERATOR.Literal,
  StringLiteral: _GENERATOR.Literal,

  ArrowFunctionExpression,
  BindingProperty,
  ComputedMemberExpression,
  CatchParameter,
  FormalParameter,
  FunctionBody,
  FunctionDeclaration,
  MethodDefinition,
  ParenthesizedExpression,
  StaticMemberExpression,
  UnaryExpression,
});

const customGenetator: Generator & { string: any } = new Proxy<Generator>(
  GENERATOR,
  {
    get(target, prop, receiver) {
      if (target[prop]) {
        return target[prop];
      }

      if (prop === WD_MODULE_EXPRESSION) {
        return function (node, state) {
          const filename = node.filename;

          const statements = node.body;
          const length = node.body.length;

          state.write(
            `${WD_MODULE_NAME}("${filename}", function (module, exports, require, export_star) {\n`
          );

          for (let i = 0; i < length; i++) {
            const statement = statements[i];

            receiver[statement.type](statement, state);
            state.write('\n');
          }

          state.write('\n});');
        };
      }

      if (prop === WD_RAW_EXPRESSION) {
        return function (node, state) {
          return state.write(node.value);
        };
      }

      if (prop === 'ObjectProperty') {
        return GENERATOR.Property;
      }

      throw new Error(`Unknown property: ${String(prop)}`);
    },
  }
);

export function programToCode(program: Program): string {
  // console.dir(program, { depth: null });
  try {
    return generate(program, {
      generator: customGenetator,
    });
  } catch (error) {
    console.log('program', program);
    console.error('Error generating code', error);
    throw error;
  }
}
