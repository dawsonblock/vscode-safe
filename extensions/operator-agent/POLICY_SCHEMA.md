# Operator Policy Schema

Policy file path: .vscode/operator-policy.json

## Schema

```json
{
  "version": 1,
  "roots": ["${workspaceFolder}"],
  "read_allow": ["${workspaceFolder}/**"],
  "write_allow": ["${workspaceFolder}/**"],
  "write_deny": [
    "${workspaceFolder}/.git/**",
    "${workspaceFolder}/**/.env",
    "${workspaceFolder}/**/*.pem",
    "${workspaceFolder}/**/*.key",
    "${workspaceFolder}/**/.ssh/**",
    "${workspaceFolder}/**/secrets/**"
  ],
  "command_allow": [
    "git status",
    "git diff *",
    "npm test",
    "npm run *",
    "pnpm *",
    "pytest *",
    "cargo test *"
  ],
  "command_deny": [
    "rm -rf *",
    "sudo *",
    "curl * | *",
    "wget * | *",
    "ssh *",
    "scp *",
    "kubectl *",
    "terraform apply *"
  ],
  "mcp_servers_allow": [],
  "mcp_tools_allow": [],
  "approval_mode": "all-writes-and-all-commands",
  "network_stance": "deny"
}
```

## Notes

- deny patterns take precedence over allow patterns.
- prompt files are advisory only and cannot widen policy.
- writes and commands require approval by default.
- mcp calls are denied unless both server and tool are allowlisted.
