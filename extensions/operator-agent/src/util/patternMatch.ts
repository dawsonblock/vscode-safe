/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

function escapeRegExp(value: string): string {
	return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function globToRegExp(pattern: string): RegExp {
	const escaped = escapeRegExp(pattern)
		.replace(/\\\*\\\*/g, '::DOUBLE_STAR::')
		.replace(/\\\*/g, '[^/]*')
		.replace(/::DOUBLE_STAR::/g, '.*');
	return new RegExp(`^${escaped}$`, 'i');
}

export function expandWorkspaceVariables(value: string, workspaceFolder: string): string {
	return value.replaceAll('${workspaceFolder}', workspaceFolder);
}

export function matchesAnyPattern(candidate: string, patterns: readonly string[], workspaceFolder: string): boolean {
	for (const rawPattern of patterns) {
		const expanded = expandWorkspaceVariables(rawPattern, workspaceFolder);
		if (globToRegExp(expanded).test(candidate)) {
			return true;
		}
	}
	return false;
}
