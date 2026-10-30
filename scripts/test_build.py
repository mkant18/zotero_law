"""Exercise the real build CLIs in disposable trees, without touching release files."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
RESOURCES = {
    'manifest.json': 'plugin/manifest.json',
    'bootstrap.js': 'plugin/bootstrap.js',
    'resources/Westlaw Advantage US.js': 'westlaw-us/dist/Westlaw Advantage US.js',
    'resources/bluebook-law-review-westlaw-us.csl': 'westlaw-us/m0/csl/bluebook-law-review-westlaw-us.csl',
    'LICENSE.txt': 'plugin/LICENSE.txt',
}


class BuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='westlaw build ')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        inputs = [
            'scripts/build-plugin.py', 'westlaw-us/tools/build-translator.mjs',
            'westlaw-us/m0/probe/Westlaw US M0 Probe.js',
            *[source for source in RESOURCES.values() if '/dist/' not in source],
            *[str(p.relative_to(ROOT)) for p in (ROOT / 'westlaw-us/src').glob('*.js')],
        ]
        for source in inputs:
            target = self.root / source
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / source, target)
        self.manifest = json.loads((self.root / 'plugin/manifest.json').read_text(encoding='utf-8'))
        self.xpi = self.root / 'dist' / f"westlaw-advantage-us-{self.manifest['version']}.xpi"

    def build(self, success=True):
        result = subprocess.run(
            [sys.executable, str(self.root / 'scripts/build-plugin.py')],
            cwd=self.root.parent, capture_output=True, encoding='utf-8', timeout=30,
        )
        if success:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        else:
            self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        return result

    def test_archive_contains_only_expected_resources_with_exact_bytes(self):
        self.build()
        with zipfile.ZipFile(self.xpi) as archive:
            self.assertIsNone(archive.testzip())
            self.assertEqual(archive.namelist(), sorted(RESOURCES))
            for target, source in RESOURCES.items():
                with self.subTest(resource=target):
                    self.assertEqual(archive.read(target), (self.root / source).read_bytes())

    def test_update_metadata_and_checksum_match_archive(self):
        self.build()
        digest = hashlib.sha256(self.xpi.read_bytes()).hexdigest()
        self.assertEqual((self.xpi.parent / 'SHA256SUMS.txt').read_text(), f'{digest}  {self.xpi.name}\n')
        updates = json.loads((self.xpi.parent / 'updates.json').read_text())
        self.assertEqual(set(updates['addons']), {self.manifest['applications']['zotero']['id']})
        entries = updates['addons'][self.manifest['applications']['zotero']['id']]['updates']
        self.assertEqual(len(entries), 1)
        entry = entries[0]
        self.assertEqual(entry['version'], self.manifest['version'])
        self.assertEqual(entry['update_hash'], f'sha256:{digest}')
        self.assertEqual(entry['update_link'],
                         f"https://github.com/mkant18/zotero_law/releases/download/v{entry['version']}/{self.xpi.name}")
        for key in ('strict_min_version', 'strict_max_version'):
            self.assertEqual(entry['applications']['zotero'][key], self.manifest['applications']['zotero'][key])

    def test_repeated_builds_are_byte_identical(self):
        self.build()
        before = {p.name: p.read_bytes() for p in self.xpi.parent.iterdir()}
        self.build()
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.xpi.parent.iterdir()})

    def test_source_changes_reach_bundle_and_change_build_marker(self):
        self.build()
        with zipfile.ZipFile(self.xpi) as archive:
            before = archive.read('resources/Westlaw Advantage US.js')
        source = self.root / 'westlaw-us/src/text.js'
        source.write_bytes(b'var buildRegressionSentinel = 42;\n' + source.read_bytes())
        self.build()
        with zipfile.ZipFile(self.xpi) as archive:
            after = archive.read('resources/Westlaw Advantage US.js')
        self.assertIn(b'var buildRegressionSentinel = 42;', after)
        def marker(content):
            return content.split(b'var wlTrBuild = "', 1)[1].split(b'"', 1)[0]
        self.assertNotEqual(marker(before), marker(after))
        self.assertRegex(marker(after).decode(), r'^[0-9a-f]{64}$')

    def test_bundled_javascript_compiles_and_exposes_zotero_entry_points(self):
        self.build()
        with zipfile.ZipFile(self.xpi) as archive:
            translator = archive.read('resources/Westlaw Advantage US.js').decode()
            header, body = translator.split('\n}\n', 1)
            metadata = json.loads(header + '\n}')
            self.assertEqual(metadata['translatorType'], 4)
            self.assertEqual(metadata['translatorID'], '9abca805-707d-4064-958f-e08ac37f0862')
            for code, names in (
                (body, ['detectWeb', 'doWeb']),
                (archive.read('bootstrap.js').decode(), ['install', 'startup', 'shutdown', 'uninstall']),
            ):
                program = (
                    "const vm = require('node:vm'); const fs = require('node:fs');"
                    "const assert = require('node:assert/strict'); const scope = vm.createContext({});"
                    "vm.runInContext(fs.readFileSync(0, 'utf8'), scope);"
                    f"for (const name of {json.dumps(names)}) assert.equal(typeof scope[name], 'function');"
                )
                result = subprocess.run(['node', '-e', program], input=code, encoding='utf-8',
                                        capture_output=True, timeout=30)
                self.assertEqual(result.returncode, 0, result.stderr)

    def test_invalid_sources_fail_before_overwriting_last_good_release(self):
        mutations = {
            'syntax': ('text.js', '\nfunction broken( {\n', 'SyntaxError'),
            'duplicate': ('text.js', '\nfunction detectWeb() {}\n', 'Duplicate top-level function'),
            'commonjs': ('text.js', '\nvar forbidden = require("fs");\n', 'contains require('),
        }
        self.build()
        outputs = [*self.xpi.parent.iterdir(), self.root / 'westlaw-us/dist/Westlaw Advantage US.js']
        before = {p: p.read_bytes() for p in outputs}
        for name, (filename, addition, message) in mutations.items():
            with self.subTest(failure=name):
                source = self.root / 'westlaw-us/src' / filename
                original = source.read_bytes()
                try:
                    source.write_bytes(addition.encode() + original)
                    result = self.build(success=False)
                    self.assertIn(message, result.stderr)
                    self.assertEqual(before, {p: p.read_bytes() for p in outputs})
                finally:
                    source.write_bytes(original)

    def test_missing_module_fails_without_producing_release(self):
        (self.root / 'westlaw-us/src/text.js').unlink()
        self.assertIn('ENOENT', self.build(success=False).stderr)
        self.assertFalse(self.xpi.exists())

    def test_unrelated_private_and_stale_files_are_not_packaged(self):
        for relative in ('plugin/private-note.txt', 'westlaw-us/src/unlisted.js',
                         'westlaw-us/.private/capture.txt'):
            path = self.root / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b'TEST-PRIVATE-BUILD-SENTINEL')
        self.xpi.parent.mkdir()
        stale = self.xpi.parent / 'unrelated-release.xpi'
        stale.write_bytes(b'PREVIOUS-RELEASE')
        self.build()
        with zipfile.ZipFile(self.xpi) as archive:
            self.assertEqual(set(archive.namelist()), set(RESOURCES))
            for name in archive.namelist():
                self.assertNotIn(b'TEST-PRIVATE-BUILD-SENTINEL', archive.read(name))
        self.assertEqual(stale.read_bytes(), b'PREVIOUS-RELEASE')

    def test_bootstrap_and_style_changes_reach_bundle_and_checksum(self):
        self.build()
        before = self.xpi.read_bytes()
        changes = {
            'bootstrap.js': b'\n// build bootstrap sentinel\n',
            'resources/bluebook-law-review-westlaw-us.csl': b'\n<!-- build style sentinel -->\n',
        }
        for target, addition in changes.items():
            source = self.root / RESOURCES[target]
            source.write_bytes(source.read_bytes() + addition)
        self.build()
        self.assertNotEqual(before, self.xpi.read_bytes())
        with zipfile.ZipFile(self.xpi) as archive:
            for target in changes:
                self.assertEqual(archive.read(target), (self.root / RESOURCES[target]).read_bytes())
        digest = hashlib.sha256(self.xpi.read_bytes()).hexdigest()
        updates = json.loads((self.xpi.parent / 'updates.json').read_text())
        self.assertEqual(updates['addons'][self.manifest['applications']['zotero']['id']]
                         ['updates'][0]['update_hash'], f'sha256:{digest}')

    def test_version_change_keeps_old_release_and_updates_download_target(self):
        self.build()
        before = self.xpi.read_bytes()
        self.manifest['version'] = '9.9.9-test'
        (self.root / 'plugin/manifest.json').write_text(json.dumps(self.manifest), encoding='utf-8')
        self.build()
        replacement = self.xpi.parent / 'westlaw-advantage-us-9.9.9-test.xpi'
        self.assertEqual(self.xpi.read_bytes(), before)
        with zipfile.ZipFile(replacement) as archive:
            self.assertEqual(json.loads(archive.read('manifest.json'))['version'], '9.9.9-test')
        updates = json.loads((self.xpi.parent / 'updates.json').read_text())
        entry = updates['addons'][self.manifest['applications']['zotero']['id']]['updates'][0]
        self.assertEqual(entry['version'], '9.9.9-test')
        self.assertEqual(entry['update_link'],
                         f'https://github.com/mkant18/zotero_law/releases/download/v9.9.9-test/{replacement.name}')
        digest = hashlib.sha256(replacement.read_bytes()).hexdigest()
        self.assertEqual(entry['update_hash'], f'sha256:{digest}')
        self.assertEqual((replacement.parent / 'SHA256SUMS.txt').read_text(),
                         f'{digest}  {replacement.name}\n')

    def test_missing_probe_fails_before_creating_outputs(self):
        (self.root / 'westlaw-us/m0/probe/Westlaw US M0 Probe.js').unlink()
        self.assertIn('ENOENT', self.build(success=False).stderr)
        self.assertFalse(self.xpi.parent.exists())
        self.assertFalse((self.root / 'westlaw-us/dist').exists())

    def test_invalid_manifest_preserves_existing_release_files(self):
        self.build()
        before = {path.name: path.read_bytes() for path in self.xpi.parent.iterdir()}
        (self.root / 'plugin/manifest.json').write_text('{"version":', encoding='utf-8')
        self.assertIn('JSONDecodeError', self.build(success=False).stderr)
        self.assertEqual(before, {path.name: path.read_bytes() for path in self.xpi.parent.iterdir()})

    def release_bytes(self):
        paths = [*self.xpi.parent.iterdir(), self.root / 'westlaw-us/dist/Westlaw Advantage US.js']
        return {str(path.relative_to(self.root)): path.read_bytes() for path in paths}

    def test_missing_resources_preserve_existing_release_and_translator(self):
        self.build()
        before = self.release_bytes()
        resources = [source for source in RESOURCES.values() if '/dist/' not in source]
        resources += ['westlaw-us/src/text.js', 'westlaw-us/m0/probe/Westlaw US M0 Probe.js']
        for resource in resources:
            with self.subTest(resource=resource):
                path = self.root / resource
                original = path.read_bytes()
                try:
                    path.unlink()
                    self.build(success=False)
                    self.assertEqual(before, self.release_bytes())
                    self.assertEqual(list(self.root.glob('.build-*')), [])
                finally:
                    path.write_bytes(original)

    def injected_build_failure(self, fault):
        # Patch only the disposable CLI process, never the repository builder or releases.
        wrapper = '''
import runpy, sys, zipfile
from pathlib import Path
from unittest.mock import patch
fault = sys.argv[2]
write_text = Path.write_text
replace = Path.replace
writestr = zipfile.ZipFile.writestr
failed = False
def failing_write(path, *args, **kwargs):
    if fault == 'feed-write' and path.name == 'updates.json':
        raise OSError('injected feed-write failure')
    return write_text(path, *args, **kwargs)
def failing_archive(archive, *args, **kwargs):
    writestr(archive, *args, **kwargs)
    if fault == 'archive-write':
        raise OSError('injected archive-write failure')
def failing_replace(path, target):
    global failed
    if fault == 'rollback' and (Path(target).name == 'updates.json' or
                                (path.name == 'restore' and Path(target).suffix == '.xpi')):
        raise OSError('injected rollback failure')
    if not failed and fault == Path(target).name:
        failed = True
        raise OSError('injected replacement failure')
    return replace(path, target)
with patch.object(Path, 'write_text', failing_write), patch.object(Path, 'replace', failing_replace), patch.object(zipfile.ZipFile, 'writestr', failing_archive):
    runpy.run_path(sys.argv[1], run_name='__main__')
'''
        result = subprocess.run([sys.executable, '-c', wrapper,
                                 str(self.root / 'scripts/build-plugin.py'), fault],
                                capture_output=True, encoding='utf-8', timeout=30)
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('injected', result.stderr)

    def test_packaging_and_partial_replacement_failures_preserve_existing_outputs(self):
        self.build()
        before = self.release_bytes()
        source = self.root / 'plugin/bootstrap.js'
        source.write_bytes(source.read_bytes() + b'\n// changed for failure regression\n')
        translator_source = self.root / 'westlaw-us/src/text.js'
        translator_source.write_bytes(b'var packagingFailureSentinel = true;\n' + translator_source.read_bytes())
        faults = ['archive-write', 'feed-write', 'Westlaw Advantage US.js', self.xpi.name,
                  'SHA256SUMS.txt', 'updates.json']
        for fault in faults:
            with self.subTest(fault=fault):
                self.injected_build_failure(fault)
                self.assertEqual(before, self.release_bytes())
                self.assertEqual(list(self.root.glob('.build-*')), [])
        self.build()
        self.assertNotEqual(before[str(self.xpi.relative_to(self.root))], self.xpi.read_bytes())
        digest = hashlib.sha256(self.xpi.read_bytes()).hexdigest()
        self.assertEqual((self.xpi.parent / 'SHA256SUMS.txt').read_text(), f'{digest}  {self.xpi.name}\n')
        updates = json.loads((self.xpi.parent / 'updates.json').read_text())
        self.assertEqual(updates['addons'][self.manifest['applications']['zotero']['id']]
                         ['updates'][0]['update_hash'], f'sha256:{digest}')

    def test_failed_new_version_removes_partial_new_outputs(self):
        self.build()
        before = self.release_bytes()
        self.manifest['version'] = '9.9.9-test'
        (self.root / 'plugin/manifest.json').write_text(json.dumps(self.manifest), encoding='utf-8')
        self.injected_build_failure('updates.json')
        self.assertEqual(before, self.release_bytes())
        self.assertFalse((self.xpi.parent / 'westlaw-advantage-us-9.9.9-test.xpi').exists())

    def test_incomplete_rollback_retains_recovery_files_and_removes_metadata(self):
        self.build()
        before = self.release_bytes()
        source = self.root / 'plugin/bootstrap.js'
        source.write_bytes(source.read_bytes() + b'\n// recovery regression\n')
        self.injected_build_failure('rollback')
        stages = list(self.root.glob('.build-*'))
        self.assertEqual(len(stages), 1)
        backups = [path.read_bytes() for path in stages[0].glob('backup-*')]
        for original in before.values():
            self.assertIn(original, backups)
        self.assertFalse((self.xpi.parent / 'SHA256SUMS.txt').exists())
        self.assertFalse((self.xpi.parent / 'updates.json').exists())


if __name__ == '__main__':
    unittest.main()
