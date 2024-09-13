use oxc_resolver::{ResolveOptions, Resolver};
use std::path::{Path, PathBuf};

#[derive(Debug)]
pub struct ResolveResult {
  pub path: Option<String>,
  pub error: Option<String>,
  /// "type" field in the package.json file
  pub module_type: Option<String>,
}

pub fn resolve(resolver: &Resolver, path: &Path, request: &str) -> ResolveResult {
  match resolver.resolve(path, request) {
    Ok(resolution) => ResolveResult {
      path: Some(resolution.full_path().to_string_lossy().to_string()),
      error: None,
      module_type: resolution
        .package_json()
        .and_then(|p| p.r#type.as_ref())
        .and_then(|t| t.as_str())
        .map(|t| t.to_string()),
    },

    Err(err) => ResolveResult {
      path: None,
      module_type: None,
      error: Some(err.to_string()),
    },
  }
}

#[test]
fn test_resolve() {
  let path =
    PathBuf::from("/Users/olfedias/WebstormProjects/wd40/packages/native-shaker/src/crawler.rs");
  let request = "react";
  let resolver = Resolver::new(ResolveOptions::default());

  let result = resolve(&resolver, &path, request);
  assert_eq!(result.error, None);
  assert_eq!(
    result.path,
    Some("/Users/olfedias/WebstormProjects/wd40/node_modules/react/index.js".to_string())
  );
}
