/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { spawn } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { OperatorActionType, OperatorActionResult, WritePatchAction } from '../types';

const MAX_OUTPUT_CHARS = 8000;

function boundOutput(value: string): string {
	if (value.length <= MAX_OUTPUT_CHARS) {
		return value;
	}
	return `${value.slice(0, MAX_OUTPUT_CHARS)}\n...[truncated]`;
}

export class OperatorExecutor {
	async searchWorkspace(query: string, includePattern: string | undefined, maxResults: number): Promise<OperatorActionResult> {
		const matches: Array<{ filePath: string; lineNumber: number; text: string }> = [];
		await vscode.workspace.findTextInFiles(
			{ pattern: query, isRegExp: false, isCaseSensitive: false, isWordMatch: false },
			{ include: includePattern, maxResults },
			result => {
				if ('preview' in result && result.ranges) {
					const range = Array.isArray(result.ranges) ? result.ranges[0] : result.ranges;
					matches.push({
						filePath: result.uri.fsPath,
						lineNumber: range.start.line + 1,
						text: result.preview.text.trim()
					});
				}
			}
		);
		return {
			actionType: OperatorActionType.SearchWorkspace,
			status: 'ok',
			output: { matches },
			filesTouched: [...new Set(matches.map(m => m.filePath))]
		};
	}

	async readFile(filePath: string, startLine: number | undefined, endLine: number | undefined): Promise<OperatorActionResult> {
		const text = Buffer.from(await vscode.workspace.fs.readFile(vscode.Uri.file(filePath))).toString('utf8');
		const lines = text.split(/\r?\n/);
		const start = Math.max(1, startLine ?? 1);
		const end = Math.min(lines.length, endLine ?? Math.min(lines.length, start + 399));
		const selected = lines.slice(start - 1, end);
		return {
			actionType: OperatorActionType.ReadFile,
			status: 'ok',
			output: {
				filePath,
				startLine: start,
				endLine: end,
				content: selected.join('\n')
			},
			filesTouched: [filePath]
		};
	}

	async writePatch(action: WritePatchAction): Promise<OperatorActionResult> {
		const edit = new vscode.WorkspaceEdit();
		const uri = vscode.Uri.file(action.filePath);
		for (const patchEdit of action.edits) {
			edit.replace(
				uri,
				new vscode.Range(
					new vscode.Position(patchEdit.startLine - 1, patchEdit.startCharacter),
					new vscode.Position(patchEdit.endLine - 1, patchEdit.endCharacter)
				),
				patchEdit.newText
			);
		}
		const success = await vscode.workspace.applyEdit(edit);
		if (!success) {
			return {
				actionType: OperatorActionType.WritePatch,
				status: 'error',
				message: 'Failed to apply workspace edit',
				filesTouched: [action.filePath]
			};
		}
		return {
			actionType: OperatorActionType.WritePatch,
			status: 'ok',
			output: { editCount: action.edits.length },
			filesTouched: [action.filePath]
		};
	}

	async runCommand(command: string, args: string[], cwd: string, timeoutMs: number): Promise<OperatorActionResult> {
		const result = await new Promise<{ exitCode: number; stdout: string; stderr: string }>((resolve, reject) => {
			const child = spawn(command, args, {
				cwd,
				shell: false,
				env: process.env,
			});
			let stdout = '';
			let stderr = '';
			const timer = setTimeout(() => {
				child.kill('SIGTERM');
				reject(new Error(`Command timed out after ${timeoutMs}ms`));
			}, timeoutMs);
			child.stdout.on('data', data => {
				stdout += data.toString();
			});
			child.stderr.on('data', data => {
				stderr += data.toString();
			});
			child.on('error', err => {
				clearTimeout(timer);
				reject(err);
			});
			child.on('close', code => {
				clearTimeout(timer);
				resolve({
					exitCode: code ?? 1,
					stdout,
					stderr
				});
			});
		});

		return {
			actionType: OperatorActionType.RunCommand,
			status: result.exitCode === 0 ? 'ok' : 'error',
			output: {
				exitCode: result.exitCode,
				stdout: boundOutput(result.stdout),
				stderr: boundOutput(result.stderr)
			},
			filesTouched: []
		};
	}

	async gitStatus(repositoryPath: string): Promise<OperatorActionResult> {
		const commandResult = await this.runCommand('git', ['status', '--short', '--branch'], repositoryPath, 30_000);
		return {
			...commandResult,
			actionType: OperatorActionType.GitStatus
		};
	}

	async gitDiff(repositoryPath: string, pathspec?: string): Promise<OperatorActionResult> {
		const args = pathspec ? ['diff', '--', pathspec] : ['diff'];
		const commandResult = await this.runCommand('git', args, repositoryPath, 30_000);
		return {
			...commandResult,
			actionType: OperatorActionType.GitDiff
		};
	}

	async mcpCall(server: string, tool: string): Promise<OperatorActionResult> {
		return {
			actionType: OperatorActionType.McpCall,
			status: 'denied',
			message: `MCP call not enabled for ${server}.${tool}`,
			filesTouched: []
		};
	}

	toCommandLine(command: string, args: readonly string[]): string {
		return [command, ...args].join(' ');
	}

	defaultCwd(): string {
		const folder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
		return folder ?? process.cwd();
	}

	resolveCwd(candidate: string | undefined): string {
		if (!candidate) {
			return this.defaultCwd();
		}
		if (path.isAbsolute(candidate)) {
			return candidate;
		}
		return path.join(this.defaultCwd(), candidate);
	}
}
