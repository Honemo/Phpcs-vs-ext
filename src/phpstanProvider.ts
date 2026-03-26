import * as vscode from 'vscode';
import * as path from 'path';
import { runPhpstan, PhpstanResult, PhpstanFileResult, PhpstanMessage } from './phpstanRunner';

// ---------------------------------------------------------------------------
// Tree item types
// ---------------------------------------------------------------------------

export class PhpstanFileItem extends vscode.TreeItem {
    constructor(
        public readonly filePath: string,
        public readonly fileResult: PhpstanFileResult,
        workspaceRoot: string
    ) {
        const relativePath = path.relative(workspaceRoot, filePath);
        super(relativePath, vscode.TreeItemCollapsibleState.Collapsed);

        this.description = `${fileResult.errors} error${fileResult.errors !== 1 ? 's' : ''}`;
        this.tooltip = filePath;
        this.contextValue = 'phpstanFile';

        this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));

        this.command = {
            command: 'phpcs-vs-ext.openFile',
            title: 'Open File',
            arguments: [vscode.Uri.file(filePath)],
        };
    }
}

export class PhpstanMessageItem extends vscode.TreeItem {
    constructor(
        public readonly message: PhpstanMessage,
        public readonly filePath: string
    ) {
        super(
            `${message.line}  ${message.message}`,
            vscode.TreeItemCollapsibleState.None
        );

        this.description = message.ignorable ? 'ignorable' : undefined;
        this.tooltip = new vscode.MarkdownString(
            `**Line ${message.line}**\n\n${message.message}` +
            (message.tip ? `\n\n$(lightbulb) *${message.tip}*` : '') +
            (message.ignorable ? '\n\n*Can be ignored with @phpstan-ignore*' : '')
        );
        this.contextValue = 'phpstanMessage';

        this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));

        // PHPStan does not provide column — navigate to the line, column 1
        this.command = {
            command: 'phpcs-vs-ext.openFileAtLine',
            title: 'Go to Error',
            arguments: [vscode.Uri.file(filePath), message.line, 1],
        };
    }
}

type PhpstanTreeItem = PhpstanFileItem | PhpstanMessageItem;

// ---------------------------------------------------------------------------
// Empty-state placeholder
// ---------------------------------------------------------------------------

class EmptyItem extends vscode.TreeItem {
    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'phpstanEmpty';
    }
}

// ---------------------------------------------------------------------------
// TreeDataProvider
// ---------------------------------------------------------------------------

export class PhpstanProvider implements vscode.TreeDataProvider<PhpstanTreeItem | EmptyItem> {
    private readonly _onDidChangeTreeData =
        new vscode.EventEmitter<PhpstanTreeItem | EmptyItem | undefined | null | void>();

    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private results: PhpstanResult | null = null;
    private running = false;

    // -------------------------------------------------------------------------

    getTreeItem(element: PhpstanTreeItem | EmptyItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: PhpstanTreeItem | EmptyItem): Thenable<(PhpstanTreeItem | EmptyItem)[]> {
        if (!element) {
            return Promise.resolve(this.buildRootItems());
        }

        if (element instanceof PhpstanFileItem) {
            return Promise.resolve(
                element.fileResult.messages.map(
                    (msg) => new PhpstanMessageItem(msg, element.filePath)
                )
            );
        }

        return Promise.resolve([]);
    }

    // -------------------------------------------------------------------------

    async run(): Promise<void> {
        if (this.running) {
            return;
        }
        this.running = true;
        this.results = null;
        this._onDidChangeTreeData.fire();

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Window,
                title: 'Running PHPStan…',
                cancellable: false,
            },
            async () => {
                this.results = await runPhpstan();
                this._onDidChangeTreeData.fire();
            }
        );

        this.running = false;

        if (this.results) {
            const fileCount = Object.keys(this.results.files).length;
            const totalErrors = this.results.totals.file_errors;

            if (fileCount === 0 && this.results.errors.length === 0) {
                vscode.window.showInformationMessage('PHPStan: No errors found.');
            } else {
                vscode.window.showWarningMessage(
                    `PHPStan: ${fileCount} file(s) with issues — ${totalErrors} error(s).`
                );
            }
        }
    }

    clear(): void {
        this.results = null;
        this._onDidChangeTreeData.fire();
    }

    // -------------------------------------------------------------------------

    private buildRootItems(): (PhpstanTreeItem | EmptyItem)[] {
        if (this.running) {
            return [new EmptyItem('Running PHPStan…')];
        }
        if (this.results === null) {
            return [new EmptyItem('Run PHPStan to see results…')];
        }

        const files = Object.entries(this.results.files);
        if (files.length === 0 && this.results.errors.length === 0) {
            return [new EmptyItem('No errors found.')];
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceRoot = workspaceFolders ? workspaceFolders[0].uri.fsPath : '';

        // Sort: most errors first, then alphabetically
        return files
            .sort(([aPath, aResult], [bPath, bResult]) => {
                if (aResult.errors !== bResult.errors) {
                    return bResult.errors - aResult.errors;
                }
                return aPath.localeCompare(bPath);
            })
            .map(([filePath, fileResult]) =>
                new PhpstanFileItem(filePath, fileResult, workspaceRoot)
            );
    }
}
