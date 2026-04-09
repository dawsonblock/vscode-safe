/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AuthorityLevel, OperatorActionType, RunCommandAction } from '../types';
import { OperatorTool, ToolExecutionContext } from './toolRegistry';

export const runCommandTool: OperatorTool<RunCommandAction> = {
	actionType: OperatorActionType.RunCommand,
	requiredAuthority: AuthorityLevel.CommandExec,
	inputSchema: {
		type: 'object',
		required: ['command']
	},
	async validate(action: RunCommandAction, context: ToolExecutionContext): Promise<void> {
		const cwd = context.executor.resolveCwd(action.cwd);
		const normalized = context.policyEngine.normalizeCommand(action.command, action.args, cwd);
		const decision = context.policyEngine.decideCommand(context.policy, normalized);
		if (!decision.allowed) {
			throw new Error(`Command blocked by policy: ${decision.reason}`);
		}
	},
	async execute(action: RunCommandAction, context: ToolExecutionContext) {
		const cwd = context.executor.resolveCwd(action.cwd);
		const normalized = context.policyEngine.normalizeCommand(action.command, action.args, cwd);
		return context.executor.runCommand(normalized.executable, normalized.args, normalized.cwd, action.timeoutMs ?? 60_000);
	}
};
