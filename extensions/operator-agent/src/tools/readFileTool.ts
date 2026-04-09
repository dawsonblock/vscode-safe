/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { assertPathAllowed } from '../util/pathGuards';
import { AuthorityLevel, OperatorActionType, ReadFileAction } from '../types';
import { OperatorTool, ToolExecutionContext } from './toolRegistry';

export const readFileTool: OperatorTool<ReadFileAction> = {
	actionType: OperatorActionType.ReadFile,
	requiredAuthority: AuthorityLevel.ReadOnly,
	inputSchema: {
		type: 'object',
		required: ['filePath']
	},
	async validate(action: ReadFileAction, context: ToolExecutionContext): Promise<void> {
		const roots = context.policy.roots.map(root => root.replace('${workspaceFolder}', context.workspaceFolder));
		const policy = context.policy as ToolExecutionContext['policy'] & { read_deny?: string[]; write_deny?: string[] };
		const readDeny = policy.read_deny ?? policy.write_deny;
		await assertPathAllowed(action.filePath, context.workspaceFolder, roots, context.policy.read_allow, readDeny);
	},
	async execute(action: ReadFileAction, context: ToolExecutionContext) {
		return context.executor.readFile(action.filePath, action.startLine, action.endLine);
	}
};
