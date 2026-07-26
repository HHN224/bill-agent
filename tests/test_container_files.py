import json
from pathlib import Path
import re


PROJECT_ROOT = Path(__file__).resolve().parents[1]



def test_dockerfile_defines_non_root_production_runtime() -> None:
    dockerfile_path = PROJECT_ROOT / "Dockerfile"
    assert dockerfile_path.is_file(), "Dockerfile must exist at the project root."

    content = dockerfile_path.read_text(encoding="utf-8")
    instructions = [
        line.strip()
        for line in content.splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]

    from_instruction = instructions[0]
    image_match = re.fullmatch(
        r"FROM python:(\d+)\.(\d+)-slim(?:-[a-z0-9]+)?",
        from_instruction,
    )
    assert image_match is not None
    assert tuple(map(int, image_match.groups())) >= (3, 11)

    assert "COPY requirements.txt ./" in instructions
    assert (
        "RUN python -m pip install --no-cache-dir -r requirements.txt"
        in instructions
    )
    assert "COPY --chown=app:app app ./app" in instructions
    assert "COPY . ." not in instructions

    user_index = instructions.index("USER app")
    command_index = next(
        index
        for index, instruction in enumerate(instructions)
        if instruction.startswith("CMD ")
    )
    assert user_index < command_index

    command = json.loads(instructions[command_index].removeprefix("CMD "))
    assert command == [
        "uvicorn",
        "app.main:app",
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
        "--no-access-log",
    ]
    assert "--reload" not in content


def test_dockerignore_excludes_secrets_and_local_artifacts() -> None:
    dockerignore_path = PROJECT_ROOT / ".dockerignore"
    assert dockerignore_path.is_file(), (
        ".dockerignore must exist at the project root."
    )

    patterns = {
        line.strip()
        for line in dockerignore_path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    }
    assert {
        ".git/",
        ".venv/",
        ".env*",
        "data/",
        "**/__pycache__/",
        "**/*.py[cod]",
        ".pytest_cache/",
        ".pytest-tmp/",
        "tests/",
    } <= patterns


def test_compose_defines_private_app_and_isolated_caddy() -> None:
    compose_path = PROJECT_ROOT / "docker-compose.yml"
    assert compose_path.is_file(), (
        "docker-compose.yml must exist at the project root."
    )

    content = compose_path.read_text(encoding="utf-8")
    assert "app:" in content
    assert "caddy:" in content
    assert "env_file:" in content
    assert "- .env" in content
    assert "${DATA_HOST_DIR:-./data}:/app/data" in content
    assert 'expose:\n      - "8000"' in content
    assert "8000:8000" not in content
    assert "DOMAIN: ${DOMAIN:?Set DOMAIN in .env}" in content
    assert "caddy_data:/data" in content
    assert "caddy_config:/config" in content
    assert content.count("restart: unless-stopped") == 2
    assert 'max-size: "10m"' in content
    assert 'max-file: "3"' in content


def test_caddyfile_terminates_https_for_the_configured_domain() -> None:
    caddyfile_path = PROJECT_ROOT / "Caddyfile"
    assert caddyfile_path.is_file(), (
        "Caddyfile must exist at the project root."
    )

    content = caddyfile_path.read_text(encoding="utf-8")
    assert "{$DOMAIN}" in content
    assert "reverse_proxy app:8000" in content
    assert "http://" not in content


def test_deployment_runbook_covers_required_operations() -> None:
    runbook_path = PROJECT_ROOT / "docs" / "deployment.md"
    assert runbook_path.is_file(), (
        "docs/deployment.md must provide the production runbook."
    )

    content = runbook_path.read_text(encoding="utf-8")
    required_fragments = {
        "docker compose config --quiet",
        "docker compose up -d --build",
        "docker compose up -d --force-recreate app",
        "docker compose logs",
        "sqlite3",
        ".backup",
        "\\%F",
        "-mtime +30",
        "PRAGMA integrity_check",
        "docker compose down -v",
        "DATA_HOST_DIR",
        "BACKUP_HOST_DIR",
        "APP_API_TOKEN",
        "A/AAAA",
        "80/443",
        "SSH",
    }
    missing = sorted(
        fragment for fragment in required_fragments if fragment not in content
    )
    assert not missing, f"Runbook is missing required operations: {missing}"

    readme = (PROJECT_ROOT / "README.md").read_text(encoding="utf-8")
    assert "docs/deployment.md" in readme
