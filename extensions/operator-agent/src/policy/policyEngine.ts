/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { CommandRiskLevel, NormalizedCommand, OperatorActionType } from '../types';
import { matchesAnyPattern } from '../util/patternMatch';
import { DEFAULT_POLICY, OperatorPolicy } from './policySchema';

const DANGEROUS_COMMAND_TOKENS = ['&&', '||', '|', '>', '<', '$(', '`', ';'];
const CONTROL_PATTERN = /(^|[^\\])(&&|\|\||\||>|<|`|;|\$\(|\n|\r)/;

export interface PolicyDecision {
	allowed: boolean;
	reason?: string;
	requiresApproval: boolean;
}

export class PolicyEngine {
	constructor(private readonly workspaceFolder: string) { }

	async loadPolicy(): Promise<OperatorPolicy> {
		const policyUri = vscode.Uri.file(path.join(this.workspaceFolder, '.vscode', 'operator-policy.json'));
		try {
			const bytes = await vscode.workspace.fs.readFile(policyUri);
			const parsed = JSON.parse(Buffer.from(bytes).toString('utf8')) as Partial<OperatorPolicy>;
			return {
				...DEFAULT_POLICY,
				...parsed,
			};
		} catch {
			return DEFAULT_POLICY;
		}
	}

	normalizeCommand(actionCommand: string, args: readonly string[] | undefined, cwd: string): NormalizedCommand {
		const commandInput = actionCommand.trim();
		if (!commandInput) {
			throw new Error('Command cannot be empty');
		}

		const shellControlDetected = CONTROL_PATTERN.test(commandInput);
		let tokens: string[];
		if (args && args.length > 0) {
			tokens = [commandInput, ...args.map(a => a.trim()).filter(Boolean)];
		} else {
			tokens = this.tokenizeCommandLine(commandInput);
		}

		if (tokens.length === 0) {
			throw new Error('Command cannot be empty');
		}

		const executable = tokens[0];
		const normalizedArgs = tokens.slice(1);
		const joined = tokens.join(' ').replace(/\s+/g, ' ').trim();
		const riskLevel = this.classifyRisk(joined);
		return {
			executable,
			args: normalizedArgs,
			original: commandInput,
			normalized: joined,
			cwd,
			riskLevel,
			tokens,
			shellControlDetected,
		};
	}

	classifyRisk(normalizedCommand: string): CommandRiskLevel {
		if (DANGEROUS_COMMAND_TOKENS.some(token => normalizedCommand.includes(token))) {
			return CommandRiskLevel.High;
		}
		const highRiskPrefixes = ['npm install', 'pnpm add', 'yarn add', 'curl ', 'wget ', 'ssh ', 'scp ', 'docker ', 'kubectl ', 'terraform '];
		if (highRiskPrefixes.some(prefix => normalizedCommand.startsWith(prefix))) {
			return CommandRiskLevel.High;
		}
		return CommandRiskLevel.Low;
	}

	private tokenizeCommandLine(value: string): string[] {
		const tokens: string[] = [];
		let current = '';
		let inSingleQuote = false;
		let inDoubleQuote = false;
		let escaped = false;

		for (const ch of value) {
			if (escaped) {
				current += ch;
				escaped = false;
				continue;
			}

			if (ch === '\\') {
				escaped = true;
				continue;
			}

			if (ch === '\'' && !inDoubleQuote) {
				inSingleQuote = !inSingleQuote;
				continue;
			}
			if (ch === '"' && !inSingleQuote) {
				inDoubleQuote = !inDoubleQuote;
				continue;
			}

			if (!inSingleQuote && !inDoubleQuote && /\s/.test(ch)) {
				if (current.length > 0) {
					tokens.push(current);
					current = '';
				}
				continue;
			}

			current += ch;
		}

		if (escaped || inSingleQuote || inDoubleQuote) {
			throw new Error('Command has invalid quoting or escaping');
		}
		if (current.length > 0) {
			tokens.push(current);
		}
		return tokens;
	}

	decideCommand(policy: OperatorPolicy, normalized: NormalizedCommand): PolicyDecision {
		if (normalized.shellControlDetected) {
			return { allowed: false, requiresApproval: false, reason: 'command contains disallowed shell control syntax' };
		}
		if (matchesAnyPattern(normalized.normalized, policy.command_deny, this.workspaceFolder)) {
			return { allowed: false, requiresApproval: false, reason: 'command denied by policy' };
		}
		if (!matchesAnyPattern(normalized.normalized, policy.command_allow, this.workspaceFolder)) {
			return { allowed: false, requiresApproval: false, reason: 'command not in allowlist' };
		}
		return {
			allowed: true,
			requiresApproval: policy.approval_mode === 'all-writes-and-all-commands',
			reason: 'command allowed'
		};
	}

	decideAction(policy: OperatorPolicy, actionType: OperatorActionType): PolicyDecision {
		const requiresApproval = policy.approval_mode === 'all-writes-and-all-commands' && (actionType === OperatorActionType.WritePatch || actionType === OperatorActionType.RunCommand);
		return { allowed: true, requiresApproval };
	}

	isMcpAllowed(policy: OperatorPolicy, server: string, tool: string): boolean {
		if (!policy.mcp_servers_allow.includes(server)) {
			return false;
		}
		if (policy.mcp_tools_allow.length === 0) {
			return false;
		}
		return policy.mcp_tools_allow.includes(`${server}.${tool}`) || policy.mcp_tools_allow.includes(tool);
	}
}
