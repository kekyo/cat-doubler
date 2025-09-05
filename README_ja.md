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

ソースコードを分析し、命名パターンを特定し、異なる名前で新しいプロジェクトをスキャフォールドできる、すぐに使えるCLIツールを生成します。
複雑な設定は不要 - プロジェクトを指定して、置換するシンボル名を指定するだけです。

例えば、`MyAwesomeComponent`というReactコンポーネントライブラリプロジェクトがある場合：

```bash
cat-doubler ./my-component MyAwesomeComponent
```

これにより、任意の名前で新しいコンポーネントを作成できるスキャフォールダーが生成されます。
以下は `NewShinyComponent` と言う名前のプロジェクトを生成します：

```bash
cd ./scaffolder
node index.js NewShinyComponent ./new-shiny-component
```

生成されたCLIは、コードベース全体にわたってすべてのケースバリエーション（`PascalCase`、`camelCase`、`kebab-case`、`snake_case`、`CONSTANT_CASE`）を自動的に処理します。

## 主な機能

- 自動ケース検出: シンボル名のすべてのケースバリエーションを識別して置換
- ゼロコンフィグ: 合理的なデフォルト設定ですぐに動作
- 安全なプレースホルダー生成: 既存コードとの名前衝突を回避
- スタンドアロン出力: 生成されたテンプレートは実行時の依存関係ゼロ
- 柔軟な除外パターン: .gitignoreと同じglob形式の、.catdoublerignoreファイルをサポート
- 柔軟なテキストファイル検出: .gitignoreと同じglob形式の、.catdoublertextファイルをサポート

---

## インストール

グローバルコマンドとしてインストール：

```bash
npm install -g cat-doubler
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
- `--text-path <file>`: テキストファイルパターンのパス（デフォルト：`.catdoublertext`）
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

上記の例ではNPMプロジェクトを示していますが、cat-doublerはあらゆるタイプのプロジェクト（Pythonパッケージ、Goモジュール、Ruby gem、一貫した命名パターンを持つ任意のコードベース）で動作します。

### スキャフォルダーをNPMパッケージとして公開

生成されたスキャフォルダーは、すぐにNPMパッケージとして公開でき、エンドユーザーは`npx`で直接使用できます：

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

# 5. エンドユーザーは、npxコマンドで直接実行できる
npx my-awesome-page-generator
```

## 生成されたスキャフォルダーの使用方法

生成されたスキャフォルダーは、新しいプロジェクトを作成するためのインタラクティブなインターフェースを提供します：

### インタラクティブモード

```bash
# 引数なしで実行する
node index.js

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
node index.js MyNewProject ./my-project

# または名前付きオプションで指定
node index.js --symbolName MyNewProject --outputDir ./my-project
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

### 除外パターン（.catdoublerignore）

`.catdoublerignore`ファイルを作成して、テンプレートからファイルとディレクトリを除外：

```
# 依存関係
node_modules/
*.lock
package-lock.json

# ビルド出力
dist/
build/
*.min.js

# IDEファイル
.vscode/
.idea/
*.swp

# 環境ファイル
.env*
```

### テキストファイルパターン（.catdoublertext）

テキストファイルとして扱う追加のファイル拡張子を指定：

```
# カスタムテキスト拡張子
*.vue
*.jsx
*.tsx
*.graphql
*.prisma
```

### 生成されたテンプレート構造

cat-doublerを実行すると、スタンドアロンのCLIツールが生成されます：

```
output/
├── index.js       # スタンドアロンCLI（依存関係なし）
├── package.json   # 最小限のパッケージ設定
├── README.md      # 使用方法の説明
└── templates/     # プレースホルダーを含むプロジェクト
    ├── src/
    │   └── __pascal1__.js
    └── package.json
```

生成されたCLI：

- 実行時の依存関係ゼロ
- ケース変換関数を内蔵
- ファイルのコピーと変換を処理
- 引数が不足している場合のインタラクティブモードを提供

### 生成されたテンプレートの使用

生成されたCLIを実行：

```bash
# インタラクティブモード
node index.js

# 引数付き
node index.js MyNewProject ./output-dir

# 任意の場所から
npx ./my-template MyNewProject ./output-dir
```

---

## 動作の仕組み

1. **スキャン**: ソースディレクトリを分析して、シンボル名のすべての出現箇所を見つける
2. **ケース検出**: すべてのケースバリエーション（PascalCase、camelCaseなど）を識別
3. **プレースホルダー生成**: 既存のコードと衝突しないユニークなプレースホルダーを作成
4. **テンプレート生成**: プロジェクトをプレースホルダーを含むテンプレートに変換
5. **CLI生成**: テンプレートをインスタンス化できるスタンドアロンのNode.js CLIを作成

このツールは以下を賢く処理します：

- シンボルを含むファイル名とディレクトリ名
- ファイル内容内のシンボルの出現
- バイナリファイル（そのままコピー）
- テキストエンコーディングの検出
- ネストされたディレクトリ構造

---

## 備考

cat-doublerは、任意のプロジェクトを再利用可能なスキャフォールドに変換するプロセスを簡素化するために作成されました。複雑な設定や特定のテンプレート形式を必要とする従来のスキャフォールディングツールとは異なり、cat-doublerは既存のコードをそのまま使用します。

哲学はシンプルです：異なる名前で再利用したい動作するプロジェクトがある場合、cat-doublerは数秒でそれをテンプレートに変換できます。テンプレート構文を学んだり、コードを再構築したりする必要はありません。

## ライセンス

MITライセンスの下で提供されています。
