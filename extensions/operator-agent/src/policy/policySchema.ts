/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type ApprovalMode = 'all-writes-and-all-commands' | 'none';

export interface OperatorPolicy {
	version: number;
	roots: string[];
	read_allow: string[];
	write_allow: string[];
	write_deny: string[];
	command_allow: string[];
	command_deny: string[];
	mcp_servers_allow: string[];
	mcp_tools_allow: string[];
	approval_mode: ApprovalMode;
	network_stance?: 'deny' | 'allow';
}

export const DEFAULT_POLICY: OperatorPolicy = {
	version: 1,
	roots: ['${workspaceFolder}'],
	read_allow: ['${workspaceFolder}/**'],
	write_allow: ['${workspaceFolder}/**'],
	write_deny: [
		'${workspaceFolder}/.git/**',
		'${workspaceFolder}/**/.env',
		'${workspaceFolder}/**/*.pem',
		'${workspaceFolder}/**/*.key',
		'${workspaceFolder}/**/.ssh/**',
		'${workspaceFolder}/**/secrets/**'
	],
	command_allow: [
		'git status',
		'git diff *',
		'npm test',
		'npm run *',
		'pnpm *',
		'pytest *',
		'cargo test *'
	],
	command_deny: [
		'rm -rf *',
		'sudo *',
		'curl * | *',
		'wget * | *',
		'ssh *',
		'scp *',
		'kubectl *',
		'terraform apply *'
	],
	mcp_servers_allow: [],
	mcp_tools_allow: [],
	approval_mode: 'all-writes-and-all-commands',
	network_stance: 'deny'
};
