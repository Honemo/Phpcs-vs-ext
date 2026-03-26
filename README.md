# PHP Linters — VS Code Extension

A Visual Studio Code extension that runs **PHP_CodeSniffer** and **PHPStan** in your current workspace and displays the results directly in the sidebar, with one-click navigation to every error.

---

## Features

- **Two dedicated views** in the activity bar sidebar: one for PHPCS, one for PHPStan
- **File tree**: only files containing errors or warnings are displayed
- **Error details**: each file node is expandable to list all its violations
- **Direct navigation**: clicking a file opens it in the editor; clicking an error opens it at the exact line (and column)
- **Run on save**: option to automatically re-run the analysis whenever a PHP file is saved

---

## Installation

### From the VSIX file (recommended)

Download the latest `phpcs-vs-ext-x.x.x.vsix` from the [Releases](https://github.com/Honemo/Phpcs-vs-ext/releases) page, then install it in one of the following ways:

**Via the VS Code command palette:**
1. Open the command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run **Extensions: Install from VSIX…**
3. Select the downloaded `.vsix` file

**Via the terminal:**
```bash
code --install-extension phpcs-vs-ext-0.1.0.vsix
```

### From source

```bash
git clone https://github.com/Honemo/Phpcs-vs-ext.git
cd Phpcs-vs-ext
npm install
npx @vscode/vsce package
code --install-extension phpcs-vs-ext-0.1.0.vsix
```

---

## Requirements

| Tool | Installation |
|---|---|
| PHP_CodeSniffer | `composer global require squizlabs/php_codesniffer` or `vendor/bin/phpcs` |
| PHPStan | `composer global require phpstan/phpstan` or `vendor/bin/phpstan` |

The commands must be available in your `PATH` or via `vendor/bin/` at the workspace root.

---

## Usage

1. Open a PHP folder in VS Code
2. Click the **PHP Linters** icon in the activity bar
3. Use the buttons in each view's title bar:

| Button | Action |
|---|---|
| ▶ | Run the analysis |
| ↺ | Re-run the analysis |
| ⊗ | Clear results |

### Navigating results

```
📁 includes/Models/Media.php          8 errors
   ├ 6:17   Missing member variable doc comment
   ├ 8:19   Missing member variable doc comment
   └ 18:12  Missing doc comment for function __construct()
```

- **Click a file row** → opens the file
- **Click an error row** → opens the file at the exact line and column

---

## Configuration

Settings are available under `File > Preferences > Settings` by searching for `phpcs-vs-ext`.

| Setting | Default | Description |
|---|---|---|
| `phpcs-vs-ext.command` | `vendor/bin/phpcs --report=json .` | PHPCS command (must include `--report=json`) |
| `phpcs-vs-ext.runOnSave` | `false` | Re-run PHPCS on every PHP file save |
| `phpcs-vs-ext.phpstanCommand` | `vendor/bin/phpstan analyse --error-format=json --no-progress` | PHPStan command (must include `--error-format=json`) |
| `phpcs-vs-ext.phpstan.runOnSave` | `false` | Re-run PHPStan on every PHP file save |

### Custom command examples

```json
// WordPress with a custom standard
"phpcs-vs-ext.command": "vendor/bin/phpcs --standard=WordPress --report=json ."

// PHPStan with a specific analysis level
"phpcs-vs-ext.phpstanCommand": "vendor/bin/phpstan analyse --level=5 --error-format=json --no-progress src/"

// Global binary targeting a specific folder
"phpcs-vs-ext.command": "phpcs --report=json src/"
```

---

## Development

```bash
git clone https://github.com/Honemo/Phpcs-vs-ext.git
cd Phpcs-vs-ext
npm install
```

Press **F5** in VS Code to launch the Extension Development Host.

The TypeScript watcher starts automatically via the default build task.

---

## License

MIT
