/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import 'mocha';
import { ReceiptStore } from '../executor/receipts';
import { OperatorActionType } from '../types';

suite('operator-agent receipts', () => {
	test('appends receipts in order', () => {
		const store = new ReceiptStore();
		store.append({
			runId: 'run-1',
			actionId: 'a1',
			actionType: OperatorActionType.ReadFile,
			requestedScope: 'read-only',
			approvedScope: 'read-only',
			startTimestamp: new Date().toISOString(),
			status: 'pending',
			normalizedInputs: {},
			filesTouched: [],
			approval: {
				required: false,
				approved: true,
				actor: 'policy'
			}
		});
		store.append({
			runId: 'run-1',
			actionId: 'a2',
			actionType: OperatorActionType.SearchWorkspace,
			requestedScope: 'read-only',
			approvedScope: 'read-only',
			startTimestamp: new Date().toISOString(),
			status: 'pending',
			normalizedInputs: {},
			filesTouched: [],
			approval: {
				required: false,
				approved: true,
				actor: 'policy'
			}
		});

		assert.deepStrictEqual(store.list('run-1').map(item => item.actionId), ['a1', 'a2']);
	});
});
