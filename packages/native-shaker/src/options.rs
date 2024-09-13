use std::path::PathBuf;

use napi::Either;
use napi_derive::napi;
use oxc_transformer::{
  ArrowFunctionsOptions, ES2015Options, ReactOptions, RewriteExtensionsMode, TypeScriptOptions,
};

#[napi(object)]
#[derive(Default)]
pub struct TypeScriptBindingOptions {
  pub jsx_pragma: Option<String>,
  pub jsx_pragma_frag: Option<String>,
  pub only_remove_type_imports: Option<bool>,
  pub allow_namespaces: Option<bool>,
  pub allow_declare_fields: Option<bool>,
  /// Also generate a `.d.ts` declaration file for TypeScript files.
  ///
  /// The source file must be compliant with all
  /// [`isolatedDeclarations`](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#isolated-declarations)
  /// requirements.
  ///
  /// @default false
  pub declaration: Option<bool>,
  /// Rewrite or remove TypeScript import/export declaration extensions.
  ///
  /// - When set to `rewrite`, it will change `.ts`, `.mts`, `.cts` extensions to `.js`, `.mjs`, `.cjs` respectively.
  /// - When set to `remove`, it will remove `.ts`/`.mts`/`.cts`/`.tsx` extension entirely.
  /// - When set to `true`, it's equivalent to `rewrite`.
  /// - When set to `false` or omitted, no changes will be made to the extensions.
  ///
  /// @default false
  #[napi(ts_type = "'rewrite' | 'remove' | boolean")]
  pub rewrite_import_extensions: Option<Either<bool, String>>,
}

impl From<TypeScriptBindingOptions> for TypeScriptOptions {
  fn from(options: TypeScriptBindingOptions) -> Self {
    let ops = TypeScriptOptions::default();
    TypeScriptOptions {
      jsx_pragma: options.jsx_pragma.map(Into::into).unwrap_or(ops.jsx_pragma),
      jsx_pragma_frag: options
        .jsx_pragma_frag
        .map(Into::into)
        .unwrap_or(ops.jsx_pragma_frag),
      only_remove_type_imports: options
        .only_remove_type_imports
        .unwrap_or(ops.only_remove_type_imports),
      allow_namespaces: options.allow_namespaces.unwrap_or(ops.allow_namespaces),
      allow_declare_fields: options
        .allow_declare_fields
        .unwrap_or(ops.allow_declare_fields),
      optimize_const_enums: false,
      rewrite_import_extensions: Some(RewriteExtensionsMode::Remove),
    }
  }
}

/// Configure how TSX and JSX are transformed.
///
/// @see [@babel/plugin-transform-react-jsx](https://babeljs.io/docs/babel-plugin-transform-react-jsx#options)
#[napi(object)]
pub struct ReactBindingOptions {}

impl From<ReactBindingOptions> for ReactOptions {
  fn from(options: ReactBindingOptions) -> Self {
    ReactOptions {
      development: false,
      throw_if_namespace: true,
      pure: false,
      ..Default::default()
    }
  }
}

#[napi(object)]
pub struct ArrowFunctionsBindingOptions {
  /// This option enables the following:
  /// * Wrap the generated function in .bind(this) and keeps uses of this inside the function as-is, instead of using a renamed this.
  /// * Add a runtime check to ensure the functions are not instantiated.
  /// * Add names to arrow functions.
  ///
  /// @default false
  pub spec: Option<bool>,
}

impl From<ArrowFunctionsBindingOptions> for ArrowFunctionsOptions {
  fn from(options: ArrowFunctionsBindingOptions) -> Self {
    ArrowFunctionsOptions {
      spec: options.spec.unwrap_or_default(),
    }
  }
}

#[napi(object)]
pub struct ES2015BindingOptions {
  /// Transform arrow functions into function expressions.
  pub arrow_function: Option<ArrowFunctionsBindingOptions>,
}

impl From<ES2015BindingOptions> for ES2015Options {
  fn from(options: ES2015BindingOptions) -> Self {
    ES2015Options {
      arrow_function: options.arrow_function.map(Into::into),
    }
  }
}

/// Options for transforming a JavaScript or TypeScript file.
///
/// @see {@link transform}
#[napi(object)]
#[derive(Default)]
pub struct TransformOptions {
  /// The current working directory. Used to resolve relative paths in other
  /// options.
  pub cwd: Option<String>,

  /// Configure how TypeScript is transformed.
  pub typescript: Option<TypeScriptBindingOptions>,

  /// Configure how TSX and JSX are transformed.
  pub react: Option<ReactBindingOptions>,
}

impl From<TransformOptions> for oxc_transformer::TransformOptions {
  fn from(options: TransformOptions) -> Self {
    Self {
      cwd: options.cwd.map(PathBuf::from).unwrap_or_default(),
      typescript: options.typescript.map(Into::into).unwrap_or_default(),
      react: options.react.map(Into::into).unwrap_or_default(),
      ..Self::default()
    }
  }
}
