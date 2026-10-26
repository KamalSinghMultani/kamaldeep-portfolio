"""Run the portfolio checks after `python site/build.py`, from any directory."""

from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def main():
    for check in sorted((ROOT / "tools").glob("check-*.cjs")):
        print(f"Checking {check.name}", flush=True)
        subprocess.run(["node", str(check)], cwd=ROOT, check=True)
    subprocess.run([sys.executable, "tools/check-release.py"], cwd=ROOT, check=True)
    print("All portfolio checks passed.", flush=True)


if __name__ == "__main__":
    main()
