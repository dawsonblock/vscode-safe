/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export const enum AuthorityLevel {
	ReadOnly = 'read-only',
	RepoWrite = 'repo-write',
	CommandExec = 'command-exec'
}

export const enum CommandRiskLevel {
	Low = 'low',
	High = 'high'
}

export const enum OperatorActionType {
	SearchWorkspace = 'search_workspace',
	ReadFile = 'read_file',
	WritePatch = 'write_patch',
	RunCommand = 'run_command',
	GitStatus = 'git_status',
	GitDiff = 'git_diff',
	GitCommit = 'git_commit',
	McpCall = 'mcp_call'
}

export interface SearchWorkspaceAction {
	type: OperatorActionType.SearchWorkspace;
	query: string;
	maxResults?: number;
	includePattern?: string;
}

export interface ReadFileAction {
	type: OperatorActionType.ReadFile;
	filePath: string;
	startLine?: number;
	endLine?: number;
}

export interface WritePatchEdit {
	startLine: number;
	startCharacter: number;
	endLine: number;
	endCharacter: number;
	newText: string;
}

export interface WritePatchAction {
	type: OperatorActionType.WritePatch;
	filePath: string;
	edits: WritePatchEdit[];
}

export interface RunCommandAction {
	type: OperatorActionType.RunCommand;
	command: string;
	args?: string[];
	cwd?: string;
	timeoutMs?: number;
}

export interface GitStatusAction {
	type: OperatorActionType.GitStatus;
	repositoryPath?: string;
}

export interface GitDiffAction {
	type: OperatorActionType.GitDiff;
	repositoryPath?: string;
	pathspec?: string;
}

export interface McpCallAction {
	type: OperatorActionType.McpCall;
	server: string;
	tool: string;
	arguments: Record<string, unknown>;
}

export type OperatorAction =
	| SearchWorkspaceAction
	| ReadFileAction
	| WritePatchAction
	| RunCommandAction
	| GitStatusAction
	| GitDiffAction
	| McpCallAction;

export interface ActionExecutionContext {
	runId: string;
	actionId: string;
	requestedAuthority: AuthorityLevel;
	approvedAuthority: AuthorityLevel;
	approvalRequired: boolean;
	approvalReason?: string;
}

export interface NormalizedCommand {
	executable: string;
	args: string[];
	original: string;
	normalized: string;
	cwd: string;
	riskLevel: CommandRiskLevel;
	tokens: string[];
	shellControlDetected: boolean;
}

export interface OperatorActionResult {
	actionType: OperatorActionType;
	status: 'ok' | 'denied' | 'error';
	message?: string;
	output?: unknown;
	filesTouched: string[];
}

export interface ProposedAction {
	action: OperatorAction;
	requiredAuthority: AuthorityLevel;
	description: string;
}

export interface OperatorRequest {
	prompt: string;
	cwd?: vscode.Uri;
}
