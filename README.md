# cat-doubler

Universal scaffolder generator that converts any project into reusable templates.

![cat-doubler](images/cat-doubler-120.png)

[![Project Status: WIP – Initial development is in progress, but there has not yet been a stable, usable release suitable for the public.](https://www.repostatus.org/badges/latest/wip.svg)](https://www.repostatus.org/#wip)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/cat-doubler.svg)](https://www.npmjs.com/package/cat-doubler)

---

[(日本語はこちら)](./README_ja.md)

## What is this?

Looking for a simple way to turn your existing project into a reusable generator (scaffolder)?
`cat-doubler` is the tool you need.

It analyzes your source code, identifies naming patterns, and generates a ready-to-use CLI tool that can scaffold new projects with different names. No complex configuration required - just point it at your project and specify the symbol name to replace.

cat-doubler itself runs in a Node.js environment, but the target project for conversion can be any type (Python packages, Go modules, Ruby gems, Java, .NET, C/C++, etc... any codebase with consistent naming patterns).

For example, if you have a React component library project called `MyAwesomeComponent` into `./my-component` directory:

```bash
cat-doubler ./my-component MyAwesomeComponent
```

This generates a scaffolder that can create new components with any name. The following creates a new project named `NewShinyComponent`:

```bash
cd ./scaffolder
node scaffolder.js NewShinyComponent ./new-shiny-component
```

The generated CLI automatically handles all case variations (`PascalCase`, `camelCase`, `kebab-case`, `snake_case`, `CONSTANT_CASE`) throughout your entire codebase.

## Key Features

- Automatic case detection: Analysing and replaces all case variations of your symbol name
- Any target project type: Supports all types of projects, mixed projects, and management of text files that are not programming-language specific projects
- Standalone output: Generated templates have zero runtime dependencies
- Zero configuration: Works out of the box with sensible defaults
- Flexible ignore patterns: Support for .catdoublerignore files similar to .gitignore
- Automatic text/binary file detection: Automatically analyzes file contents to identify text files

---

## Installation

Install as a global command:

```bash
npm install -g cat-doubler
```

Or, if you use it in your local project:

```bash
npm install -D cat-doubler
```

## Usage

### Basic command

```bash
cat-doubler [options] <source-dir> <symbol-name>
```

- `<source-dir>`: Directory containing your source project
- `<symbol-name>`: The name to replace throughout the project (any case format: `PascalCase`, `camelCase`, `kebab-case`, `snake_case`, etc.)

### Options

- `-o, --output <path>`: Output directory for generated template (default: `./scaffolder`)
- `--ignore-path <file>`: Path to ignore file (default: `.catdoublerignore`)
- `--ignore-init`: Initialize .catdoublerignore configuration file
- `--log-level <level>`: Set log level (debug, info, warn, error, ignore) (default: `info`)
- `-v, --version`: Display version number
- `-h, --help`: Display help for command

### Examples

Example of converting a React component project in the current directory.

This project is called `MyAwesomePage` and uses symbol names like `MyAwesomePage` and `my-awesome-page` internally.
You can convert this symbol name into a scaffolder that end users can re-specify:

```bash
cat-doubler . MyAwesomePage
```

When no output directory is specified, the template is generated in `./scaffolder` directory by default.
Specify output directory with `--output`:

```bash
cat-doubler . MyAwesomePage --output ./awesome-page-template
```

This will generate a scaffolder project like the following:

```
scaffolder/
├── scaffolder.js    # Standalone CLI
├── package.json     # Minimal package configuration
├── README.md        # Usage instructions
└── templates/       # Project containing placeholders
    ├── src/
    │   ├── __pascal1__.js
    │   │        :
    │   │        :
    │   └── index.html
    └── package.json
```

Note: Using extremely simple names for symbol may cause unintended conversions.

For example, specifying `App` as a symbol name will cause `Application` to be converted as well, in addition to matching instances of `App` in filenames and source code.
As a result, if an end-user names something `FooBar`, it might be replaced with something like `FooBarlication`, preventing correct code generation.

Therefore, when creating a template project, it is advisable to choose a name that is sufficiently complex and unlikely to match partial strings.

### Publishing scaffolder as NPM package

The generated scaffolder is immediately ready to be published as an NPM package:

```bash
# 1. Generate scaffolder from your template project
cat-doubler . MyAwesomePage

# 2. Navigate to the generated scaffolder
cd ./scaffolder
# Note: package.json is already configured with:
# - name: "my-awesome-page-generator"
# - bin field for npx execution
# - version: "1.0.0"

# 3. (Optional) Customize package.json if needed
# Update version, author, repository, etc.

# 4. Publish to npm registry
npm publish --access public
```

Once published as a package, end users can use it directly with `npx`:

```bash
# End users can directly run the scaffolder
npx my-awesome-page-generator
```

## Using the generated scaffolder

The generated scaffolder provides an interactive interface for creating new projects:

### Interactive mode

```bash
# Simply run without arguments
node scaffolder.js

# You'll be prompted for:
Enter the new project name (in PascalCase): MyNewProject
Output directory [./output/my-new-project]: ./my-project

# The scaffolder will then generate your project
Project successfully generated at ./my-project
```

### Command-line arguments (alternative)

You can also provide arguments directly:

```bash
# With positional arguments
node scaffolder.js MyNewProject ./my-project

# Or with named options
node scaffolder.js --symbolName MyNewProject --outputDir ./my-project
```

### Using with npx

Once published to npm, users can run it directly:

```bash
# Interactive mode
npx my-awesome-page-generator

# With arguments
npx my-awesome-page-generator MyNewProject ./my-project
```

---

## Advanced Usage

### Ignore Patterns

Generate a default `.catdoublerignore` configuration file in current directory:

```bash
cat-doubler --ignore-init
```

If the file already exists, it will be skipped.

This file like `.gitignore`, allows you to write glob patterns to exclude specified files and directories from the template project. If the generated scaffolder does not contain the necessary files or contains extra files, you can adjust them with this file.

Here is an example:

```
# Dependencies
node_modules/
*.lock
package-lock.json

# Build outputs
dist/
build/
*.min.js

# IDE files
.vscode/
.idea/
*.swp

# Environment files
.env*
```

Place this file in the same directory as the template project, or specify its location using the `--ignore-path` option.

---

## License

Under MIT.
