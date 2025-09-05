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

- Automatic case detection: Identifies and replaces all case variations of your symbol name
- Zero configuration: Works out of the box with sensible defaults
- Safe placeholder generation: Avoids naming conflicts with existing code
- Standalone output: Generated templates have zero runtime dependencies
- Flexible ignore patterns: Support for .catdoublerignore files similar to .gitignore
- Flexible text file detection: Pattern-based, same as .gitignore globbing

---

## Installation

Install as a global command:

```bash
npm install -g cat-doubler
```

[See more features in repository documentation](https://github.com/kekyo/cat-doubler/)

---

## License

Under MIT.
