use crate::export_expand::ExportReplacer;
use crate::{context::TransformContext, TransformOptions};
use napi_derive::napi;
use oxc_allocator::{Allocator, CloneIn, Vec as ArenaVec};
use oxc_ast::ast::{Program, Statement};
use oxc_ast::{AstBuilder, AstKind};
use oxc_codegen::Codegen;
use oxc_semantic::{
  AstNode, AstNodeId, AstNodes, Reference, ReferenceId, ScopeId, ScopeTree, SemanticBuilder,
  SymbolId, SymbolTable,
};
use oxc_span::{GetSpan, Span};
use oxc_transformer::Transformer;
use oxc_traverse::TraverseCtx;
use std::cell::{OnceCell, Ref, RefCell, RefMut};
use std::collections::HashSet;
use std::ops::Deref;
use std::process::Output;
// NOTE: Use JSDoc syntax for all doc comments, not rustdoc.
// NOTE: Types must be aligned with [@types/babel__core](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/babel__core/index.d.ts).

#[napi(object)]
pub struct TransformResult {
  /// The transformed code.
  ///
  /// If parsing failed, this will be an empty string.
  pub code: String,

  /// Parse and transformation errors.
  ///
  /// Oxc's parser recovers from common syntax errors, meaning that
  /// transformed code may still be available even if there are errors in this
  /// list.
  pub errors: Vec<String>,
}

fn pass_to_align_exports<'a>(
  allocator: &'a Allocator,
  filename: &'a String,
  source_text: &'a String,
) -> TransformContext<'a> {
  let ctx = TransformContext::new(allocator, &filename, &source_text);
  let semantic = SemanticBuilder::new(ctx.source_text(), ctx.source_type())
    .build(&ctx.program())
    .semantic;

  let (symbol_table, scope_tree) = semantic.into_symbol_table_and_scope_tree();

  let mut traverse_ctx = TraverseCtx::new(scope_tree, symbol_table, ctx.allocator);
  let ast_builder = AstBuilder::new(ctx.allocator);

  ExportReplacer::new(ctx.allocator, ast_builder, filename)
    .build(&mut ctx.program_mut(), &mut traverse_ctx);

  ctx
}

