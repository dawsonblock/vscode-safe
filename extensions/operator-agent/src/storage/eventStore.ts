/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export interface OperatorEvent {
	runId: string;
	timestamp: string;
	kind: string;
	payload: unknown;
}

export class EventStore {
	private readonly _eventsByRun = new Map<string, OperatorEvent[]>();
	private readonly _onDidAppendEvent = new vscode.EventEmitter<OperatorEvent>();

	readonly onDidAppendEvent = this._onDidAppendEvent.event;

	append(event: OperatorEvent): void {
		const events = this._eventsByRun.get(event.runId) ?? [];
		events.push(event);
		this._eventsByRun.set(event.runId, events);
		this._onDidAppendEvent.fire(event);
	}

	list(runId: string): readonly OperatorEvent[] {
		return this._eventsByRun.get(runId) ?? [];
	}
}
