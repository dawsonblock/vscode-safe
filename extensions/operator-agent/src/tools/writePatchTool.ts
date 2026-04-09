/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { assertPathAllowed } from '../util/pathGuards';
import { AuthorityLevel, OperatorActionType, WritePatchAction } from '../types';
import { OperatorTool, ToolExecutionContext } from './toolRegistry';

export const writePatchTool: OperatorTool<WritePatchAction> = {
	actionType: OperatorActionType.WritePatch,
	requiredAuthority: AuthorityLevel.RepoWrite,
	inputSchema: {
		type: 'object',
		required: ['filePath', 'edits']
	},
	async validate(action: WritePatchAction, context: ToolExecutionContext): Promise<void> {
		const roots = context.policy.roots.map(root => root.replace('${workspaceFolder}', context.workspaceFolder));
		await assertPathAllowed(action.filePath, context.workspaceFolder, roots, context.policy.write_allow, context.policy.write_deny);
		if (action.edits.length === 0) {
			throw new Error('write_patch requires at least one edit');
		}
	},
	async execute(action: WritePatchAction, context: ToolExecutionContext) {
		return context.executor.writePatch(action);
	}
};
