/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export interface ApprovalDecision {
	approved: boolean;
	reason: string;
}

export class ApprovalProvider {
	async requestApproval(title: string, detail: string): Promise<ApprovalDecision> {
		const approve = 'Approve';
		const deny = 'Deny';
		const result = await vscode.window.showWarningMessage(`${title}: ${detail}`, { modal: true }, approve, deny);
		if (result === approve) {
			return { approved: true, reason: 'user approved' };
		}
		return { approved: false, reason: 'user denied' };
	}
}
