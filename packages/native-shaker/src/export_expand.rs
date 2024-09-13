use oxc_allocator::{Allocator, CloneIn, Vec as ArenaVec};
use oxc_ast::ast::{
  BindingIdentifier, BindingPatternKind, Declaration, ExportDefaultDeclarationKind,
  ExportNamedDeclaration, ExportSpecifier, ImportDeclarationSpecifier, ImportOrExportKind,
  ImportSpecifier, ModuleExportName, Program, PropertyKey, Statement, StringLiteral,
  TSTypeAnnotation, VariableDeclarationKind, VariableDeclarator,
};
use oxc_ast::AstBuilder;
use oxc_span::Atom;
use oxc_span::SPAN;
use oxc_traverse::{walk_program, Traverse, TraverseCtx};
use std::ops::Deref;

fn create_export_specifiers<'a>(
  allocator: &'a Allocator,
  ast_builder: AstBuilder<'a>,
  id: &Option<BindingIdentifier<'a>>,
) -> ArenaVec<'a, ExportSpecifier<'a>> {
  let mut specifiers: ArenaVec<ExportSpecifier<'a>> = ArenaVec::with_capacity_in(1, allocator);

  match id {
    // TODO: use .span() properly
    Some(id) => {
      let local = ast_builder.module_export_name_identifier_name(SPAN, &id.name);
      let exported = ast_builder.module_export_name_identifier_name(SPAN, &id.name);

      let specifier =
        ast_builder.export_specifier(SPAN, local, exported, ImportOrExportKind::Value);

      specifiers.push(specifier);
    }

    _ => {
      panic!("panic: not implemented");
    }
  }

  specifiers
}

fn create_named_export_stmt<'a>(
  ast_builder: AstBuilder<'a>,
  specifiers: ArenaVec<'a, ExportSpecifier<'a>>,
) -> Statement<'a> {
  let export_named = ast_builder.module_declaration_export_named_declaration(
    SPAN,
    None,
    specifiers,
    None,
    ImportOrExportKind::Value,
    None,
  );

  export_named.into()
}

fn create_named_import_stmt<'a>(
  ast_builder: AstBuilder<'a>,
  specifiers: Option<ArenaVec<'a, ImportDeclarationSpecifier<'a>>>,
  source: StringLiteral<'a>,
) -> Statement<'a> {
  let import_named = ast_builder.module_declaration_import_declaration(
    SPAN,
    specifiers,
    source,
    None,
    ImportOrExportKind::Value,
  );

  import_named.into()
}

pub(crate) struct ExportReplacer<'a> {
  pub allocator: &'a Allocator,
  pub ast: AstBuilder<'a>,

  pub filename: &'a str,
}

impl<'a> ExportReplacer<'a> {
  pub fn new(allocator: &'a Allocator, ast: AstBuilder<'a>, filename: &'a str) -> Self {
    Self {
      allocator,
      ast,
      filename,
    }
  }

  pub fn build(&mut self, program: &mut Program<'a>, ctx: &mut oxc_traverse::TraverseCtx<'a>)
  where
    Self: Traverse<'a>,
    Self: Sized,
  {
    walk_program(self, program, ctx);
  }
}

