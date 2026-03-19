#!/bin/sh
set -eu

if [ -z "${AUTH_TOKEN:-}" ]; then
  echo "LLM_GUARD_API_TOKEN must be set before starting llm-guard." >&2
  exit 1
fi

exec llm_guard_api /home/user/app/config/scanners.yml
