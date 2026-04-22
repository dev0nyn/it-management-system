# CoDev ITMS MCP Server

Exposes CoDev ITMS functionality (tickets, assets, users, monitoring, reports) as MCP tools for AI assistants and agents.

## Quick start

```bash
cd services/mcp-server
pnpm install
pnpm build
```

## Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MCP_INTERNAL_API_URL` | Yes | `http://localhost:3000` | CoDev ITMS REST API base URL |
| `MCP_INTERNAL_API_SECRET` | Yes | — | JWT token for authenticating with the REST API |
| `MCP_API_KEY` | Yes (HTTP) | — | API key that clients must provide |
| `MCP_API_KEY_ROLE` | No | `admin` | RBAC role for the API key (`admin`, `it_staff`, `end_user`) |
| `MCP_SERVER_PORT` | No | `3100` | HTTP transport listen port |

## Transports

### stdio (local use)

```bash
node dist/index.js --transport stdio
```

### HTTP (remote/hosted use)

```bash
node dist/index.js --transport http
# Listens on MCP_SERVER_PORT (default 3100)
```

## Claude Desktop config (stdio)

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "codev-itms": {
      "command": "node",
      "args": ["/path/to/services/mcp-server/dist/index.js", "--transport", "stdio"],
      "env": {
        "MCP_INTERNAL_API_URL": "http://localhost:3000",
        "MCP_INTERNAL_API_SECRET": "<your-jwt-token>"
      }
    }
  }
}
```

## Available tools

| Tool | Description |
|------|-------------|
| `list_tickets` | List tickets with status/priority/assignee filters |
| `get_ticket` | Get a single ticket by ID |
| `create_ticket` | Create a new support ticket |
| `update_ticket` | Update ticket status, assignee, priority, etc. |
| `list_assets` | List assets with status/type filters |
| `get_asset` | Get a single asset by ID |
| `assign_asset` | Assign an asset to a user |
| `list_users` | List users (admin/it_staff only) |
| `get_monitoring_status` | Get device health summary |
| `get_alerts` | List monitoring alerts |
| `run_report` | Run a report (tickets-by-status, assets-by-status, etc.) |

## Running tests

```bash
pnpm --filter @codev/mcp-server test
```
