import * as vscode from 'vscode';
import { PhpcsProvider } from './phpcsProvider';
import { PhpstanProvider } from './phpstanProvider';

export function activate(context: vscode.ExtensionContext): void {
    const phpcsProvider = new PhpcsProvider();
    const phpstanProvider = new PhpstanProvider();

    context.subscriptions.push(
        vscode.window.createTreeView('phpcsResults', {
            treeDataProvider: phpcsProvider,
            showCollapseAll: true,
        }),
        vscode.window.createTreeView('phpstanResults', {
            treeDataProvider: phpstanProvider,
            showCollapseAll: true,
        })
    );

    context.subscriptions.push(
        // PHPCS commands
        vscode.commands.registerCommand('phpcs-vs-ext.run', () => phpcsProvider.run()),
        vscode.commands.registerCommand('phpcs-vs-ext.clear', () => phpcsProvider.clear()),
        vscode.commands.registerCommand('phpcs-vs-ext.fix', () => phpcsProvider.fix()),

        // PHPStan commands
        vscode.commands.registerCommand('phpcs-vs-ext.phpstan.run', () => phpstanProvider.run()),
        vscode.commands.registerCommand('phpcs-vs-ext.phpstan.clear', () => phpstanProvider.clear()),

        // Shared navigation commands
        vscode.commands.registerCommand(
            'phpcs-vs-ext.openFile',
            (uri: vscode.Uri) => {
                vscode.window.showTextDocument(uri);
            }
        ),

        vscode.commands.registerCommand(
            'phpcs-vs-ext.openFileAtLine',
            (uri: vscode.Uri, line: number, column: number) => {
                const pos = new vscode.Position(
                    Math.max(0, line - 1),
                    Math.max(0, column - 1)
                );
                vscode.window.showTextDocument(uri, {
                    selection: new vscode.Range(pos, pos),
                });
            }
        )
    );

    // Run on PHP file save when options are enabled
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((doc) => {
            const config = vscode.workspace.getConfiguration('phpcs-vs-ext');
            if (doc.languageId === 'php') {
                if (config.get<boolean>('runOnSave')) {
                    phpcsProvider.run();
                }
                if (config.get<boolean>('phpstan.runOnSave')) {
                    phpstanProvider.run();
                }
            }
        })
    );
}

export function deactivate(): void {}
