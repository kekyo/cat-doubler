# cat-doubler

Universal scaffolder generator that converts any project into reusable templates.

![cat-doubler](images/cat-doubler-120.png)

[![Project Status: WIP – Initial development is in progress, but there has not yet been a stable, usable release suitable for the public.](https://www.repostatus.org/badges/latest/wip.svg)](https://www.repostatus.org/#wip)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## What is this?

Looking for a simple way to turn your existing project into a reusable generator (scaffolder)?
`cat-doubler` is the tool you need.

It analyzes your source code, identifies naming patterns, and generates a ready-to-use CLI tool that can scaffold new projects with different names. No complex configuration required - just point it at your project and specify the symbol name to replace.

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

## Usage

Example of converting a React component project in the current directory.

This project is called `MyAwesomePage` and uses symbol names like `MyAwesomePage` and `my-awesome-page` internally.
You can convert this symbol name into a scaffolder that end users can re-specify:

```bash
# Will output scaffolder project into ./scaffolder
cat-doubler . MyAwesomePage
```

## Using the generated scaffolder

The generated scaffolder provides an interactive interface for creating new projects:

### Interactive mode

```bash
# Simply run without arguments
cd ./scaffolder
node scaffolder.js

# You'll be prompted for:
Enter the new project name (in PascalCase): MyNewProject
Output directory [./output/my-new-project]: ../my-project

# The scaffolder will then generate your project
Project successfully generated at ./my-project
```

[See more features in repository documentation](https://github.com/kekyo/cat-doubler/)

---

## License

Under MIT.
