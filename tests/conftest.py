from collections.abc import Iterator
from pathlib import Path
import tempfile

import pytest


@pytest.fixture
def tmp_path() -> Iterator[Path]:
    """在 Windows 上提供项目内可写的临时目录。"""
    temp_root = Path(".pytest_cache") / "tmp"
    temp_root.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=temp_root) as directory:
        yield Path(directory)
