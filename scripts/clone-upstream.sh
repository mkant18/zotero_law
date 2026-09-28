#!/usr/bin/env bash
# Re-create the read-only upstream source clones used by the research reports.
set -euo pipefail
cd "$(dirname "$0")/.."
for r in zotero/zotero zotero/zotero-connectors zotero/translate zotero/utilities zotero/translators citation-style-language/styles; do
	n=$(basename "$r")
	[ -d "$n" ] || git clone --depth 1 -q "https://github.com/$r.git" "$n" &
done
wait
