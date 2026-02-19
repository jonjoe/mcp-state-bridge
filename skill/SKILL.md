---
name: state-bridge
description: Work on the state-bridge-mcp package — a Zustand-to-MCP bridge over WebSocket. Use when the user references "state bridge", "state-bridge-mcp", "mcp bridge", "zustand bridge", "bridge package", "mcp package", or wants to modify, debug, build, or extend the bridge package at ~/Projects/state-bridge-mcp.
argument-hint: "[task description]"
disable-model-invocation: true
---

# State Bridge MCP

Package: `state-bridge-mcp` at `~/Projects/state-bridge-mcp`
Repo: `github.com/jonjoe/mcp-state-bridge`

MCP server + client SDK for bridging Zustand stores over WebSocket. Server is a CLI binary, client is a zero-dep SDK for any platform.

## Task

$ARGUMENTS

## References

- For full architecture, structure, patterns, build commands, and rules, see [references/architecture.md](references/architecture.md)

## Working in this project

1. All work happens in `~/Projects/state-bridge-mcp`
2. Build with `npm run build`, type-check with `npm run type-check`
3. This is a **public npm package** — keep it generic, no Yggdrasil-specific references
4. Client SDK must remain zero-Node-dep (React Native, browser, Node compatible)
5. Server entry gets a shebang, client does not (configured in `tsup.config.ts`)
