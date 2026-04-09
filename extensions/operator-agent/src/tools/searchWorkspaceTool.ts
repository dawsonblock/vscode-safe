/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AuthorityLevel, OperatorActionType, SearchWorkspaceAction } from '../types';
import { OperatorTool, ToolExecutionContext } from './toolRegistry';

export const searchWorkspaceTool: OperatorTool<SearchWorkspaceAction> = {
	actionType: OperatorActionType.SearchWorkspace,
	requiredAuthority: AuthorityLevel.ReadOnly,
	inputSchema: {
		type: 'object',
		required: ['query']
	},
	async validate(action: SearchWorkspaceAction): Promise<void> {
		if (!action.query.trim()) {
			throw new Error('Search query cannot be empty');
		}
	},
	async execute(action: SearchWorkspaceAction, context: ToolExecutionContext) {
		return context.executor.searchWorkspace(action.query, action.includePattern, Math.min(action.maxResults ?? 100, 200));
	}
};