fn pass_to_treeshake<'a>(ctx: &'a TransformContext, only_exports_orig: Vec<&str>) {
  let semantic = SemanticBuilder::new(ctx.source_text(), ctx.source_type())
    .build(&ctx.program())
    .semantic;
  // println!("{:#?}", ctx.source_text());
  let nodes = semantic.nodes();
  let symbols = semantic.symbols();

  let mut only_exports = only_exports_orig.clone();
  // let mut ids_of_nodes_to_keep: HashSet<AstNodeId> = HashSet::new();

  // Pass for "default" export

  if only_exports.contains(&"default") {
    for stmt in ctx.program().body.iter() {
      match stmt {
        Statement::ExportNamedDeclaration(decl) => {
          for specifier in &decl.specifiers {
            if specifier.exported.name() == "default" {
              let local_name = specifier.local.name().as_str();

              only_exports.push(&local_name);
            }
          }
        }
        _ => {}
      }
    }
  }

  let root_scope_id = ScopeId::new(0);

  // for symbol_id in symbols.iter() {
  //   let symbol_scope_id = symbols.get_scope_id(symbol_id);
  //
  //   if symbol_scope_id == root_scope_id {
  //     let symbol_flags = symbols.get_flags(symbol_id);
  //
  //     if symbol_flags.is_export() {
  //       let symbol_name = symbols.get_name(symbol_id);
  //
  //       if only_exports.contains(&symbol_name) {
  //         let ast_node = symbols.get_declaration(symbol_id);
  //         let root_node_id = find_root_node_id(ast_node, nodes);
  //
  //         match root_node_id {
  //           Some(root_node_id) => {
  //             ids_of_nodes_to_keep.insert(root_node_id);
  //           }
  //           None => {}
  //         }
  //
  //         let references = symbols.get_resolved_reference_ids(symbol_id);
  //
  //         for reference_id in references {
  //           let reference = symbols.get_reference(*reference_id);
  //           let node_id = reference.node_id();
  //
  //           let parent_kind = nodes.parent_kind(node_id);
  //
  //           match parent_kind {
  //             Some(AstKind::ExportSpecifier(_)) => {
  //               let root_node_id = find_root_node_id(node_id, nodes);
  //
  //               match root_node_id {
  //                 Some(root_node_id) => {
  //                   ids_of_nodes_to_keep.insert(root_node_id);
  //                 }
  //                 None => {}
  //               }
  //             }
  //             _ => {}
  //           }
  //         }
  //       }
  //     }
  //   }
  // }

  // for (id, symbolName) in symbols.names.iter().enumerate() {
  //   if only_exports.contains(&symbolName.as_str()) {
  //     // println!("name: {:?} {:#?}", id, symbolName);
  //
  //     let symbol_flags = symbols.flags[id];
  //
  //     if symbol_flags.is_export() {
  //       // println!("exported: {:#?}", symbolName);
  //
  //       let declaration = symbols.declarations[id];
  //
  //       // let node = nodes.get_node(declaration);
  //       // let root_node = find_root_node(node, nodes);
  //
  //       let root_node_id = find_root_node_id(declaration, nodes);
  //
  //       match root_node_id {
  //         Some(root_node_id) => {
  //           ids_of_nodes_to_keep.insert(root_node_id);
  //         }
  //         None => {}
  //       }
  //     }
  //   }
  // }

  let mut baz_symbol_id = None;
  let mut baz_symbol_span = None;
  let mut baz_root_node_id = None;
  let mut baz_root_node = None;

  for symbol_id in symbols.iter() {
    let symbol_scope_id = symbols.get_scope_id(symbol_id);

    if symbol_scope_id == root_scope_id {
      let symbol_flags = symbols.get_flags(symbol_id);

      if symbol_flags.is_export() {
        let symbol_name = symbols.get_name(symbol_id);

        if only_exports.contains(&symbol_name) {
          let ast_node = symbols.get_declaration(symbol_id);

          baz_symbol_id = Some(symbol_id);
          baz_symbol_span = Some(symbols.get_span(symbol_id));

          baz_root_node_id = find_root_node_id(ast_node, nodes);
          baz_root_node = Some(nodes.get_node(baz_root_node_id.unwrap()))
        }
      }
    }
  }

  // println!("baz_symbol_id: {:#?}", baz_symbol_id);
  // println!("baz_symbol_span: {:#?}", baz_symbol_span);
  // println!("baz_root_node_id: {:#?}", baz_root_node_id);
  // println!("baz_root_node(span): {:#?}", baz_root_node.unwrap().span());

  let mut ids_of_nodes_to_keep: HashSet<AstNodeId> = HashSet::new();

  for symbol_id in symbols.iter() {
    let symbol_scope_id = symbols.get_scope_id(symbol_id);

    if symbol_scope_id == root_scope_id {
      let symbol_flags = symbols.get_flags(symbol_id);

      if symbol_flags.is_export() {
        let symbol_name = symbols.get_name(symbol_id);

        if only_exports.contains(&symbol_name) {
          let ast_node_id = symbols.get_declaration(symbol_id);
          let ast_node = nodes.get_node(ast_node_id);

          let root_node_id = find_root_node_id(ast_node_id, nodes);
          let root_node = nodes.get_node(root_node_id.unwrap());

          find_referenced_by_node_root_node_ids(
            nodes,
            symbols,
            root_node,
            &mut ids_of_nodes_to_keep,
          );

          let references = symbols.get_resolved_reference_ids(symbol_id);

          for reference_id in references {
            let reference = symbols.get_reference(*reference_id);
            let node_id = reference.node_id();

            let parent_kind = nodes.parent_kind(node_id);

            match parent_kind {
              Some(AstKind::ExportSpecifier(_)) => {
                let root_node_id = find_root_node_id(node_id, nodes);

                match root_node_id {
                  Some(root_node_id) => {
                    ids_of_nodes_to_keep.insert(root_node_id);
                  }
                  None => {}
                }
              }
              _ => {}
            }
          }
        }
      }
    }
  }

  // println!("{:#?}", symbols.references);
  // println!("{:#?}", symbols);

  // let node_ids = symbols
  //   .references
  //   .iter()
  //   .map(|reference| reference.node_id())
  //   .collect::<Vec<_>>();
  //
  // println!(
  //   "{:#?}",
  //   node_ids
  //     .iter()
  //     .map(|id| nodes.get_node(*id))
  //     .collect::<Vec<_>>()
  // );

  // for reference in symbols.references.iter().rev() {
  //   match reference.symbol_id() {
  //     None => {
  //       // println!("no symbol id");
  //       // println!("{:#?}", reference);
  //     }
  //     Some(symbol_id) => {
  //       let declaration = symbols.get_declaration(symbol_id);
  //
  //       let referenced_node_id = declaration;
  //       let reference_node_id = reference.node_id();

  // let reference_root_node = find_root_node(reference_node, nodes);
  // let referenced_root_node = find_root_node(referenced_node, nodes);
  //
  // // println!("referenced_node: {:#?}", referenced_node);
  // // println!("reference_node: {:#?}", reference_node);
  // // println!("reference_root_node: {:#?}", reference_root_node);
  //
  // match reference_root_node {
  //   None => {}
  //   Some(reference_root_node) => {
  //     if ids_of_nodes_to_keep.contains(&reference_root_node.id()) {
  //       // println!("keep: {:#?}", reference_root_node);
  //
  //       match referenced_root_node {
  //         None => {}
  //         Some(referenced_root_node) => {
  //           ids_of_nodes_to_keep.push(referenced_root_node.id());
  //         }
  //       }
  //     }
  //   }
  // }
  //
  // match referenced_root_node {
  //   None => {}
  //   Some(referenced_root_node) => {
  //     if ids_of_nodes_to_keep.contains(&referenced_root_node.id()) {
  //       // println!("keep: {:#?}", reference_root_node);
  //
  //       match reference_root_node {
  //         None => {}
  //         Some(reference_root_node) => {
  //           ids_of_nodes_to_keep.push(reference_root_node.id());
  //         }
  //       }
  //     }
  //   }
  // }

  // let reference_root_node_id = find_root_node_id(reference_node_id, nodes);
  //
  // // println!("referenced_node: {:#?}", referenced_node);
  // // println!("reference_node: {:#?}", reference_node);
  // // println!("reference_root_node: {:#?}", reference_root_node);
  //
  // match reference_root_node_id {
  //   None => {}
  //   Some(reference_root_node_id) => {
  //     if ids_of_nodes_to_keep.contains(&reference_root_node_id) {
  //       // println!("keep: {:#?}", reference_root_node);
  //
  //       let referenced_root_node_id = find_root_node_id(referenced_node_id, nodes);
  //
  //       match referenced_root_node_id {
  //         None => {}
  //         Some(referenced_root_node_id) => {
  //           ids_of_nodes_to_keep.insert(referenced_root_node_id);
  //           continue;
  //         }
  //       }
  //     }
  //   }
  // }

  // match referenced_root_node_id {
  //   None => {}
  //   Some(referenced_root_node_id) => {
  //     if ids_of_nodes_to_keep.contains(&referenced_root_node_id) {
  //       // println!("keep: {:#?}", reference_root_node);
  //
  //       match reference_root_node_id {
  //         None => {}
  //         Some(reference_root_node_id) => {
  //           ids_of_nodes_to_keep.insert(reference_root_node_id);
  //         }
  //       }
  //     }
  //   }
  // }
  // }
  // }
  // }

  // println!("{:#?}", symbol_table);
  // println!("{:#?}", scope_tree);

  // println!("{:#?}", ctx.program());

  // let mut traverse_ctx = TraverseCtx::new(semanticTable.1, semanticTable.0, ctx.allocator);
  // let ast_builder = AstBuilder::new(ctx.allocator);

  // let root_nodes_to_keep = ids_of_nodes_to_keep
  //   .iter()
  //   .map(|id| nodes.get_node(*id))
  //   .collect::<Vec<&AstNode>>();
  // let spans_to_keep = root_nodes_to_keep
  //   .iter()
  //   .map(|node| node.kind().span())
  //   .collect::<Vec<_>>();

  let spans_to_keep = ids_of_nodes_to_keep
    .iter()
    .map(|id| nodes.get_node(*id).kind().span())
    .collect::<Vec<_>>();

  // println!(
  //   "{:#?}",
  //   root_nodes_to_keep
  //     .iter()
  //     .map(|node| node.kind().span())
  //     .collect::<Vec<_>>()
  // );

  let mut program = &mut ctx.program_mut();
  let mut new_body = ArenaVec::new_in(ctx.allocator);

  for node in program.body.iter() {
    let should_keep = spans_to_keep
      .iter()
      .find(|span| span.start == node.span().start && span.end == node.span().end);

    if should_keep.is_some() {
      new_body.push(node.clone_in(ctx.allocator));
    }

    match node {
      Statement::ExportAllDeclaration(_) => {
        new_body.push(node.clone_in(ctx.allocator));
      }
      _ => {}
    }
  }

  program.body = new_body;
}

