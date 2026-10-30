"""Prove the single test command reports failures from either test runtime."""
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

    def run_command(self):
        return subprocess.run([sys.executable, str(self.root / 'scripts/test.py')],
                              cwd=self.root.parent, capture_output=True,
                              encoding='utf-8', timeout=30)

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
