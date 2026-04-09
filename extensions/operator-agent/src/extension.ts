/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ActionPlanner } from './controller/actionPlanner';
import { AgentController } from './controller/agentController';
import { OperatorExecutor } from './executor/executor';
import { ReceiptStore } from './executor/receipts';
import { PolicyEngine } from './policy/policyEngine';
import { EventStore } from './storage/eventStore';
import { RunStore } from './storage/runStore';
import { gitDiffTool } from './tools/gitDiffTool';
import { gitStatusTool } from './tools/gitStatusTool';
import { mcpCallTool } from './tools/mcpCallTool';
import { readFileTool } from './tools/readFileTool';
import { runCommandTool } from './tools/runCommandTool';
import { searchWorkspaceTool } from './tools/searchWorkspaceTool';
import { ToolRegistry } from './tools/toolRegistry';
import { writePatchTool } from './tools/writePatchTool';
import { ApprovalProvider } from './ui/approvalProvider';
import { registerChatBridge } from './ui/chatBridge';
import { registerReceiptStream } from './ui/receiptStream';

export function activate(context: vscode.ExtensionContext): void {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
	if (!workspaceFolder) {
		return;
	}

	const planner = new ActionPlanner();
	const policyEngine = new PolicyEngine(workspaceFolder);
	const executor = new OperatorExecutor();
	const approvalProvider = new ApprovalProvider();
	const runStore = new RunStore();
	const receiptStore = new ReceiptStore();
	const eventStore = new EventStore();

	const toolRegistry = new ToolRegistry(executor);
	toolRegistry.register(searchWorkspaceTool);
	toolRegistry.register(readFileTool);
	toolRegistry.register(writePatchTool);
	toolRegistry.register(runCommandTool);
	toolRegistry.register(gitStatusTool);
	toolRegistry.register(gitDiffTool);
	toolRegistry.register(mcpCallTool);

	const controller = new AgentController(
		workspaceFolder,
		planner,
		policyEngine,
		toolRegistry,
		approvalProvider,
		runStore,
		receiptStore,
		eventStore
	);

	registerChatBridge(context, controller);
	const receiptChannel = registerReceiptStream(context, receiptStore);

	context.subscriptions.push(vscode.commands.registerCommand('operatorAgent.runAction', async () => {
		const prompt = await vscode.window.showInputBox({
			title: 'Operator Agent',
			prompt: 'Enter a request, or JSON action payload.'
		});
		if (!prompt) {
			return;
		}
		const results = await controller.handleRequest({ prompt });
		await vscode.window.showInformationMessage(`Operator Agent executed ${results.length} action(s).`);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('operatorAgent.showReceiptStream', async () => {
		receiptChannel.show(true);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('operatorAgent.showRunReceipts', async () => {
		const latest = receiptStore.listLatestRun();
		if (latest.length === 0) {
			await vscode.window.showInformationMessage('No operator receipts are available yet.');
			return;
		}
		const document = await vscode.workspace.openTextDocument({
			language: 'json',
			content: JSON.stringify(latest, null, 2)
		});
		await vscode.window.showTextDocument(document, { preview: false });
	}));
}

export function deactivate(): void {
	// no-op
}
