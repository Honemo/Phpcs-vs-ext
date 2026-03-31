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

### 1 — Open a PHP project

Open any folder containing PHP files in VS Code (`File > Open Folder…`). The extension activates automatically.

### 2 — Access the sidebar

Click the **PHP Linters** icon in the activity bar (left side of the window). Two panels appear:

- **PHPCS Results** — violations reported by PHP_CodeSniffer
- **PHPStan Results** — errors reported by PHPStan

### 3 — Run an analysis

Each panel has its own toolbar with three action buttons:

**PHPCS panel:**

| Button | Icon | Action |
|---|---|---|
| Run | `▶` | Launch the analysis |
| Fix | `⚡` | Auto-fix violations using PHPCBF |
| Clear | `⊗` | Reset the panel and discard current results |

**PHPStan panel:**

| Button | Icon | Action |
|---|---|---|
| Run | `▶` | Launch the analysis |
| Clear | `⊗` | Reset the panel and discard current results |

Click **▶** in either panel to start the corresponding tool. The results appear within seconds once the command completes.

### 4 — Read the results

The results are displayed as a file tree. Only files that contain at least one error or warning are listed.

```
📁 src/Controller/HomeController.php       3 errors
   ├ 12:5   Missing doc comment for function index()
   ├ 27:1   Line exceeds 120 characters
   └ 34:9   Unused variable $data

📁 src/Model/User.php                      1 error
   └ 8:14   Missing member variable doc comment
```

Each file node shows the total number of violations. Click the arrow to expand or collapse it.

### 5 — Navigate to an error

| Click target | Result |
|---|---|
| A **file row** | Opens the file in the editor |
| An **error row** | Opens the file and moves the cursor to the exact line and column |

This lets you jump directly from a violation in the list to the offending line in your code, without any manual searching.

### 6 — Run on save (optional)

Enable automatic re-analysis whenever you save a PHP file by activating the **Run on Save** option in the settings (see [Configuration](#configuration) below). This keeps the results panel always up to date as you work.

---

## Configuration

Open `File > Preferences > Settings` and search for `phpcs-vs-ext` to access all options.

| Setting | Default | Description |
|---|---|---|
| `phpcs-vs-ext.command` | `phpcs --report=json .` | Full PHPCS command. Must include `--report=json`. |
| `phpcs-vs-ext.phpcsfix` | `vendor/bin/phpcbf --report=json .` | Command used to auto-fix issues via PHPCBF. |
| `phpcs-vs-ext.runOnSave` | `false` | Re-run PHPCS automatically on every PHP file save. |
| `phpcs-vs-ext.phpstanCommand` | `vendor/bin/phpstan analyse --error-format=json --no-progress` | Full PHPStan command. Must include `--error-format=json`. |
| `phpcs-vs-ext.phpstan.runOnSave` | `false` | Re-run PHPStan automatically on every PHP file save. |

> The commands run from the **workspace root folder**. Make sure the binaries are reachable either via `vendor/bin/` or your system `PATH`.

### Custom command examples

```json
// WordPress coding standard
"phpcs-vs-ext.command": "vendor/bin/phpcs --standard=WordPress --report=json ."

// PHPStan on a specific level and folder
"phpcs-vs-ext.phpstanCommand": "vendor/bin/phpstan analyse --level=6 --error-format=json --no-progress src/"

// Global PHPCS binary targeting a subfolder
"phpcs-vs-ext.command": "phpcs --report=json src/"

// Using a phpstan.neon config file
"phpcs-vs-ext.phpstanCommand": "vendor/bin/phpstan analyse --error-format=json --no-progress --configuration=phpstan.neon"
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