impl<'a> Traverse<'a> for ExportReplacer<'a> {
  fn exit_program(&mut self, program: &mut Program<'a>, ctx: &mut TraverseCtx<'a>) {
    let mut new_body: ArenaVec<'a, Statement<'a>> = ArenaVec::new_in(self.allocator);

    for stmt in &program.body {
      match stmt {
        Statement::ImportDeclaration(decl) => match &decl.specifiers {
          Some(specifiers) => {
            for specifier in specifiers {
              match specifier {
                ImportDeclarationSpecifier::ImportSpecifier(import_specifier) => {
                  let mut import_specifiers: ArenaVec<ImportDeclarationSpecifier<'a>> =
                    ArenaVec::with_capacity_in(1, self.allocator);
                  let new_specifier = self.ast.import_declaration_specifier_import_specifier(
                    SPAN,
                    self
                      .ast
                      .module_export_name_identifier_name(SPAN, &import_specifier.local.name),
                    self
                      .ast
                      .binding_identifier(SPAN, &import_specifier.imported.name()),
                    ImportOrExportKind::Value,
                  );
                  import_specifiers.push(new_specifier);

                  let source = decl.source.clone();
                  let import_stmt =
                    create_named_import_stmt(self.ast, Some(import_specifiers), source);
                  new_body.push(import_stmt);
                }

                ImportDeclarationSpecifier::ImportDefaultSpecifier(import_default_specifier) => {
                  let mut import_specifiers: ArenaVec<ImportDeclarationSpecifier<'a>> =
                    ArenaVec::with_capacity_in(1, self.allocator);
                  let new_specifier = self.ast.import_declaration_specifier_import_specifier(
                    SPAN,
                    self.ast.module_export_name_identifier_name(SPAN, "default"),
                    self
                      .ast
                      .binding_identifier(SPAN, &import_default_specifier.local.name),
                    ImportOrExportKind::Value,
                  );
                  import_specifiers.push(new_specifier);

                  let source = decl.source.clone();
                  let import_stmt =
                    create_named_import_stmt(self.ast, Some(import_specifiers), source);
                  new_body.push(import_stmt);
                }

                ImportDeclarationSpecifier::ImportNamespaceSpecifier(
                  import_namespace_specifier,
                ) => {
                  new_body.push(stmt.clone_in(self.allocator));
                }

                _ => {
                  panic!("panic: not implemented, file {}", self.filename);
                }
              }
            }
          }
          None => {}
        },

        Statement::ExportDefaultDeclaration(decl) => match &decl.declaration {
          ExportDefaultDeclarationKind::FunctionDeclaration(func) => {
            let mut export_specifiers: ArenaVec<ExportSpecifier<'a>> =
              ArenaVec::with_capacity_in(1, self.allocator);
            let mut new_func = func.clone_in(self.allocator);

            match &func.id {
              Some(id) => {
                let new_specifier = self.ast.export_specifier(
                  SPAN,
                  self.ast.module_export_name_identifier_name(SPAN, &id.name),
                  self.ast.module_export_name_identifier_name(SPAN, "default"),
                  ImportOrExportKind::Value,
                );

                export_specifiers.push(new_specifier);
              }
              None => {
                let symbol_id = ctx.scoping.generate_uid_in_root_scope(
                  "export",
                  oxc_semantic::SymbolFlags::FunctionScopedVariable,
                );
                let variable_name = ctx.ast.atom(&ctx.symbols().names[symbol_id]);

                let new_specifier = self.ast.export_specifier(
                  SPAN,
                  self
                    .ast
                    .module_export_name_identifier_name(SPAN, variable_name.clone()),
                  self.ast.module_export_name_identifier_name(SPAN, "default"),
                  ImportOrExportKind::Value,
                );

                export_specifiers.push(new_specifier);
                new_func.id = Some(self.ast.binding_identifier(SPAN, variable_name.clone()));
              }
            }

            let export_stmt = create_named_export_stmt(self.ast, export_specifiers);
            let new_decl = ctx.ast.declaration_from_function(new_func);

            new_body.push(new_decl.into());
            new_body.push(export_stmt);
          }

          ExportDefaultDeclarationKind::ClassDeclaration(class) => {
            let mut export_specifiers: ArenaVec<ExportSpecifier<'a>> =
              ArenaVec::with_capacity_in(1, self.allocator);
            let mut new_class = class.clone_in(self.allocator);

            match &class.id {
              Some(id) => {
                let new_specifier = self.ast.export_specifier(
                  SPAN,
                  self.ast.module_export_name_identifier_name(SPAN, &id.name),
                  self.ast.module_export_name_identifier_name(SPAN, "default"),
                  ImportOrExportKind::Value,
                );

                export_specifiers.push(new_specifier);
              }
              None => {
                let symbol_id = ctx.scoping.generate_uid_in_root_scope(
                  "export",
                  oxc_semantic::SymbolFlags::FunctionScopedVariable,
                );
                let variable_name = ctx.ast.atom(&ctx.symbols().names[symbol_id]);

                let new_specifier = self.ast.export_specifier(
                  SPAN,
                  self
                    .ast
                    .module_export_name_identifier_name(SPAN, variable_name.clone()),
                  self.ast.module_export_name_identifier_name(SPAN, "default"),
                  ImportOrExportKind::Value,
                );

                export_specifiers.push(new_specifier);
                new_class.id = Some(self.ast.binding_identifier(SPAN, variable_name.clone()));
              }
            }

            let export_stmt = create_named_export_stmt(self.ast, export_specifiers);
            let new_decl = ctx.ast.declaration_from_class(new_class);

            new_body.push(new_decl.into());
            new_body.push(export_stmt);
          }

          ExportDefaultDeclarationKind::ObjectExpression(obj) => {
            let mut export_specifiers: ArenaVec<ExportSpecifier<'a>> =
              ArenaVec::with_capacity_in(1, self.allocator);

            let symbol_id = ctx.scoping.generate_uid_in_root_scope(
              "export",
              oxc_semantic::SymbolFlags::FunctionScopedVariable,
            );
            let variable_name = ctx.ast.atom(&ctx.symbols().names[symbol_id]);

            let new_specifier = self.ast.export_specifier(
              SPAN,
              self
                .ast
                .module_export_name_identifier_name(SPAN, variable_name.clone()),
              self.ast.module_export_name_identifier_name(SPAN, "default"),
              ImportOrExportKind::Value,
            );

            export_specifiers.push(new_specifier);

            let export_stmt = create_named_export_stmt(self.ast, export_specifiers);

            let mut var_declarations: ArenaVec<VariableDeclarator<'a>> =
              ArenaVec::with_capacity_in(1, self.allocator);

            let binding_pattern = ctx.ast.binding_pattern(
              ctx.ast.binding_pattern_kind_from_binding_identifier(
                ctx.ast.binding_identifier(SPAN, variable_name.clone()),
              ),
              Option::<TSTypeAnnotation>::None,
              false,
            );

            let variable_declarator = ctx.ast.variable_declarator(
              SPAN,
              VariableDeclarationKind::Const,
              binding_pattern,
              Some(ctx.ast.expression_from_object(obj.clone_in(self.allocator))),
              false,
            );

            var_declarations.push(variable_declarator);

            let var_declaration = ctx.ast.variable_declaration(
              SPAN,
              VariableDeclarationKind::Const,
              var_declarations,
              false,
            );

            let new_decl = ctx.ast.declaration_from_variable(var_declaration);

            new_body.push(new_decl.into());
            new_body.push(export_stmt);
          }

          _ => {
            panic!("panic: not implemented");
          }
        },

        Statement::ExportNamedDeclaration(decl) => match &decl.declaration {
          Some(Declaration::FunctionDeclaration(func)) => {
            let specifiers = create_export_specifiers(self.allocator, self.ast, &func.id);
            let export_stmt = create_named_export_stmt(self.ast, specifiers);

            let new_decl = ctx
              .ast
              .declaration_from_function(func.clone_in(self.allocator));

            new_body.push(new_decl.into());
            new_body.push(export_stmt);
          }

          Some(Declaration::VariableDeclaration(var)) => {
            for decl in &var.declarations {
              match &decl.kind {
                VariableDeclarationKind::Var
                | VariableDeclarationKind::Const
                | VariableDeclarationKind::Let => {
                  // let mut specifiers = ArenaVec::with_capacity_in(1, self.allocator);

                  match &decl.id.kind {
                    BindingPatternKind::BindingIdentifier(id) => {
                      let specifiers = create_export_specifiers(
                        self.allocator,
                        self.ast,
                        &Some(id.deref().clone()),
                      );
                      let export_stmt = create_named_export_stmt(self.ast, specifiers);

                      let new_decl = ctx
                        .ast
                        .declaration_from_variable(var.clone_in(self.allocator));

                      new_body.push(new_decl.into());
                      new_body.push(export_stmt);
                    }

                    BindingPatternKind::ObjectPattern(obj) => {
                      let new_decl = ctx
                        .ast
                        .declaration_from_variable(var.clone_in(self.allocator));

                      new_body.push(new_decl.into());

                      for property in &obj.properties {
                        let value = property.value.get_binding_identifier();

                        match value {
                          Some(value) => {
                            let specifiers = create_export_specifiers(
                              self.allocator,
                              self.ast,
                              &Some(value.clone_in(self.allocator)),
                            );
                            let export_stmt = create_named_export_stmt(self.ast, specifiers);

                            new_body.push(export_stmt);
                          }
                          None => {
                            panic!(
                              "panic: not implemented for `property.value`, file {}",
                              self.filename
                            );
                          }
                        }
                      }
                    }

                    _ => {
                      panic!(
                        "panic: not implemented for `decl.id`, file {}",
                        self.filename
                      );
                    }
                  }
                }

                _ => {
                  panic!("panic: not implemented for `var.declarations`");
                }
              }

              //               match &decl.id {
              // // VariableDeclarator::
              //               }
            }
          }

          None => {
            for specifier in &decl.specifiers {
              let mut export_specifiers: ArenaVec<ExportSpecifier<'a>> =
                ArenaVec::with_capacity_in(1, self.allocator);
              export_specifiers.push(specifier.clone_in(self.allocator));

              let mut source: Option<StringLiteral<'a>> = None;

              if decl.source.is_some() {
                source = decl.source.clone();

                let mut import_specifiers: ArenaVec<ImportDeclarationSpecifier<'a>> =
                  ArenaVec::with_capacity_in(1, self.allocator);

                match &specifier.exported {
                  ModuleExportName::IdentifierName(_) => {
                    let import_specifier = self.ast.import_declaration_specifier_import_specifier(
                      SPAN,
                      specifier.local.clone(),
                      self
                        .ast
                        .binding_identifier(SPAN, &specifier.exported.name()),
                      ImportOrExportKind::Value,
                    );

                    import_specifiers.push(import_specifier);
                  }
                  _ => {
                    panic!("panic: not implemented");
                  }
                }

                let import_stmt =
                  create_named_import_stmt(self.ast, Some(import_specifiers), source.unwrap());
                new_body.push(import_stmt);
              }

              let export_stmt = create_named_export_stmt(self.ast, export_specifiers);

              new_body.push(export_stmt);
            }
          }

          _ => {
            panic!("panic: not implemented, file {}", self.filename);
          }
        },
        _ => {
          new_body.push(stmt.clone_in(self.allocator));
        }
      }
    }

    program.body = new_body;
  }
}

