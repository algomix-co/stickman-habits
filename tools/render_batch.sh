#!/usr/bin/env bash
# Render every spec in a batch folder at 60fps, one at a time. Resumable: a video newer than its spec and
# the engine is skipped, so a restart picks up where it stopped.  usage: tools/render_batch.sh specs/batch-01 [log]
set -u
dir=$1; log=${2:-/dev/stdout}; cd "$(dirname "$0")/.."
python3 tools/batch_check.py "$dir" >> "$log" 2>&1 || { echo "BATCH CHECK FAILED: fix the batch (see log) before rendering" >> "$log"; exit 1; }   # variety rules (LEARNINGS round 4)
for spec in "$dir"/*.json; do
  id=$(basename "$spec" .json); mp4=out/$id/$id.mp4
  if [ -f "$mp4" ] && [ "$mp4" -nt "$spec" ] && [ "$mp4" -nt engine/engine.js ] && [ "$mp4" -nt engine/scenes.js ] && [ "$mp4" -nt engine/audio_first.py ]; then echo "skip $id" >> "$log"; continue; fi
  echo "render $id $(date +%T)" >> "$log"
  node make.js "$spec" 2>&1 | grep -vE "^\s*frames|^\s*$" | grep -E "audio ok|motion|warn|ERROR|done|FAIL" >> "$log"
done
echo "BATCH DONE $(date +%T)" >> "$log"