// fn find_root_node<'a>(node: &'a AstNode, nodes: &'a AstNodes<'a>) -> Option<&'a AstNode<'a>> {
//   let mut root_node: Option<&AstNode> = None;
//
//   for parent in nodes.iter_parents(node.id()) {
//     if parent.id() == nodes.root_node().unwrap().id() {
//       break;
//     }
//
//     root_node = Some(parent);
//   }
//
//   root_node
// }

fn find_root_node_id<'a>(node_id: AstNodeId, nodes: &'a AstNodes<'a>) -> Option<AstNodeId> {
  let mut current_node: Option<AstNodeId> = None;
  let root_node_id = nodes.root_node().unwrap().id();

  for parent_id in nodes.ancestors(node_id) {
    if parent_id == root_node_id {
      break;
    }

    current_node = Some(parent_id);
  }

  current_node
}

fn find_references_inside_span<'a>(
  ast_nodes: &'a AstNodes,
  symbol_table: &'a SymbolTable,
  span: Span,
) -> Vec<&'a Reference> {
  let mut references = Vec::new();

  for reference in symbol_table.references.iter() {
    let node = ast_nodes.get_node(reference.node_id());
    let node_span = node.span();

    if span.start <= node_span.start && span.end >= node_span.end {
      references.push(reference);
    }
  }

  references
}