#[cfg(test)]
mod tests {
  use oxc_allocator::Allocator;
  use oxc_ast::AstBuilder;
  use oxc_semantic::SemanticBuilder;
  use oxc_traverse::TraverseCtx;
  use pretty_assertions::assert_eq;

  use crate::context::TransformContext;
  use crate::export_expand::ExportReplacer;

  pub fn assert_fixture(input: &str, expected: &str) {
    let source_file = "source.js";

    let allocator = Allocator::default();
    let ctx = TransformContext::new(&allocator, &source_file, &input);

    let ast_builder = AstBuilder::new(ctx.allocator);
    let (symbols, scopes) = SemanticBuilder::new(ctx.source_text(), ctx.source_type())
      .build(&ctx.program())
      .semantic
      .into_symbol_table_and_scope_tree();

    let mut traverse_ctx = TraverseCtx::new(scopes, symbols, ctx.allocator);

    ExportReplacer::new(ctx.allocator, ast_builder, "source.js")
      .build(&mut ctx.program_mut(), &mut traverse_ctx);

    let result = ctx.codegen().build(&ctx.program());
    let result_code = result.source_text.replace("\t", "  ");

    assert_eq!(result_code.trim(), textwrap::dedent(expected).trim());
  }
}

#[test]

fn test_fn() {
  let input = r#"
    const foo = 1;
    export function bar() {}
  "#;
  let output = r#"
    const foo = 1;
    function bar() {}
    export { bar };
  "#;

  tests::assert_fixture(input, output);
}

