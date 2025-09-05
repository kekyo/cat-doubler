# cat-doubler

あらゆるプロジェクトを再利用可能なジェネレーターに変換する、汎用スキャフォルダージェネレーター

![cat-doubler](images/cat-doubler-120.png)

[![Project Status: WIP – Initial development is in progress, but there has not yet been a stable, usable release suitable for the public.](https://www.repostatus.org/badges/latest/wip.svg)](https://www.repostatus.org/#wip)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/cat-doubler.svg)](https://www.npmjs.com/package/cat-doubler)

---

[English version is here](./README.md)

## これは何？

既存のプロジェクトを再利用可能なジェネレーター（スキャフォールダー）に変換する簡単な方法をお探しですか？
`cat-doubler`はまさにそのためのツールです。

ソースコードを分析し、命名パターンを特定し、異なる名前で新しいプロジェクトをスキャフォールドできる、すぐに使えるCLIツールを生成します。複雑な設定は不要 - プロジェクトを指定して、置換するシンボル名を指定するだけです。

cat-doubler自体はNode.js環境で動作しますが、変換対象のプロジェクトはあらゆるタイプ（Pythonパッケージ、Goモジュール、Ruby gem、Java、.NET、C/C++など、一貫した命名パターンを持つ任意のコードベース）を指定可能です。

例えば、`./my-component` ディレクトリに `MyAwesomeComponent`というReactコンポーネントライブラリプロジェクトがある場合：

```bash
cat-doubler ./my-component MyAwesomeComponent
```

これにより、任意の名前で新しいコンポーネントを作成できるスキャフォールダーが生成されます。
以下は `NewShinyComponent` と言う名前のプロジェクトを生成します：

```bash
cd ./scaffolder
node scaffolder.js NewShinyComponent ./new-shiny-component
```

生成されたCLIは、コードベース全体にわたってすべてのケースバリエーション（`PascalCase`、`camelCase`、`kebab-case`、`snake_case`、`CONSTANT_CASE`）を自動的に処理します。

## 主な機能

- 自動ケース検出: シンボル名のすべてのケースバリエーションを解析して置換
- 任意のターゲットプロジェクトタイプ: あらゆるタイプのプロジェクト、混合プロジェクト、処理系プロジェクトではないテキストファイルの管理にも対応
- スタンドアロン出力: 生成されたテンプレートは実行時の依存関係ゼロ
- ゼロコンフィグ: デフォルト設定ですぐに動作
- 柔軟な除外パターン: .gitignoreと同じglob形式の、.catdoublerignoreファイルをサポート
- 自動テキスト/バイナリファイル検出: ファイル内容を自動的に分析してテキストファイルを識別

---

## インストール

グローバルコマンドとしてインストール：

```bash
npm install -g cat-doubler
```

または、ローカルプロジェクトで使う場合:

```bash
npm install -D cat-doubler
```

## 使用方法

### 基本コマンド

```bash
cat-doubler [options] <source-dir> <symbol-name>
```

- `<source-dir>`: ソースプロジェクトを含むディレクトリ
- `<symbol-name>`: プロジェクト全体で置換する名前（任意のケース形式：`PascalCase`、`camelCase`、`kebab-case`、`snake_case`など）

### オプション

- `-o, --output <path>`: 生成されたテンプレートの出力ディレクトリ（デフォルト：`./scaffolder`）
- `--ignore-path <file>`: 除外ファイルのパス（デフォルト：`.catdoublerignore`）
- `--ignore-init`: `.catdoublerignore`設定ファイルを初期化
- `--log-level <level>`: ログレベルを設定（debug、info、warn、error、ignore）（デフォルト：`info`）
- `-v, --version`: バージョン番号を表示
- `-h, --help`: コマンドのヘルプを表示

### 実行例

カレントディレクトリの、Reactコンポーネントプロジェクトを変換する例です。

このプロジェクトは`MyAwsomePage`と呼ばれており、内部で`MyAwsomePage`や`my-awsome-page`などのシンボル名を使用しています。
このシンボル名を、エンドユーザーが再指定可能なスキャフォールダーに変換できます:

```bash
cat-doubler . MyAwsomePage
```

出力ディレクトリを指定しない場合、テンプレートはデフォルトで`./scaffolder`ディレクトリに生成されます。
出力ディレクトリは、`--output`で指定します:

```bash
cat-doubler . MyAwsomePage --output ./awsome-page-template
```

これにより、以下のようなスキャフォールダープロジェクトが生成されます:

```
scaffolder/
├── scaffolder.js    # スタンドアロンCLI
├── package.json     # 最小限のパッケージ設定
├── README.md        # 使用方法の説明
└── templates/       # プレースホルダーを含むプロジェクト
    ├── src/
    │   ├── __pascal1__.js
    │   │        :
    │   │        :
    │   └── index.html
    └── package.json
```

注意: シンボル名に極端に単純な名称を使用すると、意図しない変換が起きる可能性があります。

例えば、シンボル名に `App` を指定すると、ファイル名やソースコード中の `App` に該当する箇所の他に、`Application` も変換対象になってしまいます。
その結果、エンドユーザーが `FooBar` と命名すると、`FooBarlication` のような置換が発生してしまい、正しいコードが生成されないでしょう。

従って、テンプレートとなるプロジェクトを作るときには、その名称をある程度複雑で部分一致しないような名称にすることが望ましいでしょう。

### スキャフォルダーをNPMパッケージとして公開

生成されたスキャフォルダーは、すぐにNPMパッケージとして公開できます:

```bash
# 1. テンプレートプロジェクトからスキャフォルダーを生成
cat-doubler . MyAwsomePage

# 2. 生成されたスキャフォルダーに移動
cd ./scaffolder
# 注意：package.jsonは以下の内容で既に設定済み：
# - name: "my-awesome-page-generator"
# - npx実行用のbinフィールド
# - version: "1.0.0"

# 3.（オプション）必要に応じてpackage.jsonをカスタマイズ
# version、author、repositoryなどを更新

# 4. npmレジストリに公開
npm publish --access public
```

パッケージとして公開すれば、エンドユーザーは`npx`で直接使用できます：

```bash
# エンドユーザーは、npxコマンドで直接実行できる
npx my-awesome-page-generator
```

## 生成されたスキャフォルダーの使用方法

生成されたスキャフォルダーは、新しいプロジェクトを作成するためのインタラクティブなインターフェースを提供します：

### インタラクティブモード

```bash
# 引数なしで実行する
node scaffolder.js

# 以下のプロンプトが表示されます：
Enter the new project name (in PascalCase): MyNewProject
Output directory [./output/my-new-project]: ./my-project

# スキャフォルダーがプロジェクトを生成します
Project successfully generated at ./my-project
```

### コマンドライン引数（代替方法）

引数を直接指定することもできます：

```bash
# 位置引数で指定
node scaffolder.js MyNewProject ./my-project

# または名前付きオプションで指定
node scaffolder.js --symbolName MyNewProject --outputDir ./my-project
```

### npxでの使用

npmに公開後、ユーザーは直接実行できます：

```bash
# インタラクティブモード
npx my-awesome-page-generator

# 引数付き
npx my-awesome-page-generator MyNewProject ./my-project
```

---

## 高度な使い方

### 除外パターン

カレントディレクトリに、デフォルトの`.catdoublerignore`ファイルを生成します：

```bash
cat-doubler --ignore-init
```

ファイルが既に存在する場合はスキップされます。

このファイルは、`.gitignore`と同じように、グロブパターンを記述し、テンプレートプロジェクトから、指定されたファイルとディレクトリを除外出来ます。もし、生成したスキャフォールダーに、必要なファイルを含んでいなかったり余計なファイルが含まれていた場合は、このファイルで調整すると良いでしょう。

以下に例を示します:

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

---

## ライセンス

Under MIT.
