# Pendragon MCP

[![CI](https://github.com/GhouI/pendragon-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/GhouI/pendragon-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![MCP](https://img.shields.io/badge/MCP-Streamable%20HTTP-blue)](https://modelcontextprotocol.io)
[![Windows](https://img.shields.io/badge/Windows-PowerShell-5391FE)](https://learn.microsoft.com/powershell/)

**AI agents can write code, run terminals, and use tools. Windows RDP still traps them behind a GUI. Pendragon turns a Windows host into an MCP-native PowerShell target.**

Pendragon is a TypeScript [Model Context Protocol](https://modelcontextprotocol.io) server that runs on a Windows machine and exposes PowerShell tools over Streamable HTTP. It lets Codex, Claude Code, and other MCP-capable agents operate a Windows host without RDP screenshots, mouse control, or a human-owned terminal window.

```text
Agent or MCP client  ->  Pendragon MCP over HTTP  ->  Windows PowerShell
```

## Demo

[![Pendragon demo poster](assets/pendragon-demo.png)](assets/pendragon-demo.mp4)

Watch the generated demo video: [assets/pendragon-demo.mp4](assets/pendragon-demo.mp4)

The demo is rendered with [Remotion](https://www.remotion.dev/) from the source in [video/](video/). Re-render it locally with:

```powershell
npm run video:render
```

## Why Pendragon?

Most coding agents are comfortable in terminals, but Windows RDP is a GUI-first environment. Pendragon gives agents a clean command surface instead:

- Run PowerShell commands on a Windows host from any MCP client.
- Keep persistent PowerShell sessions when variables, cwd, or imported modules matter.
- Use bearer-token auth and provider firewalls instead of exposing raw RDP workflows.
- Test locally with a diagnostic client before connecting a real agent.
- Avoid IIS: Pendragon is a standalone Node HTTP server.

## Tooling

Pendragon exposes five MCP tools:

| Tool | Purpose |
| --- | --- |
| `powershell_execute` | Run one isolated PowerShell command. |
| `powershell_open_session` | Start a persistent PowerShell session. |
| `powershell_send` | Send a command to a persistent session. |
| `powershell_close_session` | Close a persistent session. |
| `powershell_list_sessions` | List active sessions. |

Command results include:

```json
{
  "commandId": "uuid",
  "stdout": "hello\r\n",
  "stderr": "",
  "exitCode": 0,
  "durationMs": 143,
  "truncated": false
}
```

## Quickstart

Requirements:

- Node.js 24 or newer
- npm
- Windows PowerShell (`powershell.exe`) or PowerShell 7 (`pwsh`)

Run Pendragon locally:

```powershell
git clone https://github.com/GhouI/pendragon-mcp.git
cd pendragon-mcp
npm install
$env:PENDRAGON_TOKEN = "dev-token"
npm run dev
```

The server defaults to:

```text
http://127.0.0.1:7573/mcp
```

Use the diagnostic client from another terminal:

```powershell
$env:PENDRAGON_TOKEN = "dev-token"
npm run client -- list-tools
npm run client -- exec Write-Output hello
```

Target more than one Pendragon server with `PENDRAGON_URLS`:

```powershell
$env:PENDRAGON_TOKEN = "shared-token"
$env:PENDRAGON_URLS = "http://win-1:7573/mcp,http://win-2:7573/mcp"
npm run client -- exec hostname
```

## Connect Agents

Full setup guide: [Install Pendragon and Connect Agents](docs/INSTALL_AND_AGENT_USAGE.md)

Codex `~/.codex/config.toml`:

```toml
[mcp_servers.pendragon]
url = "http://WINDOWS_SERVER_IP:7573/mcp"
bearer_token_env_var = "PENDRAGON_TOKEN"
tool_timeout_sec = 120
default_tools_approval_mode = "prompt"
enabled = true
```

Claude Code:

```powershell
claude mcp add --transport http pendragon http://WINDOWS_SERVER_IP:7573/mcp `
  --header "Authorization: Bearer YOUR_TOKEN"
```

Also see:

- [Codex config example](examples/codex-config.toml)
- [Claude Code MCP JSON example](examples/claude.mcp.json)

## Remote Windows Deployment

On the Windows host:

```powershell
git clone https://github.com/GhouI/pendragon-mcp.git
cd pendragon-mcp
npm install
$env:PENDRAGON_TOKEN = "replace-with-a-long-random-token"
$env:PENDRAGON_HOST = "0.0.0.0"
$env:PENDRAGON_PORT = "7573"
npm run dev
```

Open the Windows firewall for the MCP port:

```powershell
New-NetFirewallRule `
  -DisplayName "Pendragon MCP 7573" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 7573 `
  -Action Allow
```

Restrict your cloud firewall so TCP `7573` is reachable only from trusted IP addresses.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PENDRAGON_TOKEN` | required | Bearer token required for all MCP requests. |
| `PENDRAGON_URL` | `http://127.0.0.1:7573/mcp` | Diagnostic client URL for one Pendragon server. |
| `PENDRAGON_URLS` | empty | Diagnostic client comma-separated URLs for multiple servers using `PENDRAGON_TOKEN`. |
| `PENDRAGON_TARGETS` | empty | Diagnostic client JSON array for named servers and per-target token env vars. |
| `PENDRAGON_HOST` | `127.0.0.1` | Bind host. Use `0.0.0.0` only behind a firewall or tunnel. |
| `PENDRAGON_PORT` | `7573` | Bind port. |
| `PENDRAGON_ENDPOINT_PATH` | `/mcp` | MCP endpoint path. |
| `PENDRAGON_ALLOWED_ORIGINS` | empty | Comma-separated allowed `Origin` values. |
| `PENDRAGON_SHELL_PATH` | auto | Explicit `pwsh` or `powershell.exe` path. |
| `PENDRAGON_CWD` | process cwd | Default working directory. |
| `PENDRAGON_TIMEOUT_MS` | `30000` | Default command timeout. |
| `PENDRAGON_MAX_OUTPUT_BYTES` | `1048576` | Max captured bytes per output stream. |

## Security

Pendragon is a remote command-execution server. Treat it as sensitive infrastructure.

- Use a long random `PENDRAGON_TOKEN`.
- Keep `PENDRAGON_HOST=127.0.0.1` unless you have a trusted network path.
- Do not expose Pendragon directly to the public internet.
- Restrict TCP `7573` at your provider firewall.
- Run as a dedicated low-privilege Windows user when possible.
- Rotate tokens after demos, testing sessions, and shared access.

See [SECURITY.md](SECURITY.md) for more detail.

## Roadmap

- HTTPS or reverse-proxy deployment examples
- Windows service installation
- richer audit logs
- optional command policy controls
- Git Bash support
- per-client authorization
- packaged releases

## Contributing

Issues, ideas, and pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT. See [LICENSE](LICENSE).
