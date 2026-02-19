#!/usr/bin/env bash
set -euo pipefail

SKILL_NAME="state-bridge"
TARGET_DIR="$HOME/.claude/skills/$SKILL_NAME"
SOURCE_DIR="$(cd "$(dirname "$0")" && pwd)"

# Remove existing install
if [ -d "$TARGET_DIR" ] || [ -L "$TARGET_DIR" ]; then
  echo "Removing existing skill at $TARGET_DIR"
  rm -rf "$TARGET_DIR"
fi

# Symlink project skill dir into global skills
ln -s "$SOURCE_DIR" "$TARGET_DIR"
echo "Installed skill '$SKILL_NAME' → $TARGET_DIR"
