/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { requiredAuthorityForAction } from '../policy/capabilityGrants';
import { OperatorAction, OperatorActionType, OperatorRequest, ProposedAction } from '../types';

export interface PlannerContext {
	agentFiles: string[];
	skillFiles: string[];
}

function actionFromJsonCandidate(prompt: string): OperatorAction | undefined {
	try {
		const parsed = JSON.parse(prompt) as OperatorAction;
		if (!parsed.type) {
			return undefined;
		}
		return parsed;
	} catch {
		return undefined;
	}
}

export class ActionPlanner {
	plan(request: OperatorRequest, plannerContext: PlannerContext): ProposedAction[] {
		const fromJson = actionFromJsonCandidate(request.prompt);
		if (fromJson) {
			return [
				{
					action: fromJson,
					requiredAuthority: requiredAuthorityForAction(fromJson.type),
					description: this.describe(fromJson, plannerContext)
				}
			];
		}

		const lower = request.prompt.toLowerCase();
		if (lower.startsWith('search ')) {
			const query = request.prompt.slice('search '.length).trim();
			return [this.wrap({ type: OperatorActionType.SearchWorkspace, query }, plannerContext)];
		}
		if (lower.startsWith('read ')) {
			const filePath = request.prompt.slice('read '.length).trim();
			return [this.wrap({ type: OperatorActionType.ReadFile, filePath }, plannerContext)];
		}
		if (lower.startsWith('git status')) {
			return [this.wrap({ type: OperatorActionType.GitStatus }, plannerContext)];
		}
		if (lower.startsWith('git diff')) {
			return [this.wrap({ type: OperatorActionType.GitDiff }, plannerContext)];
		}

		return [
			this.wrap({
				type: OperatorActionType.SearchWorkspace,
				query: request.prompt,
				maxResults: 25
			}, plannerContext)
		];
	}

	private wrap(action: OperatorAction, plannerContext: PlannerContext): ProposedAction {
		return {
			action,
			requiredAuthority: requiredAuthorityForAction(action.type),
			description: this.describe(action, plannerContext)
		};
	}

	private describe(action: OperatorAction, plannerContext: PlannerContext): string {
		const advisoryContext = plannerContext.agentFiles.length + plannerContext.skillFiles.length > 0
			? ` (advisory prompt files: ${plannerContext.agentFiles.length} agents, ${plannerContext.skillFiles.length} skills)`
			: '';
		return `${action.type}${advisoryContext}`;
	}
}
