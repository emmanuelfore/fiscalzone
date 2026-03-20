#!/bin/bash
# Automatically source environment variables from .env if it exists
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Execute the compiled server
exec node dist/index.cjs