fn get_root_node_of_reference<'a>(
  ast_nodes: &'a AstNodes,
  symbol_table: &'a SymbolTable,
  reference: &'a Reference,
) -> Option<&'a AstNode<'a>> {
  let symbol_id = reference.symbol_id();

  match symbol_id {
    None => {}
    Some(symbol_id) => {
      let referenced_node_id = symbol_table.declarations[symbol_id];
      let root_node_id = find_root_node_id(referenced_node_id, ast_nodes);

      match root_node_id {
        None => {}
        Some(root_node_id) => {
          return Some(ast_nodes.get_node(root_node_id));
        }
      }
    }
  }

  None
}

fn find_referenced_by_node_root_node_ids<'a>(
  ast_nodes: &'a AstNodes,
  symbol_table: &'a SymbolTable,
  node: &'a AstNode,
  mut set: &mut HashSet<AstNodeId>,
) {
  set.insert(node.id());

  // println!("find_referenced_by_node_root_node_ids: node {:#?}", node);

  let references = find_references_inside_span(ast_nodes, symbol_table, node.span());

  for reference in references {
    let referenced_root_node = get_root_node_of_reference(ast_nodes, symbol_table, reference);

    match referenced_root_node {
      None => {}
      Some(referenced_root_node) => {
        // println!("find_referenced_by_node_root_node_ids: L reference {:#?}", reference);

        // println!("symbol_table: {:#?}", symbol_table);
        // println!("find_referenced_by_node_root_node_ids: L root {:#?}", referenced_root_node);

        if set.contains(&referenced_root_node.id()) {
          continue;
        }

        find_referenced_by_node_root_node_ids(ast_nodes, symbol_table, referenced_root_node, set);
      }
    }
  }
}