#[test]

fn test_vars() {
  let input = r#"
    const foo = 1;
    export const bar = 2;
  "#;
  let output = r#"
    const foo = 1;
    const bar = 2;
    export { bar };
  "#;

  tests::assert_fixture(input, output);
}

#[test]

fn test_import_default() {
  let input = r#"
    import foo from "./foo";
    const foobar = foo + "bar";
    export { foobar };
    "#;
  let output = r#"
    import { default as foo } from "./foo";
    const foobar = foo + "bar";
    export { foobar };
    "#;

  tests::assert_fixture(input, output);
}

#[test]

fn test_import() {
  let input = r#"
    import { gap } from "./gap";
    const shorthands = { gap };
    export { shorthands };
  "#;
  let output = r#"
    import { gap } from "./gap";
    const shorthands = { gap };
    export { shorthands };
  "#;

  tests::assert_fixture(input, output);
}

#[test]

fn test_export_default_fn() {
  let input = r#"
    export default function foo() {}
  "#;
  let output = r#"
    function foo() {}
    export { foo as default };
  "#;

  tests::assert_fixture(input, output);
}

#[test]

fn test_export_default_fn_anon() {
  let input = r#"
    export default function() {}
  "#;
  let output = r#"
    function _export() {}
    export { _export as default };
  "#;

  tests::assert_fixture(input, output);
}

