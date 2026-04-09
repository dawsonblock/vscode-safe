/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import 'mocha';
import { OperatorExecutor } from '../executor/executor';
import { AuthorityLevel, OperatorActionType } from '../types';
import { ToolRegistry } from '../tools/toolRegistry';

suite('operator-agent toolRegistry', () => {
	test('dispatches by action type', () => {
		const registry = new ToolRegistry(new OperatorExecutor());
		registry.register({
			actionType: OperatorActionType.SearchWorkspace,
			requiredAuthority: AuthorityLevel.ReadOnly,
			inputSchema: {},
			validate: async () => undefined,
			execute: async () => ({
				actionType: OperatorActionType.SearchWorkspace,
				status: 'ok',
				filesTouched: []
			})
		});

		const tool = registry.get(OperatorActionType.SearchWorkspace);
		assert.strictEqual(tool.actionType, OperatorActionType.SearchWorkspace);
	});
});