#[napi(object)]
pub struct TransformInner {
  pub output: String,
  pub errors: Vec<String>,
}

pub fn transform_inner<'a>(
  allocator: &'a Allocator,
  filename: &'a String,
  source_text: &'a String,
  only_exports: Vec<&str>,
  output_json: bool,
) -> TransformInner {
  let ctx_align_exports = pass_to_align_exports(allocator, filename, source_text);

  if only_exports.contains(&"*") {
    let errors = ctx_align_exports.take_and_render_reports();
    if output_json {
      let output = serde_json::to_string(ctx_align_exports.program().deref()).unwrap();

      return TransformInner { output, errors };
    }

    let code_align_exports = ctx_align_exports
      .codegen()
      .build(&ctx_align_exports.program());

    return TransformInner {
      output: code_align_exports.source_text,
      errors,
    };
  }

  let code_align_exports = ctx_align_exports
    .codegen()
    .build(&ctx_align_exports.program());
  let ctx_treeshake = TransformContext::new(&allocator, &filename, &code_align_exports.source_text);

  pass_to_treeshake(&ctx_treeshake, only_exports);

  let errors = ctx_treeshake.take_and_render_reports();

  if output_json {
    let output = serde_json::to_string(ctx_treeshake.program().deref()).unwrap();

    return TransformInner { output, errors };
  }

  let code_treeshake = ctx_treeshake.codegen().build(&ctx_treeshake.program());

  TransformInner {
    output: code_treeshake.source_text,
    errors,
  }
}

/// Transpile a JavaScript or TypeScript into a target ECMAScript version.
///
/// @param filename The name of the file being transformed. If this is a
/// relative path, consider setting the {@link TransformOptions#cwd} option..
/// @param sourceText the source code itself
/// @param options The options for the transformation. See {@link
/// TransformOptions} for more information.
///
/// @returns an object containing the transformed code, source maps, and any
/// errors that occurred during parsing or transformation.
#[allow(clippy::needless_pass_by_value)]
#[napi]
pub fn transform(
  filename: String,
  source_text: String,
  only_exports: Vec<&str>,
  options: Option<TransformOptions>,
) -> TransformInner {
  let allocator = Allocator::default();
  let result = transform_inner(&allocator, &filename, &source_text, only_exports, true);

  result
}

#[cfg(test)]
mod tests {
  use crate::transformer::transform_inner;
  use oxc_allocator::Allocator;
  use pretty_assertions::assert_eq;

  pub fn assert_fixture(input: &str, expected: &str, only_exports: Vec<&str>) {
    let allocator = Allocator::default();
    let result = transform_inner(
      &allocator,
      &"source.js".to_string(),
      &input.to_string(),
      only_exports,
      false,
    );
    let result_code = result.output.replace("\t", "  ");

    assert_eq!(result_code.trim(), textwrap::dedent(expected).trim());
  }
}

#[test]

