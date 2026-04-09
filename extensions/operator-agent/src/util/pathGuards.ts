/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs/promises';
import * as path from 'path';
import { matchesAnyPattern } from './patternMatch';

const SECRET_PATH_HINTS = [
	'/.env',
	'/secrets/',
	'/.ssh/',
	'.pem',
	'.key',
	'/.git/'
];

function normalizePath(p: string): string {
	return path.resolve(p).replace(/\\/g, '/');
}

async function realPathSafe(p: string): Promise<string> {
	try {
		return normalizePath(await fs.realpath(p));
	} catch {
		return normalizePath(p);
	}
}

export async function isPathWithinRoot(candidatePath: string, roots: readonly string[]): Promise<boolean> {
	const candidateRealPath = await realPathSafe(candidatePath);
	for (const root of roots) {
		const rootRealPath = await realPathSafe(root);
		if (candidateRealPath === rootRealPath || candidateRealPath.startsWith(`${rootRealPath}/`)) {
			return true;
		}
	}
	return false;
}

export function hasSecretLikePath(candidatePath: string): boolean {
	const normalized = normalizePath(candidatePath).toLowerCase();
	return SECRET_PATH_HINTS.some(hint => normalized.includes(hint));
}

export async function assertPathAllowed(
	candidatePath: string,
	workspaceFolder: string,
	roots: readonly string[],
	allowPatterns: readonly string[],
	denyPatterns: readonly string[]
): Promise<void> {
	const normalized = normalizePath(candidatePath);
	if (!(await isPathWithinRoot(normalized, roots))) {
		throw new Error(`Path is outside allowed roots: ${normalized}`);
	}
	if (hasSecretLikePath(normalized)) {
		throw new Error(`Path appears to contain secret material: ${normalized}`);
	}
	if (matchesAnyPattern(normalized, denyPatterns, workspaceFolder)) {
		throw new Error(`Path matches deny policy: ${normalized}`);
	}
	if (!matchesAnyPattern(normalized, allowPatterns, workspaceFolder)) {
		throw new Error(`Path is not allowed by policy: ${normalized}`);
	}
}

export function normalizeForPolicy(p: string): string {
	return normalizePath(p);
}
