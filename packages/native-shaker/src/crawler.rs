use crate::module_resolve::resolve;
use crate::transform_inner;
use napi_derive::napi;
use oxc_allocator::Allocator;
use oxc_resolver::{ResolveOptions, Resolver};
use std::fs;
use std::path::{Path, PathBuf};

struct Crawler {
  allocator: Allocator,
  resolver: Resolver,
}

impl Crawler {
  pub fn new() -> Self {
    let allocator = Allocator::default();

    let resolve_options = ResolveOptions {
      extensions: vec![
        ".js".into(),
        ".jsx".into(),
        ".ts".into(),
        ".tsx".into(),
        ".json".into(),
        ".mjs".into(),
        ".cjs".into(),
        ".mts".into(),
        ".cts".into(),
      ],
      exports_fields: vec![vec!["import".into()]],
      main_fields: vec!["module".into(), "main".into()],
      ..ResolveOptions::default()
    };
    let resolver = Resolver::new(resolve_options);

    Self { allocator, resolver }
  }

  fn crawl_by_path(&self, path: &String, only_exports: Vec<&str>) {
    match fs::read_to_string(path) {
      Ok(module_text) => {
        let result = transform_inner(&self.allocator, path, &module_text, only_exports, false);

        println!("{:?}", module_text);
      }
      Err(err) => {
        println!("{:?}", err);
      }
    }
  }

  pub fn start_crawl(&self, source_text: String) {
    let source_text = r#"
        import { makeStyles } from '@griffel/core';

        import tokens from './tokens';

        export const classes = makeStyles({
            root: {
                color: tokens.color,
            },
        });
        "#;
    let path = PathBuf::from(
      "/Users/olfedias/WebstormProjects/wd40/packages/transform/__fixtures__/import-default",
    );
    let requests = vec!["@griffel/core", "./tokens"];

    for request in requests {
      let result = resolve(&self.resolver, &path, request);
      println!("{:?}", result);

      if let Some(path) = result.path {
        let only_exports = vec!["default"];

        self.crawl_by_path(&path, only_exports);
      }
    }
  }
}

#[napi]
pub fn start_crawl(source_text: String) {
    let crawler = Crawler::new();

    crawler.start_crawl(source_text);
}

#[test]
fn test_start_crawl() {
  start_crawl("".to_string());
  assert_eq!(1, 2)
}
