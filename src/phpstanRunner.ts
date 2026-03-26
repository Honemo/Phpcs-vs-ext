import * as cp from 'child_process';
import * as vscode from 'vscode';

export interface PhpstanMessage {
    message: string;
    line: number;
    ignorable: boolean;
    tip?: string;
}

export interface PhpstanFileResult {
    errors: number;
    messages: PhpstanMessage[];
}

export interface PhpstanResult {
    totals: {
        errors: number;
        file_errors: number;
    };
    files: Record<string, PhpstanFileResult>;
    errors: string[];
}

/**
 * Executes the configured PHPStan command in the workspace root and returns
 * the parsed JSON result. Returns null if no workspace is open, the command
 * cannot be executed, or the output cannot be parsed.
 */
export async function runPhpstan(): Promise<PhpstanResult | null> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('PHPStan: No workspace folder is open.');
        return null;
    }

    const cwd = workspaceFolders[0].uri.fsPath;
    const config = vscode.workspace.getConfiguration('phpcs-vs-ext');
    const command = config.get<string>('phpstanCommand', 'vendor/bin/phpstan analyse --error-format=json --no-progress');

    return new Promise<PhpstanResult | null>((resolve) => {
        // PHPStan exits with code 1 when violations are found — that is not a
        // real error, so we always inspect stdout before giving up.
        console.log(`Running PHPStan command: ${command} (cwd: ${cwd})`);
        cp.exec(command, { cwd }, (error, stdout, stderr) => {
            console.log(`PHPStan command completed with code ${error?.code}`);
            console.log(`PHPStan stdout: ${stdout}`);
            console.log(`PHPStan stderr: ${stderr}`);

            if (!stdout.trim()) {
                const detail = stderr.trim() || (error?.message ?? 'Unknown error');
                vscode.window.showErrorMessage(
                    `PHPStan: Command produced no output.\n${detail}`
                );
                resolve(null);
                return;
            }

            try {
                const jsonStart = stdout.indexOf('{');
                if (jsonStart === -1) {
                    throw new Error('No JSON object found in output');
                }
                const result = JSON.parse(stdout.slice(jsonStart)) as PhpstanResult;
                console.log(`PHPStan parsed ${Object.keys(result.files).length} file(s) with issues.`);
                resolve(result);
            } catch {
                vscode.window.showErrorMessage(
                    `PHPStan: Failed to parse output as JSON. Make sure the command includes --error-format=json.`
                );
                resolve(null);
            }
        });
    });
}
