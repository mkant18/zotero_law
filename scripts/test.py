"""Run every project suite, including isolated release builds, from any directory."""
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def main():
    suites = [ROOT / directory for directory in (
        'plugin', 'westlaw-us/src/test', 'westlaw-us/tools/test',
        'westlaw-us/m0/csl/test', 'westlaw-us/m0/probe/test',
    )]
    tests = sorted(test for suite in suites for test in suite.glob('*.test.mjs'))
    if any(not list(suite.glob('*.test.mjs')) for suite in suites):
        raise SystemExit('A required test suite is missing or empty')
    env = {**os.environ, 'CSL_PYTHON': os.environ.get('CSL_PYTHON', sys.executable)}
    result = subprocess.run(['node', '--test', *map(str, tests)], cwd=ROOT, env=env)
    builds = subprocess.run([
        sys.executable, '-m', 'unittest', 'discover', '-s', str(ROOT / 'scripts'),
        '-p', 'test_*.py', '-v',
    ], cwd=ROOT, env=env)
    return int(result.returncode != 0 or builds.returncode != 0)


if __name__ == '__main__':
    sys.exit(main())
