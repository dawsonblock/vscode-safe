/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AuthorityLevel, GitStatusAction, OperatorActionType } from '../types';
import { OperatorTool, ToolExecutionContext } from './toolRegistry';

export const gitStatusTool: OperatorTool<GitStatusAction> = {
	actionType: OperatorActionType.GitStatus,
	requiredAuthority: AuthorityLevel.ReadOnly,
	inputSchema: {
		type: 'object',
		properties: {
			repositoryPath: { type: 'string' }
		}
	},
	async validate(): Promise<void> {
		return;
	},
	async execute(action: GitStatusAction, context: ToolExecutionContext) {
		const repositoryPath = action.repositoryPath ?? context.workspaceFolder;
		return context.executor.gitStatus(repositoryPath);
	}
};
