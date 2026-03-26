import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import { runPhpcs, PhpcsResult, PhpcsFileResult, PhpcsMessage } from './phpcsRunner';

// ---------------------------------------------------------------------------
// Tree item types
// ---------------------------------------------------------------------------

export class FileItem extends vscode.TreeItem {
    constructor(
        public readonly filePath: string,
        public readonly fileResult: PhpcsFileResult,
        workspaceRoot: string
    ) {
        const relativePath = path.relative(workspaceRoot, filePath);
        super(relativePath, vscode.TreeItemCollapsibleState.Collapsed);

        const parts: string[] = [];
        if (fileResult.errors > 0) {
            parts.push(`${fileResult.errors} error${fileResult.errors > 1 ? 's' : ''}`);
        }
        if (fileResult.warnings > 0) {
            parts.push(`${fileResult.warnings} warning${fileResult.warnings > 1 ? 's' : ''}`);
        }
        this.description = parts.join(', ');
        this.tooltip = filePath;
        this.contextValue = 'phpcsFile';

        this.iconPath = fileResult.errors > 0
            ? new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'))
            : new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));

        // Clicking the file row opens the file
        this.command = {
            command: 'phpcs-vs-ext.openFile',
            title: 'Open File',
            arguments: [vscode.Uri.file(filePath)],
        };
    }
}

export class MessageItem extends vscode.TreeItem {
    constructor(
        public readonly message: PhpcsMessage,
        public readonly filePath: string
    ) {
        super(
            `${message.line}:${message.column}  ${message.message}`,
            vscode.TreeItemCollapsibleState.None
        );

        this.description = message.source;
        this.tooltip = new vscode.MarkdownString(
            `**${message.type}** — Line ${message.line}, Col ${message.column}\n\n` +
            `${message.message}\n\n` +
            `*${message.source}*` +
            (message.fixable ? '\n\n$(wrench) Auto-fixable' : '')
        );
        this.contextValue = 'phpcsMessage';

        this.iconPath = message.type === 'ERROR'
            ? new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'))
            : new vscode.ThemeIcon('warning', new vscode.ThemeColor('editorWarning.foreground'));

        // Clicking the message row navigates to the exact line/column
        this.command = {
            command: 'phpcs-vs-ext.openFileAtLine',
            title: 'Go to Error',
            arguments: [vscode.Uri.file(filePath), message.line, message.column],
        };
    }
}

type PhpcsTreeItem = FileItem | MessageItem;

// ---------------------------------------------------------------------------
// Empty-state placeholder
// ---------------------------------------------------------------------------

class EmptyItem extends vscode.TreeItem {
    constructor(label: string) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'phpcsEmpty';
    }
}

// ---------------------------------------------------------------------------
// TreeDataProvider
// ---------------------------------------------------------------------------

export class PhpcsProvider implements vscode.TreeDataProvider<PhpcsTreeItem | EmptyItem> {
    private readonly _onDidChangeTreeData =
        new vscode.EventEmitter<PhpcsTreeItem | EmptyItem | undefined | null | void>();

    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private results: PhpcsResult | null = null;
    private running = false;
    private fixing = false;

    // -------------------------------------------------------------------------

    getTreeItem(element: PhpcsTreeItem | EmptyItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: PhpcsTreeItem | EmptyItem): Thenable<(PhpcsTreeItem | EmptyItem)[]> {
        if (!element) {
            return Promise.resolve(this.buildRootItems());
        }

        if (element instanceof FileItem) {
            return Promise.resolve(
                element.fileResult.messages.map(
                    (msg) => new MessageItem(msg, element.filePath)
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
                title: 'Running PHPCS…',
                cancellable: false,
            },
            async () => {
                this.results = await runPhpcs();
                this._onDidChangeTreeData.fire();
            }
        );

        this.running = false;

        if (this.results) {
            const { errors, warnings } = this.results.totals;
            const fileCount = Object.keys(this.results.files).length;

            if (fileCount === 0) {
                vscode.window.showInformationMessage('PHPCS: No violations found.');
            } else {
                vscode.window.showWarningMessage(
                    `PHPCS: ${fileCount} file(s) with issues — ${errors} error(s), ${warnings} warning(s).`
                );
            }
        }
    }

    async fix(): Promise<void> {
        const config = vscode.workspace.getConfiguration('phpcs-vs-ext');
        const fixCommand = config.get<string>('phpcsfix', 'vendor/bin/phpcbf --report=json .');

        if (!fixCommand) {
            vscode.window.showErrorMessage('PHPCS: No fix command configured.');
            return;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('PHPCS: No workspace folder is open.');
            return;
        }
        const cwd = workspaceFolders[0].uri.fsPath;

        this.fixing = true;
        this.results = null;
        this._onDidChangeTreeData.fire();

        try {
            await new Promise<void>((resolve, reject) => {
                cp.exec(fixCommand, { cwd }, (error, stdout, stderr) => {
                    // phpcbf exit codes: 0 = nothing to fix, 1 = fixes applied,
                    // 2 = fixes applied but errors remain — all are success cases.
                    // Only exit code 3+ indicates a real failure.
                    const code = (error as (NodeJS.ErrnoException & { code?: number }) | null)?.code;
                    if (error && (typeof code !== 'number' || code >= 3)) {
                        reject(new Error(stderr.trim() || error.message));
                    } else {
                        resolve();
                    }
                });
            });
            this.fixing = false;
            vscode.window.showInformationMessage('PHPCS: Auto-fix completed. Refreshing results…');
            await this.run();
        } catch (err) {
            this.fixing = false;
            this._onDidChangeTreeData.fire();
            vscode.window.showErrorMessage(`PHPCS: Auto-fix failed.\n${err instanceof Error ? err.message : String(err)}`);
        }
    }

    clear(): void {
        this.results = null;
        this._onDidChangeTreeData.fire();
    }

    // -------------------------------------------------------------------------

    private buildRootItems(): (PhpcsTreeItem | EmptyItem)[] {
        if (this.fixing) {
            return [new EmptyItem('Running PHPCBF…')];
        }
        if (this.running) {
            return [new EmptyItem('Running PHPCS…')];
        }
        if (this.results === null) {
            return [new EmptyItem('Run PHPCS to see results…')];
        }

        const files = Object.entries(this.results.files);
        if (files.length === 0) {
            return [new EmptyItem('No violations found.')];
        }
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceRoot = workspaceFolders ? workspaceFolders[0].uri.fsPath : '';

        // Exclude files with no violations (PHPCS includes them in its output)
        const filesWithIssues = files.filter(
            ([, fileResult]) => fileResult.errors > 0 || fileResult.warnings > 0
        );

        if (filesWithIssues.length === 0) {
            return [new EmptyItem('No violations found.')];
        }

        // Sort: files with errors first, then warnings; alphabetically within each group
        return filesWithIssues
            .sort(([aPath, aResult], [bPath, bResult]) => {
                if (aResult.errors !== bResult.errors) {
                    return bResult.errors - aResult.errors;
                }
                return aPath.localeCompare(bPath);
            })
            .map(([filePath, fileResult]) => new FileItem(
                path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath),
                fileResult,
                workspaceRoot
            ));
    }
}
