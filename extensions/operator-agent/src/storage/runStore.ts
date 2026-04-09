/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface OperatorRun {
	runId: string;
	requestText: string;
	startedAt: string;
	endedAt?: string;
}

export class RunStore {
	private readonly _runs = new Map<string, OperatorRun>();
	private _latestRunId: string | undefined;

	start(runId: string, requestText: string): OperatorRun {
		const run: OperatorRun = {
			runId,
			requestText,
			startedAt: new Date().toISOString()
		};
		this._runs.set(runId, run);
		this._latestRunId = runId;
		return run;
	}

	finish(runId: string): void {
		const run = this._runs.get(runId);
		if (run) {
			run.endedAt = new Date().toISOString();
		}
	}

	latestRunId(): string | undefined {
		return this._latestRunId;
	}
}