fn test_fn() {
  let input = r#"
    const foo = "foo";
    const baz = "baz";
    export function foobaz() {
      return foo + "baz";
    }
  "#;
  let output = r#"
    const foo = "foo";
    function foobaz() {
      return foo + "baz";
    }
    export { foobaz };
  "#;

  tests::assert_fixture(input, output, vec!["foobaz"]);
}

#[test]

fn test_obj() {
  let input = r#"
    const foo = "foo";
    const baz = "baz";
    export const foobaz = { foo: baz }
  "#;
  let output = r#"
    const baz = "baz";
    const foobaz = { foo: baz };
    export { foobaz };
  "#;

  tests::assert_fixture(input, output, vec!["foobaz"]);
}

#[test]

fn test_exports() {
  let input = r#"
    const foo = "foo";
    console.log(foo);
    export { foo };
    const bar = "bar";
    console.log(foo);
    export { bar };
  "#;
  let output = r#"
    const foo = "foo";
    export { foo };
  "#;

  tests::assert_fixture(input, output, vec!["foo"]);
}

#[test]

fn test_import() {
  let input = r#"
    import { foo } from "./foo";
    export const foobar = foo + "bar";
    export const baz = "baz";
  "#;
  let output = r#"
    import { foo } from "./foo";
    const foobar = foo + "bar";
    export { foobar };
  "#;

  tests::assert_fixture(input, output, vec!["foobar"]);
}

#[test]
fn test_export() {
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

  tests::assert_fixture(input, output, vec!["shorthands"]);
}

#[test]
fn test_reexports() {
  let input = r#"
    export { foo } from "./foo";
    export { bar } from "./bar";
    export const baz = {};
  "#;
  let output = r#"
    import { foo } from "./foo";
    export { foo };
    const baz = {};
    export { baz };
  "#;

  tests::assert_fixture(input, output, vec!["foo", "baz"]);
}

#[test]

fn test_export_default_fn() {
  let input = r#"
    function foo() {}
    function bar() {}
    export { foo as default };
  "#;
  let output = r#"
    function foo() {}
    export { foo as default };
  "#;

  tests::assert_fixture(input, output, vec!["default"]);
}

#[test]

fn test_export_default_obj() {
  let input = r#"
    const objA = { color: "red" };
    const objB = { color: "blue" };
    export { objA as default };
  "#;
  let output = r#"
    const objA = { color: "red" };
    export { objA as default };
  "#;

  tests::assert_fixture(input, output, vec!["default"]);
}

#[test]

fn test_export_all() {
  let input = r#"
    export * from "./mod";
  "#;
  let output = r#"
    export * from "./mod";
  "#;

  tests::assert_fixture(input, output, vec!["foo"]);
}

#[test]

fn test_skip_shake() {
  let input = r#"
    const foo = "foo";
    const baz = "baz";
    export { foo };
    export { baz };
  "#;
  let output = r#"
    const foo = "foo";
    const baz = "baz";
    export { foo };
    export { baz };
  "#;

  tests::assert_fixture(input, output, vec!["*"]);
}

#[test]

fn test_ref_recursion() {
  let input = r#"
    import { foo } from "./foo";

    const width = "36px";
    const styles = { minWidth: width };
    const res = foo(styles);
    const obj = { ...styles };
    export { obj };
  "#;
  let output = r#"
    const width = "36px";
    const styles = { minWidth: width };
    const obj = { ...styles };
    export { obj };
  "#;

  tests::assert_fixture(input, output, vec!["obj"]);
}

#[test]

fn test_order() {
  let input = r#"
      import { qux } from "./qux";

      const quux = "quux";

      function baz() {
        return foo();
      }
      function foo() {
        return [qux, quux];
      }
      export { baz };
    "#;
  let output = r#"
      import { qux } from "./qux";
      const quux = "quux";
      function baz() {
        return foo();
      }
      function foo() {
        return [qux, quux];
      }
      export { baz };
    "#;

  tests::assert_fixture(input, output, vec!["baz"]);
}
