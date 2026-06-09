"""Beauty Test Suite Runner — Single-file entry point.

Run ALL beauty tests in headed Playwright mode:

    python -m pytest Playwright/steps/beauty/_1_beauty_test_runnner.py -v

Or from this file directly:

    python Playwright/steps/beauty/_1_beauty_test_runnner.py

Every test module under Playwright/steps/beauty/ is collected and executed
sequentially with a visible Chromium browser (--headed).
"""

import sys
import os
import pytest


def main() -> int:
    # ── Ensure the workspace root is on sys.path so absolute imports
    #    like `Playwright.Hooks.hooks` resolve correctly.
    workspace_root = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..")
    )
    if workspace_root not in sys.path:
        sys.path.insert(0, workspace_root)

    # ── Directory that holds all the test_beauty_*.py modules
    beauty_steps_dir = os.path.dirname(os.path.abspath(__file__))

    # ── Discover every test module (test_beauty_*.py) automatically
    test_modules = sorted(
        os.path.join(beauty_steps_dir, f)
        for f in os.listdir(beauty_steps_dir)
        if f.startswith("test_beauty_") and f.endswith(".py")
    )

    if not test_modules:
        print("ERROR: No test_beauty_*.py files found in", beauty_steps_dir)
        return 1

    # ── Check if parallel execution (-n) or headless mode is requested
    is_parallel = any(arg.startswith("-n") for arg in sys.argv)
    is_headless = "--headless" in sys.argv or is_parallel

    print(f"\n{'='*60}")
    print(f"  Beauty Test Suite — {len(test_modules)} test modules")
    if is_headless:
        print(f"  Mode: HEADLESS (fast, parallel/optimized)")
    else:
        print(f"  Mode: HEADED (visible browser)")
    print(f"{'='*60}")
    for i, mod in enumerate(test_modules, 1):
        print(f"  {i:>2}. {os.path.basename(mod)}")
    print(f"{'='*60}\n")

    # ── Move to workspace root so pytest discovers paths relative to it
    os.chdir(workspace_root)

    # ── Build the pytest argument list
    pytest_args = [
        "--browser", "chromium",
        "Playwright/steps/beauty",
    ]

    if not is_headless:
        pytest_args.append("--headed")
        pytest_args.append("--tracing")
        pytest_args.append("on")

    # Filter out --headless from arguments so pytest does not complain
    user_args = [arg for arg in sys.argv[1:] if arg != "--headless"]
    pytest_args.extend(user_args)

    return pytest.main(pytest_args)


if __name__ == "__main__":
    raise SystemExit(main())
