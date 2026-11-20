#!/usr/bin/env bash
# CSN View — server dev lokal.
# Pakai: ./dev.sh  ->  buka http://localhost:8000
# Berhenti: Ctrl+C
set -euo pipefail
cd "$(dirname "$0")/web"
echo "CSN View jalan di http://localhost:8000 (Ctrl+C untuk berhenti)"
python3 -m http.server 8000
