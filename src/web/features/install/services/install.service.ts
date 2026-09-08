import type { MockAssistant } from "../../../types/library";

export const mockAssistants: MockAssistant[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    description: "Register GetLib as an MCP server in your Claude Code settings.",
    configFile: "~/.claude.json",
    snippet: `{
  "mcpServers": {
    "getlib": {
      "command": "bunx",
      "args": ["getlib-mcp@latest"],
      "env": {
        "GETLIB_API_URL": "https://docs.example.com/api"
      }
    }
  }
}`,
    steps: [
      "Open Claude Code settings and locate the MCP servers section.",
      "Paste the snippet into the mcpServers object.",
      "Restart Claude Code and verify getlib tools are listed.",
    ],
    status: "connected",
  },
  {
    id: "cursor",
    name: "Cursor",
    description: "Add GetLib to Cursor editor MCP configuration.",
    configFile: "~/.cursor/mcp.json",
    snippet: `{
  "mcpServers": {
    "getlib": {
      "command": "bunx",
      "args": ["getlib-mcp@latest"]
    }
  }
}`,
    steps: [
      "Open Cursor Settings, then the MCP section.",
      "Add a new server entry with the snippet.",
      "Reload the window and check the MCP tools panel.",
    ],
    status: "available",
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
      "command": "bunx",
      "args": ["getlib-mcp@latest"]
    }
  }
}`,
    steps: [
      "Create .vscode/mcp.json in your workspace.",
      "Paste the snippet into the servers object.",
      "Restart the MCP extension host.",
    ],
    status: "available",
  },
  {
    id: "cline",
    name: "Cline",
    description: "Add GetLib to the Cline VS Code extension MCP settings.",
    configFile: "cline_mcp_settings.json",
    snippet: `{
  "mcpServers": {
    "getlib": {
      "command": "bunx",
      "args": ["getlib-mcp@latest"],
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
      "command": ["bunx", "getlib-mcp@latest"],
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
  },
  {
    id: "codex",
    name: "Codex CLI",
    description: "Add GetLib to the OpenAI Codex CLI TOML config.",
    configFile: "~/.codex/config.toml",
    snippet: `[mcp_servers.getlib]
command = "bunx"
args = ["getlib-mcp@latest"]
enabled = true`,
    steps: [
      "Open ~/.codex/config.toml in your editor.",
      "Paste the snippet as a new mcp_servers table.",
      "Run codex mcp list to verify getlib appears.",
    ],
    status: "available",
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
      "command": ["bunx", "getlib-mcp@latest"],
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
  },
  {
    id: "windsurf",
    name: "Windsurf",
    description: "Add GetLib to the Windsurf MCP configuration file.",
    configFile: "~/.codeium/windsurf/mcp_config.json",
    snippet: `{
  "mcpServers": {
    "getlib": {
      "command": "bunx",
      "args": ["getlib-mcp@latest"]
    }
  }
}`,
    steps: [
      "Open the Windsurf MCP configuration file.",
      "Paste the snippet into the mcpServers object.",
      "Refresh the Cascade tools panel to verify getlib.",
    ],
    status: "available",
  },
];
