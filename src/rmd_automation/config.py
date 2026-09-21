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
    login_manual: bool = False
    cdp_url: str = ""


def load_config() -> RMDConfig:
    """Carga la configuración desde variables de entorno (ver .env.example)."""
    cdp = os.environ.get("RMD_CDP_URL", "")
    manual = cdp != "" or os.environ.get("RMD_LOGIN_MANUAL", "false").lower() == "true"
    requeridas = ("RMD_LAUNCHPAD_URL",) if manual else ("RMD_LAUNCHPAD_URL", "RMD_USERNAME", "RMD_PASSWORD")
    missing = [name for name in requeridas if not os.environ.get(name)]
    if missing:
        raise RuntimeError(
            "Faltan variables de entorno requeridas: "
            + ", ".join(missing)
            + ". Copia .env.example a .env y complétalo."
        )
    return RMDConfig(
        launchpad_url=os.environ["RMD_LAUNCHPAD_URL"],
        username=os.environ.get("RMD_USERNAME", ""),
        password=os.environ.get("RMD_PASSWORD", ""),
        # Con login manual la ventana debe ser visible para que la persona inicie sesión.
        headless=False if manual else os.environ.get("RMD_HEADLESS", "true").lower() == "true",
        default_timeout_ms=int(os.environ.get("RMD_TIMEOUT_MS", "30000")),
        login_manual=manual,
        cdp_url=cdp,
    )
