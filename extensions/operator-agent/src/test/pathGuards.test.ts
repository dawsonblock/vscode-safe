/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import 'mocha';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { hasSecretLikePath, isPathWithinRoot } from '../util/pathGuards';

suite('operator-agent pathGuards', () => {
	test('detects secret-like paths', () => {
		assert.strictEqual(hasSecretLikePath('/repo/.env'), true);
		assert.strictEqual(hasSecretLikePath('/repo/src/index.ts'), false);
	});

	test('enforces root bounds', async () => {
		const root = path.resolve('/tmp/repo-root');
		assert.strictEqual(await isPathWithinRoot(path.join(root, 'src/file.ts'), [root]), true);
		assert.strictEqual(await isPathWithinRoot('/tmp/other/file.ts', [root]), false);
	});

	test('denies symlink escape', async () => {
		const tempBase = await fs.mkdtemp(path.join(os.tmpdir(), 'operator-agent-'));
		const root = path.join(tempBase, 'root');
		const outside = path.join(tempBase, 'outside');
		await fs.mkdir(root, { recursive: true });
		await fs.mkdir(outside, { recursive: true });
		await fs.writeFile(path.join(outside, 'secret.txt'), 'secret', 'utf8');
		const linkPath = path.join(root, 'link');
		await fs.symlink(outside, linkPath);

		const escapedPath = path.join(linkPath, 'secret.txt');
		assert.strictEqual(await isPathWithinRoot(escapedPath, [root]), false);
	});
});
