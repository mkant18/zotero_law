"""Prove the single test command reports failures from either test runtime."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


class RunnerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='westlaw test runner ')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'scripts').mkdir()
        shutil.copyfile(Path(__file__).with_name('test.py'), self.root / 'scripts/test.py')
        for directory in ('plugin', 'westlaw-us/src/test', 'westlaw-us/tools/test',
                          'westlaw-us/m0/csl/test', 'westlaw-us/m0/probe/test'):
            suite = self.root / directory
            suite.mkdir(parents=True)
            (suite / 'smoke.test.mjs').write_text(
                "import { test } from 'node:test'; test('runner fixture', () => {});\n",
                encoding='utf-8',
            )
        self.python_test = self.root / 'scripts/test_fixture.py'
        self.python_test.write_text(
            'import unittest\nclass Fixture(unittest.TestCase):\n'
            '    def test_fixture(self): self.assertTrue(True)\n', encoding='utf-8',
        )

    def run_command(self, env=None):
        return subprocess.run([sys.executable, str(self.root / 'scripts/test.py')],
                              cwd=self.root.parent, capture_output=True,
                              encoding='utf-8', timeout=30, env=env)

    def test_success_from_another_directory(self):
        result = self.run_command()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('# pass 5', result.stdout)
        self.assertIn('Ran 1 test', result.stderr)

    def test_javascript_failure_is_not_hidden_by_passing_python(self):
        (self.root / 'plugin/smoke.test.mjs').write_text("throw Error('NODE_FAILURE');\n")
        result = self.run_command()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('NODE_FAILURE', result.stdout)
        self.assertIn('Ran 1 test', result.stderr)

    def test_python_failure_is_not_hidden_by_passing_javascript(self):
        self.python_test.write_text(self.python_test.read_text().replace('(True)', '(False)'))
        result = self.run_command()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('# pass 5', result.stdout)
        self.assertIn('FAILED', result.stderr)

    def test_missing_suite_fails_instead_of_silently_running_fewer_tests(self):
        (self.root / 'plugin/smoke.test.mjs').unlink()
        result = self.run_command()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('missing or empty', result.stderr)

    def test_both_runtime_failures_are_reported(self):
        (self.root / 'plugin/smoke.test.mjs').write_text("throw Error('NODE_FAILURE');\n", encoding='utf-8')
        self.python_test.write_text(
            self.python_test.read_text().replace('self.assertTrue(True)', "self.fail('PYTHON_FAILURE')"),
            encoding='utf-8',
        )
        result = self.run_command()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('NODE_FAILURE', result.stdout)
        self.assertIn('PYTHON_FAILURE', result.stderr)
        self.assertIn('Ran 1 test', result.stderr)

    def test_every_required_suite_must_exist_before_running_tests(self):
        for directory in ('plugin', 'westlaw-us/src/test', 'westlaw-us/tools/test',
                          'westlaw-us/m0/csl/test', 'westlaw-us/m0/probe/test'):
            with self.subTest(suite=directory):
                suite = self.root / directory
                test = suite / 'smoke.test.mjs'
                original = test.read_bytes()
                test.unlink()
                suite.rmdir()
                try:
                    result = self.run_command()
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn('missing or empty', result.stderr)
                    self.assertNotIn('# tests ', result.stdout)
                    self.assertNotIn('Ran ', result.stderr)
                finally:
                    suite.mkdir()
                    test.write_bytes(original)

    def test_discovers_all_matching_files_and_ignores_non_test_files(self):
        (self.root / 'plugin/extra behavior.test.mjs').write_text(
            "import { test } from 'node:test'; test('extra runner fixture', () => {});\n",
            encoding='utf-8',
        )
        (self.root / 'plugin/ignored.mjs').write_text("throw Error('SHOULD_NOT_RUN');\n", encoding='utf-8')
        (self.root / 'scripts/test_additional.py').write_text(
            'import unittest\nclass Additional(unittest.TestCase):\n'
            '    def test_extra(self): self.assertTrue(True)\n', encoding='utf-8',
        )
        (self.root / 'scripts/fixture_ignored.py').write_text("raise RuntimeError('SHOULD_NOT_RUN')\n", encoding='utf-8')
        result = self.run_command()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('extra runner fixture', result.stdout)
        self.assertIn('# pass 6', result.stdout)
        self.assertIn('test_extra', result.stderr)
        self.assertIn('Ran 2 tests', result.stderr)
        self.assertNotIn('SHOULD_NOT_RUN', result.stdout + result.stderr)

    def test_default_csl_python_uses_runner_interpreter(self):
        env = dict(os.environ)
        env.pop('CSL_PYTHON', None)
        (self.root / 'plugin/smoke.test.mjs').write_text(
            "import { test } from 'node:test'; import assert from 'node:assert/strict';\n"
            f"test('default interpreter', () => assert.equal(process.env.CSL_PYTHON, {json.dumps(sys.executable)}));\n",
            encoding='utf-8',
        )
        result = self.run_command(env)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('Ran 1 test', result.stderr)

    def test_explicit_csl_python_override_is_preserved(self):
        override = str(self.root / 'alternate python.exe')
        env = {**os.environ, 'CSL_PYTHON': override}
        (self.root / 'plugin/smoke.test.mjs').write_text(
            "import { test } from 'node:test'; import assert from 'node:assert/strict';\n"
            f"test('explicit interpreter', () => assert.equal(process.env.CSL_PYTHON, {json.dumps(override)}));\n",
            encoding='utf-8',
        )
        result = self.run_command(env)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('Ran 1 test', result.stderr)
