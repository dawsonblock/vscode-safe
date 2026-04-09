/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AuthorityLevel, OperatorActionType } from '../types';

export function requiredAuthorityForAction(actionType: OperatorActionType): AuthorityLevel {
	switch (actionType) {
		case OperatorActionType.SearchWorkspace:
		case OperatorActionType.ReadFile:
		case OperatorActionType.GitStatus:
		case OperatorActionType.GitDiff:
			return AuthorityLevel.ReadOnly;
		case OperatorActionType.WritePatch:
			return AuthorityLevel.RepoWrite;
		case OperatorActionType.RunCommand:
			return AuthorityLevel.CommandExec;
		case OperatorActionType.GitCommit:
		case OperatorActionType.McpCall:
			return AuthorityLevel.CommandExec;
		default:
			return AuthorityLevel.ReadOnly;
	}
}
