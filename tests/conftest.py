from collections.abc import Iterator
from pathlib import Path
import tempfile

import pytest


@pytest.fixture
def tmp_path() -> Iterator[Path]:
    """Provide a writable project-local temporary directory on Windows."""
    temp_root = Path(".pytest_cache") / "tmp"
    temp_root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=temp_root) as directory:
        yield Path(directory)
