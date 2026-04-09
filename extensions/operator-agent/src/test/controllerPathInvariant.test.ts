/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import 'mocha';
import { AgentController } from '../controller/agentController';
import { ActionPlanner } from '../controller/actionPlanner';
import { OperatorExecutor } from '../executor/executor';
import { ReceiptStore } from '../executor/receipts';
import { PolicyEngine } from '../policy/policyEngine';
import { DEFAULT_POLICY } from '../policy/policySchema';
import { EventStore } from '../storage/eventStore';
import { RunStore } from '../storage/runStore';
import { AuthorityLevel, OperatorActionType, ProposedAction } from '../types';
import { ToolRegistry } from '../tools/toolRegistry';

suite('operator-agent controller path invariants', () => {
	test('stops at validation and does not execute tool', async () => {
		let executeCalled = false;
		const planner = new ActionPlanner();
		const proposedAction: ProposedAction = {
			action: { type: OperatorActionType.ReadFile, filePath: '/tmp/forbidden.txt' },
			requiredAuthority: AuthorityLevel.ReadOnly,
			description: 'read file'
		};
		(planner as unknown as { plan: () => ProposedAction[] }).plan = () => [proposedAction];

		const policyEngine = new PolicyEngine('/workspace');
		(policyEngine as unknown as { loadPolicy: () => Promise<typeof DEFAULT_POLICY> }).loadPolicy = async () => DEFAULT_POLICY;

		const registry = new ToolRegistry(new OperatorExecutor());
		registry.register({
			actionType: OperatorActionType.ReadFile,
			requiredAuthority: AuthorityLevel.ReadOnly,
			inputSchema: {},
			validate: async () => {
				throw new Error('blocked by guard');
			},
			execute: async () => {
				executeCalled = true;
				return {
					actionType: OperatorActionType.ReadFile,
					status: 'ok',
					filesTouched: []
				};
			}
		});

		const controller = new AgentController(
			'/workspace',
			planner,
			policyEngine,
			registry,
			{ requestApproval: async () => ({ approved: true, reason: 'ok' }) } as never,
			new RunStore(),
			new ReceiptStore(),
			new EventStore(),
			async () => ({ agentFiles: [], skillFiles: [] })
		);

		const results = await controller.handleRequest({ prompt: 'read forbidden file' });
		assert.strictEqual(executeCalled, false);
		assert.strictEqual(results.length, 1);
		assert.strictEqual(results[0].status, 'denied');
	});
});
