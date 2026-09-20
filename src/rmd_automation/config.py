from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class RMDConfig:
    launchpad_url: str
    username: str
    password: str
    headless: bool
    default_timeout_ms: int


def load_config() -> RMDConfig:
    """Carga la configuración desde variables de entorno (ver .env.example)."""
    missing = [
        name
        for name in ("RMD_LAUNCHPAD_URL", "RMD_USERNAME", "RMD_PASSWORD")
        if not os.environ.get(name)
    ]
    if missing:
        raise RuntimeError(
            "Faltan variables de entorno requeridas: "
            + ", ".join(missing)
            + ". Copia .env.example a .env y complétalo."
        )
    return RMDConfig(
        launchpad_url=os.environ["RMD_LAUNCHPAD_URL"],
        username=os.environ["RMD_USERNAME"],
        password=os.environ["RMD_PASSWORD"],
        headless=os.environ.get("RMD_HEADLESS", "true").lower() == "true",
        default_timeout_ms=int(os.environ.get("RMD_TIMEOUT_MS", "30000")),
    )
