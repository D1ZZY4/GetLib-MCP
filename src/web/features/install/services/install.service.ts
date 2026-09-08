import type { MockAssistant } from "../../../types/library";

const REMOTE_HTTP_URL = "https://your-server.com/api/mcp/http";
export const mockAssistants: MockAssistant[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    description: "Register GetLib as an MCP server in your Claude Code settings.",
    configFile: "~/.claude.json",
    snippet: `{
  "mcpServers": {
    "getlib": {
      "command": "npx",
      "args": ["getlib-mcp@latest"],
      "env": {
        "GETLIB_API_URL": "https://docs.example.com/api"
      }
    }
  }
}`,
    remoteConfigFile: "~/.claude.json (remote)",
    remoteTransport: "streamable-http",
    remoteSnippet: `{
  "mcpServers": {
    "getlib": {
      "type": "http",
      "url": "${REMOTE_HTTP_URL}"
    }
  }
}`,
    steps: [
      "Open Claude Code settings and locate the MCP servers section.",
      "Paste the snippet into the mcpServers object.",
      "Restart Claude Code and verify getlib tools are listed.",
    ],
    status: "available",
    transports: ["stdio", "streamable-http", "sse"],
  },
  {
    id: "cursor",
    name: "Cursor",
    description: "Add GetLib to Cursor editor MCP configuration.",
    configFile: "~/.cursor/mcp.json",
    snippet: `{
  "mcpServers": {
    "getlib": {
      "command": "npx",
      "args": ["getlib-mcp@latest"]
    }
  }
}`,
    remoteConfigFile: "~/.cursor/mcp.json (remote)",
    remoteTransport: "streamable-http",
    remoteSnippet: `{
  "mcpServers": {
    "getlib": {
      "url": "${REMOTE_HTTP_URL}"
    }
  }
}`,
    steps: [
      "Open Cursor Settings, then the MCP section.",
      "Add a new server entry with the snippet.",
      "Reload the window and check the MCP tools panel.",
    ],
    status: "available",
    transports: ["stdio", "streamable-http", "sse"],
  },
  {
    id: "vscode",
    name: "VS Code",
    description: "Connect GetLib through the VS Code MCP extension settings.",
    configFile: ".vscode/mcp.json",
    snippet: `{
  "servers": {
    "getlib": {
      "type": "stdio",
      "command": "npx",
      "args": ["getlib-mcp@latest"]
    }
  }
}`,
    remoteConfigFile: ".vscode/mcp.json (remote)",
    remoteTransport: "streamable-http",
    remoteSnippet: `{
  "servers": {
    "getlib": {
      "type": "http",
      "url": "${REMOTE_HTTP_URL}"
    }
  }
}`,
    steps: [
      "Create .vscode/mcp.json in your workspace.",
      "Paste the snippet into the servers object.",
      "Restart the MCP extension host.",
    ],
    status: "available",
    transports: ["stdio", "streamable-http", "sse"],
  },
  {
    id: "cline",
    name: "Cline",
    description: "Add GetLib to the Cline VS Code extension MCP settings.",
    configFile: "cline_mcp_settings.json",
    snippet: `{
  "mcpServers": {
    "getlib": {
      "command": "npx",
      "args": ["getlib-mcp@latest"],
      "disabled": false,
      "autoApprove": []
    }
  }
}`,
    remoteConfigFile: "cline_mcp_settings.json (remote)",
    remoteTransport: "streamable-http",
    remoteSnippet: `{
  "mcpServers": {
    "getlib": {
      "type": "streamableHttp",
      "url": "${REMOTE_HTTP_URL}",
      "disabled": false,
      "autoApprove": []
    }
  }
}`,
    steps: [
      "Open the Cline MCP Servers settings.",
      "Add a new server entry with the snippet.",
      "Approve the getlib tools when prompted.",
    ],
    status: "available",
    transports: ["stdio", "streamable-http", "sse"],
  },
  {
    id: "opencode",
    name: "OpenCode",
    description: "Register GetLib in your opencode.json MCP section.",
    configFile: "opencode.json",
    snippet: `{
  "mcp": {
    "getlib": {
      "type": "local",
      "command": ["npx", "getlib-mcp@latest"],
      "enabled": true
    }
  }
}`,
    remoteConfigFile: "opencode.json (remote)",
    remoteTransport: "streamable-http",
    remoteSnippet: `{
  "mcp": {
    "getlib": {
      "type": "remote",
      "url": "${REMOTE_HTTP_URL}",
      "enabled": true
    }
  }
}`,
    steps: [
      "Open opencode.json in your project or home directory.",
      "Paste the snippet into the mcp object.",
      "Restart opencode and verify getlib tools load.",
    ],
    status: "available",
    transports: ["stdio", "streamable-http"],
  },
  {
    id: "codex",
    name: "Codex CLI",
    description: "Add GetLib to the OpenAI Codex CLI TOML config.",
    configFile: "~/.codex/config.toml",
    snippet: `[mcp_servers.getlib]
command = "npx"
args = ["getlib-mcp@latest"]
enabled = true`,
    remoteConfigFile: "~/.codex/config.toml (remote)",
    remoteTransport: "streamable-http",
    remoteSnippet: `[mcp_servers.getlib]
url = "${REMOTE_HTTP_URL}"`,
    steps: [
      "Open ~/.codex/config.toml in your editor.",
      "Paste the snippet as a new mcp_servers table.",
      "Run codex mcp list to verify getlib appears.",
    ],
    status: "available",
    transports: ["stdio", "streamable-http"],
  },
  {
    id: "kilo-code",
    name: "Kilo Code",
    description: "Add GetLib under the mcp key in your Kilo config.",
    configFile: "./kilo.json",
    snippet: `{
  "mcp": {
    "getlib": {
      "type": "local",
      "command": ["npx", "getlib-mcp@latest"],
      "enabled": true
    }
  }
}`,
    remoteConfigFile: "./kilo.json (remote)",
    remoteTransport: "streamable-http",
    remoteSnippet: `{
  "mcp": {
    "getlib": {
      "type": "remote",
      "url": "${REMOTE_HTTP_URL}",
      "enabled": true
    }
  }
}`,
    steps: [
      "Open ./kilo.json or ./.kilo/kilo.json in your project.",
      "Paste the snippet into the mcp object.",
      "Run kilo mcp list to verify getlib appears.",
    ],
    status: "available",
    transports: ["stdio", "streamable-http"],
  },
  {
    id: "windsurf",
    name: "Windsurf",
    description: "Add GetLib to the Windsurf MCP configuration file.",
    configFile: "~/.codeium/windsurf/mcp_config.json",
    snippet: `{
  "mcpServers": {
    "getlib": {
      "command": "npx",
      "args": ["getlib-mcp@latest"]
    }
  }
}`,
    remoteConfigFile: "~/.codeium/windsurf/mcp_config.json (remote)",
    remoteTransport: "streamable-http",
    remoteSnippet: `{
  "mcpServers": {
    "getlib": {
      "serverUrl": "${REMOTE_HTTP_URL}"
    }
  }
}`,
    steps: [
      "Open the Windsurf MCP configuration file.",
      "Paste the snippet into the mcpServers object.",
      "Refresh the Cascade tools panel to verify getlib.",
    ],
    status: "available",
    transports: ["stdio", "streamable-http", "sse"],
  },
];

export interface TransportModeDoc {
  id: "stdio" | "sse" | "streamable-http";
  label: string;
  explanation: string;
  status: "available" | "planned";
}

// MOCK ONLY: mirrors the server transport registry until a /api docs endpoint lands.
export const mockTransportModes: TransportModeDoc[] = [
  {
    id: "stdio",
    label: "STDIO",
    explanation:
      "Runs the server as a local process. Your AI agent spawns the command above and talks to it over stdin/stdout. Use this for agents on the same machine.",
    status: "available",
  },
  {
    id: "sse",
    label: "SSE",
    explanation:
      "Legacy Server-Sent Events transport for remote agents. Open GET /api/mcp/sse for the event stream, then POST answers to /api/mcp/sse/messages. Prefer Streamable HTTP for new setups.",
    status: "available",
  },
  {
    id: "streamable-http",
    label: "Streamable HTTP",
    explanation:
      "Remote transport over Streamable HTTP with session support. Use this for hosted dashboards and remote agents instead of spawning a local process.",
    status: "available",
  },
];
