import { describe, expect } from 'vitest';

import { parseProgram } from './parseProgram';

describe('parseProgram', () => {
  it('should parse json to program', async () => {
    const sourceName = 'fixture.ts';
    const sourceCode = `export const foo = "foo";`;

    expect(await parseProgram(sourceName, sourceCode)).toMatchInlineSnapshot(`
      {
        "body": [
          {
            "declaration": {
              "declarations": [
                {
                  "definite": false,
                  "end": 24,
                  "id": {
                    "end": 16,
                    "name": "foo",
                    "optional": false,
                    "start": 13,
                    "type": "Identifier",
                    "typeAnnotation": null,
                  },
                  "init": {
                    "end": 24,
                    "start": 19,
                    "type": "StringLiteral",
                    "value": "foo",
                  },
                  "start": 13,
                  "type": "VariableDeclarator",
                },
              ],
              "declare": false,
              "end": 25,
              "kind": "const",
              "start": 7,
              "type": "VariableDeclaration",
            },
            "end": 25,
            "exportKind": "value",
            "source": null,
            "specifiers": [],
            "start": 0,
            "type": "ExportNamedDeclaration",
            "withClause": null,
          },
        ],
        "directives": [],
        "end": 25,
        "hashbang": null,
        "sourceType": {
          "alwaysStrict": false,
          "language": "typescript",
          "moduleKind": "module",
          "variant": "standard",
        },
        "start": 0,
        "type": "Program",
      }
    `);
  });
});
