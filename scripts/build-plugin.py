"""Build the Zotero XPI using Python's standard library; run from any directory."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[1]
manifest_path = ROOT / 'plugin/manifest.json'
manifest_bytes = manifest_path.read_bytes()
manifest = json.loads(manifest_bytes)
version = manifest['version']
if not isinstance(version, str) or not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]*', version):
    raise ValueError('Invalid release version')
addon_id = manifest['applications']['zotero']['id']
out = ROOT / 'dist'
name = f'westlaw-advantage-us-{version}.xpi'
translator = ROOT / 'westlaw-us/dist/Westlaw Advantage US.js'
files = {
    'manifest.json': manifest_bytes,
    'bootstrap.js': (ROOT / 'plugin/bootstrap.js').read_bytes(),
    'resources/bluebook-law-review-westlaw-us.csl': (ROOT / 'westlaw-us/m0/csl/bluebook-law-review-westlaw-us.csl').read_bytes(),
    'LICENSE.txt': (ROOT / 'plugin/LICENSE.txt').read_bytes(),
}
# Keep every generated output private until all inputs and metadata are ready.
stage = Path(tempfile.mkdtemp(prefix='.build-', dir=ROOT))
keep_stage = False
try:
    staged_translator = stage / 'translator.js'
    subprocess.run(['node', '--input-type=module', '-e',
                    'const {buildTranslator} = await import(process.argv[1]); buildTranslator(process.argv[2]);',
                    (ROOT / 'westlaw-us/tools/build-translator.mjs').as_uri(), str(staged_translator)], check=True)
    files['resources/Westlaw Advantage US.js'] = staged_translator.read_bytes()
    with zipfile.ZipFile(stage / name, 'w', zipfile.ZIP_DEFLATED) as archive:
        for target, content in sorted(files.items()):
            info = zipfile.ZipInfo(target, date_time=(2026, 10, 30, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, content)
    with zipfile.ZipFile(stage / name) as archive:
        if archive.testzip() is not None or archive.namelist() != sorted(files):
            raise ValueError('Invalid staged archive')
    digest = hashlib.sha256((stage / name).read_bytes()).hexdigest()
    (stage / 'SHA256SUMS.txt').write_text(f'{digest}  {name}\n', encoding='utf-8')
    updates = {'addons': {addon_id: {'updates': [{
        'version': version,
        'update_link': f'https://github.com/mkant18/zotero_law/releases/download/v{version}/{name}',
        'update_hash': f'sha256:{digest}',
        'applications': {'zotero': {'strict_min_version': '7.0', 'strict_max_version': '10.*'}},
    }]}}}
    (stage / 'updates.json').write_text(json.dumps(updates, indent=2) + '\n', encoding='utf-8')
    outputs = [(staged_translator, translator), (stage / name, out / name),
               (stage / 'SHA256SUMS.txt', out / 'SHA256SUMS.txt'),
               (stage / 'updates.json', out / 'updates.json')]
    backups = {}
    for index, (_, target) in enumerate(outputs):
        backup = stage / f'backup-{index}' if target.exists() else None
        if backup is not None:
            shutil.copyfile(target, backup)
        backups[target] = backup
    replaced = []
    try:
        for source, target in outputs:
            target.parent.mkdir(parents=True, exist_ok=True)
            source.replace(target)
            replaced.append(target)
    except BaseException:
        rollback_errors = []
        for target in reversed(replaced):
            try:
                if backups[target] is None:
                    target.unlink()
                else:
                    restore = stage / 'restore'
                    shutil.copyfile(backups[target], restore)
                    restore.replace(target)
            except OSError as error:
                rollback_errors.append(error)
        if rollback_errors:
            # Do not advertise a potentially mixed release. Retain originals for recovery.
            keep_stage = True
            for metadata in ('SHA256SUMS.txt', 'updates.json'):
                try:
                    (out / metadata).unlink(missing_ok=True)
                except OSError as error:
                    rollback_errors.append(error)
            raise RuntimeError(f'Release rollback incomplete; recovery files retained at {stage}: {rollback_errors}')
        raise
finally:
    if not keep_stage:
        shutil.rmtree(stage)
print(f'{out / name}\nSHA256 {digest}')
