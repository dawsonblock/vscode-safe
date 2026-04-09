/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AuthorityLevel, McpCallAction, OperatorActionType } from '../types';
import { OperatorTool, ToolExecutionContext } from './toolRegistry';

export const mcpCallTool: OperatorTool<McpCallAction> = {
	actionType: OperatorActionType.McpCall,
	requiredAuthority: AuthorityLevel.CommandExec,
	inputSchema: {
		type: 'object',
		required: ['server', 'tool', 'arguments']
	},
	async validate(action: McpCallAction, context: ToolExecutionContext): Promise<void> {
		if (!context.policyEngine.isMcpAllowed(context.policy, action.server, action.tool)) {
			throw new Error(`MCP call ${action.server}.${action.tool} is not allowlisted`);
		}
	},
	async execute(action: McpCallAction, context: ToolExecutionContext) {
		return context.executor.mcpCall(action.server, action.tool);
	}
};