#[test]

fn test_export_default_class() {
  let input = r#"
    export default class Foo {}
  "#;
  let output = r#"
    class Foo {}
    export { Foo as default };
  "#;

  tests::assert_fixture(input, output);
}

#[test]

fn test_export_default_class_anon() {
  let input = r#"
    export default class {}
  "#;
  let output = r#"
    class _export {}
    export { _export as default };
  "#;

  tests::assert_fixture(input, output);
}

#[test]

fn test_export_default_obj_anon() {
  let input = r#"
    export default {}
  "#;
  let output = r#"
    const _export = {};
    export { _export as default };
  "#;

  tests::assert_fixture(input, output);
}

#[test]

fn test_export_const() {
  let input = r#"
    export { foo } from "./foo";
    export { bar } from "./bar";
    export const baz = {};
  "#;
  let output = r#"
    import { foo } from "./foo";
    export { foo };
    import { bar } from "./bar";
    export { bar };
    const baz = {};
    export { baz };
  "#;

  tests::assert_fixture(input, output);
}

#[test]

fn test_export_function() {
  let input = r#"
    export function foo() {}
    export function bar() {}
  "#;
  let output = r#"
    function foo() {}
    export { foo };
    function bar() {}
    export { bar };
  "#;

  tests::assert_fixture(input, output);
}

#[test]

fn test_multi_import() {
  let input = r#"
    import { foo, bar } from "./mod";
    export { foo, bar };
  "#;
  let output = r#"
    import { foo } from "./mod";
    import { bar } from "./mod";
    export { foo };
    export { bar };
  "#;

  tests::assert_fixture(input, output);
}

#[test]

fn test_side_effects() {
  let input = r#"
    import "./mod";
  "#;
  let output = r#""#;

  tests::assert_fixture(input, output);
}

#[test]

fn test_export_all() {
  let input = r#"
    export * from "./mod";
  "#;
  let output = r#"
    export * from "./mod";
  "#;

  tests::assert_fixture(input, output);
}

#[test]

fn test_import_name() {
  let input = r#"
    import * as Mod from "./mod";
  "#;
  let output = r#"
    import * as Mod from "./mod";
  "#;

  tests::assert_fixture(input, output);
}

#[test]

fn test_export_obj_pattern() {
  let input = r#"
    const foo = {a: 1, b: 2};
    export const { a: fooA, b: fooB } = foo;
  "#;
  let output = r#"
    const foo = {
      a: 1,
      b: 2
    };
    const { a: fooA, b: fooB } = foo;
    export { fooA };
    export { fooB };
  "#;

  tests::assert_fixture(input, output);
}
