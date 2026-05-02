"""Top-level pytest conftest for the Playwright suite.

Ensures the Playwright-managed Chromium binary can find the system
libraries it needs at runtime. On Replit's NixOS environment these
libraries live under /nix/store and are not on the default loader
path, so we point LD_LIBRARY_PATH at the directories that contain
the libs Chromium dlopens (libgbm, libudev, etc.).

The discovery scans /nix/store, which is large, so the result is
cached to a small file under .pytest_cache to keep test startup
fast on repeat runs.

This must run at import time (before pytest-playwright's `browser`
fixture launches Chromium), which is why it lives at module top of
a top-level conftest.py.
"""

import os


_NIX_STORE = '/nix/store'
_CACHE_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    '..', '.pytest_cache', 'playwright_ld_paths',
)


def _find_lib_dir(name_substr: str, lib_filename: str) -> str | None:
    try:
        entries = os.listdir(_NIX_STORE)
    except OSError:
        return None
    for entry in entries:
        if name_substr not in entry:
            continue
        lib_dir = os.path.join(_NIX_STORE, entry, 'lib')
        candidate = os.path.join(lib_dir, lib_filename)
        if os.path.exists(candidate):
            return lib_dir
    return None


def _discover_extra_dirs() -> list[str]:
    dirs: list[str] = []
    gbm_dir = _find_lib_dir('mesa-libgbm', 'libgbm.so.1') or \
        _find_lib_dir('mesa', 'libgbm.so.1')
    if gbm_dir:
        dirs.append(gbm_dir)
    udev_dir = _find_lib_dir('systemd-', 'libudev.so.1')
    if udev_dir:
        dirs.append(udev_dir)
    return dirs


def _load_cached_dirs() -> list[str] | None:
    try:
        with open(_CACHE_PATH, 'r', encoding='utf-8') as fh:
            cached = [line.strip() for line in fh if line.strip()]
    except OSError:
        return None
    if not cached:
        return None
    # Validate that every cached dir still has the expected file.
    expected = {
        'libgbm.so.1': False,
        'libudev.so.1': False,
    }
    for d in cached:
        for lib in expected:
            if os.path.exists(os.path.join(d, lib)):
                expected[lib] = True
    if not all(expected.values()):
        return None
    return cached


def _save_cached_dirs(dirs: list[str]) -> None:
    try:
        os.makedirs(os.path.dirname(_CACHE_PATH), exist_ok=True)
        with open(_CACHE_PATH, 'w', encoding='utf-8') as fh:
            fh.write('\n'.join(dirs) + '\n')
    except OSError:
        pass


def _augment_ld_library_path() -> None:
    extra_dirs = _load_cached_dirs()
    if extra_dirs is None:
        extra_dirs = _discover_extra_dirs()
        if extra_dirs:
            _save_cached_dirs(extra_dirs)

    if not extra_dirs:
        return

    current = os.environ.get('LD_LIBRARY_PATH', '')
    parts = [p for p in current.split(':') if p]
    for d in extra_dirs:
        if d not in parts:
            parts.insert(0, d)
    os.environ['LD_LIBRARY_PATH'] = ':'.join(parts)


_augment_ld_library_path()
