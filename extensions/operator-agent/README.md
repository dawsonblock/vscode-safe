# Operator Agent

Operator Agent is a first-party bounded execution layer for AI-assisted workspace operations.

## Goals

- Provide one privileged execution path for workspace actions.
- Enforce policy and approval checks before privileged actions.
- Emit append-only receipts for all privileged operations.

## Privileged Path

1. Chat or command request enters controller.
2. Request is converted to typed proposed actions.
3. Policy engine evaluates scope and allow/deny rules.
4. Approval provider requests user approval when required.
5. Executor performs action.
6. Receipt store records normalized action input/output and status.

## Policy File

Policy file path: .vscode/operator-policy.json

If the file is missing, a strict default policy is used:

- workspace-root read access only
- write denied for secret/sensitive paths
- all writes require approval
- all commands require approval
- commands are allowlisted and risk-classified

See source types in src/policy/policySchema.ts.

## Approval Flow

- write_patch actions require explicit approval in default mode.
- run_command actions require explicit approval in default mode.
- denial is a hard stop and is recorded in receipts.
- approval decisions are appended to the run receipt stream.
- receipt events are streamed live to the `Operator Agent Receipts` output channel.

## What Full Access Means Here

"Full access" in this build means broad access inside policy bounds, not unconstrained host control.

- no implicit access outside approved roots
- no unrestricted shell chains by default
- no automatic secret-path access by default
- no MCP access unless server and tool allowlists permit it
- no bypass around controller, policy, and executor path

## Current Limitations

- mcp_call is reserved and denied by default unless explicitly allowlisted and enabled.
- Command execution is bounded, but this is not a machine-wide sandbox.
- Policy coverage applies only to actions executed through Operator Agent.
