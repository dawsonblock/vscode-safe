/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OperatorExecutor } from '../executor/executor';
import { PolicyEngine } from '../policy/policyEngine';
import { OperatorPolicy } from '../policy/policySchema';
import { AuthorityLevel, OperatorAction, OperatorActionResult, OperatorActionType } from '../types';

export interface ToolExecutionContext {
	workspaceFolder: string;
	policy: OperatorPolicy;
	policyEngine: PolicyEngine;
	executor: OperatorExecutor;
}

export interface OperatorTool<T extends OperatorAction = OperatorAction> {
	actionType: OperatorActionType;
	requiredAuthority: AuthorityLevel;
	inputSchema: Record<string, unknown>;
	validate(action: T, context: ToolExecutionContext): Promise<void>;
	execute(action: T, context: ToolExecutionContext): Promise<OperatorActionResult>;
}

export class ToolRegistry {
	private readonly _tools = new Map<OperatorActionType, OperatorTool>();
	constructor(readonly executor: OperatorExecutor) { }

	register(tool: OperatorTool): void {
		this._tools.set(tool.actionType, tool);
	}

	get(actionType: OperatorActionType): OperatorTool {
		const tool = this._tools.get(actionType);
		if (!tool) {
			throw new Error(`No tool registered for ${actionType}`);
		}
		return tool;
	}
}
