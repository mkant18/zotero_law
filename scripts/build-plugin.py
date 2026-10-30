"""Build the Zotero XPI using Python's standard library; run from any directory."""
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
subprocess.run(['node', str(ROOT / 'westlaw-us/tools/build-translator.mjs')], check=True)
manifest = json.loads((ROOT / 'plugin/manifest.json').read_text(encoding='utf-8'))
version = manifest['version']
out = ROOT / 'dist'
out.mkdir(exist_ok=True)
name = f'westlaw-advantage-us-{version}.xpi'
files = {
    'manifest.json': ROOT / 'plugin/manifest.json',
    'bootstrap.js': ROOT / 'plugin/bootstrap.js',
    'resources/Westlaw Advantage US.js': ROOT / 'westlaw-us/dist/Westlaw Advantage US.js',
    'resources/bluebook-law-review-westlaw-us.csl': ROOT / 'westlaw-us/m0/csl/bluebook-law-review-westlaw-us.csl',
    'LICENSE.txt': ROOT / 'plugin/LICENSE.txt',
}
with zipfile.ZipFile(out / name, 'w', zipfile.ZIP_DEFLATED) as archive:
    for target, source in sorted(files.items()):
        info = zipfile.ZipInfo(target, date_time=(2026, 10, 30, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o644 << 16
        archive.writestr(info, source.read_bytes())
digest = hashlib.sha256((out / name).read_bytes()).hexdigest()
(out / 'SHA256SUMS.txt').write_text(f'{digest}  {name}\n', encoding='utf-8')
updates = {'addons': {manifest['applications']['zotero']['id']: {'updates': [{
    'version': version,
    'update_link': f'https://github.com/mkant18/zotero_law/releases/download/v{version}/{name}',
    'update_hash': f'sha256:{digest}',
    'applications': {'zotero': {'strict_min_version': '7.0', 'strict_max_version': '10.*'}},
}]}}}
(out / 'updates.json').write_text(json.dumps(updates, indent=2) + '\n', encoding='utf-8')
print(f'{out / name}\nSHA256 {digest}')
