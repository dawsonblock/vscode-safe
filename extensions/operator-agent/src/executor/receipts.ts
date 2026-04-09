/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { OperatorActionType } from '../types';

export interface ApprovalDecisionMetadata {
	required: boolean;
	approved: boolean;
	reason?: string;
	actor: 'user' | 'policy';
}

export interface ActionReceipt {
	runId: string;
	actionId: string;
	actionType: OperatorActionType;
	requestedScope: string;
	approvedScope: string;
	startTimestamp: string;
	endTimestamp?: string;
	status: 'pending' | 'ok' | 'denied' | 'error';
	normalizedInputs: unknown;
	normalizedOutputs?: unknown;
	filesTouched: string[];
	commandLine?: string;
	cwd?: string;
	exitCode?: number;
	stdoutExcerpt?: string;
	stderrExcerpt?: string;
	approval: ApprovalDecisionMetadata;
}

export class ReceiptStore {
	private readonly _receiptsByRun = new Map<string, ActionReceipt[]>();
	private readonly _onDidAppendReceipt = new vscode.EventEmitter<ActionReceipt>();

	readonly onDidAppendReceipt = this._onDidAppendReceipt.event;

	append(receipt: ActionReceipt): void {
		const list = this._receiptsByRun.get(receipt.runId) ?? [];
		list.push(receipt);
		this._receiptsByRun.set(receipt.runId, list);
		this._onDidAppendReceipt.fire(receipt);
	}

	list(runId: string): readonly ActionReceipt[] {
		return this._receiptsByRun.get(runId) ?? [];
	}

	listLatestRun(): readonly ActionReceipt[] {
		const runs = [...this._receiptsByRun.keys()];
		if (runs.length === 0) {
			return [];
		}
		return this._receiptsByRun.get(runs[runs.length - 1]) ?? [];
	}
}
