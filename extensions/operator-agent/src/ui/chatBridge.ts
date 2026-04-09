/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AgentController } from '../controller/agentController';

function toMarkdown(result: { status: string; actionType: string; message?: string; output?: unknown }): vscode.MarkdownString {
	const lines: string[] = [];
	lines.push(`- Action: ${result.actionType}`);
	lines.push(`- Status: ${result.status}`);
	if (result.message) {
		lines.push(`- Message: ${result.message}`);
	}
	if (result.output !== undefined) {
		lines.push('```json');
		lines.push(JSON.stringify(result.output, null, 2));
		lines.push('```');
	}
	return new vscode.MarkdownString(lines.join('\n'));
}

export function registerChatBridge(context: vscode.ExtensionContext, controller: AgentController): void {
	const participant = vscode.chat.createChatParticipant('operator-agent.controller', async (request, _chatContext, progress, _token) => {
		const results = await controller.handleRequest({ prompt: request.prompt });
		for (const result of results) {
			progress.markdown(toMarkdown(result));
		}
		return {
			metadata: {
				actionCount: results.length,
			}
		};
	});
	participant.iconPath = new vscode.ThemeIcon('tools');
	context.subscriptions.push(participant);
}
