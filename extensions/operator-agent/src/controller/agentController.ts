/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as crypto from 'crypto';
import { ActionReceipt, ReceiptStore } from '../executor/receipts';
import { EventStore } from '../storage/eventStore';
import { RunStore } from '../storage/runStore';
import { ApprovalProvider } from '../ui/approvalProvider';
import { OperatorActionResult, OperatorRequest } from '../types';
import { PolicyEngine } from '../policy/policyEngine';
import { ActionPlanner, PlannerContext } from './actionPlanner';
import { ToolRegistry } from '../tools/toolRegistry';
import * as vscode from 'vscode';

export class AgentController {
	constructor(
		private readonly workspaceFolder: string,
		private readonly planner: ActionPlanner,
		private readonly policyEngine: PolicyEngine,
		private readonly toolRegistry: ToolRegistry,
		private readonly approvalProvider: ApprovalProvider,
		private readonly runStore: RunStore,
		private readonly receiptStore: ReceiptStore,
		private readonly eventStore: EventStore,
		private readonly promptContextProvider?: () => Promise<PlannerContext>
	) { }

	async handleRequest(request: OperatorRequest): Promise<OperatorActionResult[]> {
		const runId = crypto.randomUUID();
		this.runStore.start(runId, request.prompt);
		const policy = await this.policyEngine.loadPolicy();
		const plannerContext = await this.loadPromptAdvisoryContext();
		const proposed = this.planner.plan(request, plannerContext);
		const results: OperatorActionResult[] = [];
		for (const proposedAction of proposed) {
			const actionId = crypto.randomUUID();
			const tool = this.toolRegistry.get(proposedAction.action.type);
			const baseReceipt: ActionReceipt = {
				runId,
				actionId,
				actionType: proposedAction.action.type,
				requestedScope: proposedAction.requiredAuthority,
				approvedScope: proposedAction.requiredAuthority,
				startTimestamp: new Date().toISOString(),
				status: 'pending',
				normalizedInputs: proposedAction.action,
				filesTouched: [],
				approval: {
					required: false,
					approved: true,
					actor: 'policy'
				}
			};

			this.receiptStore.append(baseReceipt);
			this.eventStore.append({ runId, timestamp: new Date().toISOString(), kind: 'action.proposed', payload: proposedAction });
			const toolContext = {
				workspaceFolder: this.workspaceFolder,
				policy,
				policyEngine: this.policyEngine,
				executor: this.toolRegistry.executor,
			};

			try {
				await tool.validate(proposedAction.action, toolContext);
			} catch (error) {
				const deniedResult: OperatorActionResult = {
					actionType: proposedAction.action.type,
					status: 'denied',
					message: error instanceof Error ? error.message : String(error),
					filesTouched: []
				};
				this.receiptStore.append({
					...baseReceipt,
					status: 'denied',
					approval: {
						required: false,
						approved: false,
						actor: 'policy',
						reason: deniedResult.message
					},
					endTimestamp: new Date().toISOString(),
					normalizedOutputs: deniedResult
				});
				results.push(deniedResult);
				continue;
			}

			const policyDecision = this.policyEngine.decideAction(policy, proposedAction.action.type);
			if (!policyDecision.allowed) {
				const deniedResult: OperatorActionResult = {
					actionType: proposedAction.action.type,
					status: 'denied',
					message: policyDecision.reason ?? 'Denied by policy',
					filesTouched: []
				};
				this.receiptStore.append({
					...baseReceipt,
					status: 'denied',
					approval: {
						required: false,
						approved: false,
						actor: 'policy',
						reason: policyDecision.reason
					},
					endTimestamp: new Date().toISOString(),
					normalizedOutputs: deniedResult
				});
				results.push(deniedResult);
				continue;
			}

			let approval = { approved: true, reason: 'no approval required' };
			if (policyDecision.requiresApproval) {
				approval = await this.approvalProvider.requestApproval('Operator Action Approval', proposedAction.description);
			}

			if (!approval.approved) {
				const deniedResult: OperatorActionResult = {
					actionType: proposedAction.action.type,
					status: 'denied',
					message: approval.reason,
					filesTouched: []
				};
				this.receiptStore.append({
					...baseReceipt,
					status: 'denied',
					approval: {
						required: true,
						approved: false,
						actor: 'user',
						reason: approval.reason,
					},
					endTimestamp: new Date().toISOString(),
					normalizedOutputs: deniedResult
				});
				results.push(deniedResult);
				continue;
			}

			try {
				const result = await tool.execute(proposedAction.action, toolContext);
				results.push(result);
				this.receiptStore.append({
					...baseReceipt,
					status: result.status,
					endTimestamp: new Date().toISOString(),
					normalizedOutputs: result.output,
					filesTouched: result.filesTouched,
					approval: {
						required: policyDecision.requiresApproval,
						approved: true,
						actor: policyDecision.requiresApproval ? 'user' : 'policy',
						reason: approval.reason
					}
				});
				this.eventStore.append({ runId, timestamp: new Date().toISOString(), kind: 'action.completed', payload: result });
			} catch (error) {
				const errorResult: OperatorActionResult = {
					actionType: proposedAction.action.type,
					status: 'error',
					message: error instanceof Error ? error.message : String(error),
					filesTouched: []
				};
				results.push(errorResult);
				this.receiptStore.append({
					...baseReceipt,
					status: 'error',
					endTimestamp: new Date().toISOString(),
					normalizedOutputs: errorResult,
					approval: {
						required: policyDecision.requiresApproval,
						approved: true,
						actor: policyDecision.requiresApproval ? 'user' : 'policy',
						reason: approval.reason
					}
				});
			}
		}
		this.runStore.finish(runId);
		return results;
	}

	private async loadPromptAdvisoryContext(): Promise<PlannerContext> {
		if (this.promptContextProvider) {
			return this.promptContextProvider();
		}
		const agentUris = await vscode.workspace.findFiles('**/*.agent.md', '**/node_modules/**', 50);
		const skillUris = await vscode.workspace.findFiles('**/SKILL.md', '**/node_modules/**', 50);
		return {
			agentFiles: agentUris.map(uri => uri.fsPath),
			skillFiles: skillUris.map(uri => uri.fsPath)
		};
	}
}
