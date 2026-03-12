---
name: state-bridge
description: Diagnose Huginn app state using the state bridge MCP tools. Use when debugging UI issues, investigating unexpected behavior, checking app state, or when you need to understand what the Huginn app is currently doing.
user-invocable: false
---

# State Bridge — Live App State Access

The `huginn-state` MCP server bridges Huginn's Zustand stores over WebSocket. When the app is running on the emulator and connected, you can read and manipulate its live state.

## Available Tools

- `mcp__huginn-state__connection_status` — Check if Huginn is connected. Always call this first.
- `mcp__huginn-state__list_stores` — List all stores and their top-level keys.
- `mcp__huginn-state__get_state` — Read a store or a specific dot-path within it.
- `mcp__huginn-state__set_state` — Write a value at a dot-path.
- `mcp__huginn-state__call_action` — Invoke a store action by name.

## Stores

| Store | Purpose |
|-------|---------|
| `session` | Active chat session, message history, session metadata |
| `app` | App-level state — connection status, active tab, settings |
| `location` | GPS coordinates, location tracking state |
| `accelerometer` | Device motion data |
| `contacts` | Contact list and sync state |
| `audioLog` | Audio recording and transcription state |

## When to Use

- Debugging a UI issue — read the relevant store to see what the app thinks is happening
- Unexpected behavior — check if the state matches what you'd expect after an action
- After making a code change — verify the state updated correctly
- Before suggesting fixes — get a complete picture instead of guessing

## Diagnostic Pattern

1. Check `connection_status` — if not connected, the app isn't running or the bridge isn't active
2. `list_stores` to see what's available
3. `get_state` on the relevant store to read current state
4. Use dot-paths to drill into specific values (e.g. `get_state` store=`session` path=`messages`)
5. If needed, `set_state` or `call_action` to test a hypothesis
