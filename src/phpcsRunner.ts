import * as cp from 'child_process';
import * as vscode from 'vscode';

export interface PhpcsMessage {
    message: string;
    source: string;
    severity: number;
    type: 'ERROR' | 'WARNING';
    line: number;
    column: number;
    fixable: boolean;
}

export interface PhpcsFileResult {
    errors: number;
    warnings: number;
    messages: PhpcsMessage[];
}

export interface PhpcsResult {
    totals: {
        errors: number;
        warnings: number;
        fixable: number;
    };
    files: Record<string, PhpcsFileResult>;
}

/**
 * Executes the configured PHPCS command in the workspace root and returns
 * the parsed JSON result. Returns null if no workspace is open, the command
 * cannot be executed, or the output cannot be parsed.
 */
export async function runPhpcs(): Promise<PhpcsResult | null> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('PHPCS: No workspace folder is open.');
        return null;
    }

    const cwd = workspaceFolders[0].uri.fsPath;
    const config = vscode.workspace.getConfiguration('phpcs-vs-ext');
    const command = config.get<string>('command', 'vendor/bin/phpcs --report=json .');

    return new Promise<PhpcsResult | null>((resolve) => {
        // PHPCS exits with code 1 when violations are found — that is not a
        // real error, so we always inspect stdout before giving up.
        cp.exec(command, { cwd }, (error, stdout, stderr) => {
            if (!stdout.trim()) {
                const detail = stderr.trim() || (error?.message ?? 'Unknown error');
                vscode.window.showErrorMessage(
                    `PHPCS: Command produced no output.\n${detail}`
                );
                resolve(null);
                return;
            }

            try {
                const jsonStart = stdout.indexOf('{');
                const jsonEnd = stdout.lastIndexOf('}');
                if (jsonStart === -1 || jsonEnd === -1) {
                    throw new Error('No JSON object found in output');
                }
                const result = JSON.parse(stdout.slice(jsonStart, jsonEnd + 1)) as PhpcsResult;
                resolve(result);
            } catch {
                vscode.window.showErrorMessage(
                    `PHPCS: Failed to parse output as JSON. Make sure the command includes --report=json.\nCommand: ${command}`
                );
                resolve(null);
            }
        });
    });
}
