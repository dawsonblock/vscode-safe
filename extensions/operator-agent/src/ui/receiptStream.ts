/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ReceiptStore } from '../executor/receipts';

export function registerReceiptStream(context: vscode.ExtensionContext, receiptStore: ReceiptStore): vscode.OutputChannel {
	const channel = vscode.window.createOutputChannel('Operator Agent Receipts');
	context.subscriptions.push(channel);

	context.subscriptions.push(receiptStore.onDidAppendReceipt(receipt => {
		channel.appendLine(`[${receipt.startTimestamp}] run=${receipt.runId} action=${receipt.actionId} type=${receipt.actionType} status=${receipt.status}`);
		channel.appendLine(`  scope requested=${receipt.requestedScope} approved=${receipt.approvedScope}`);
		channel.appendLine(`  approval required=${receipt.approval.required} approved=${receipt.approval.approved} actor=${receipt.approval.actor}`);
		if (receipt.approval.reason) {
			channel.appendLine(`  approvalReason=${receipt.approval.reason}`);
		}
		if (receipt.filesTouched.length > 0) {
			channel.appendLine(`  files=${receipt.filesTouched.join(', ')}`);
		}
		if (receipt.endTimestamp) {
			channel.appendLine(`  end=${receipt.endTimestamp}`);
		}
	}));

	return channel;
}
