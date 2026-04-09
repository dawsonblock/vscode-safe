/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AuthorityLevel, GitDiffAction, OperatorActionType } from '../types';
import { OperatorTool, ToolExecutionContext } from './toolRegistry';

export const gitDiffTool: OperatorTool<GitDiffAction> = {
	actionType: OperatorActionType.GitDiff,
	requiredAuthority: AuthorityLevel.ReadOnly,
	inputSchema: {
		type: 'object',
		properties: {
			repositoryPath: { type: 'string' },
			pathspec: { type: 'string' }
		}
	},
	async validate(): Promise<void> {
		return;
	},
	async execute(action: GitDiffAction, context: ToolExecutionContext) {
		const repositoryPath = action.repositoryPath ?? context.workspaceFolder;
		return context.executor.gitDiff(repositoryPath, action.pathspec);
	}
};
