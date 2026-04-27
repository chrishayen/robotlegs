import json
from pathlib import Path

CONFIG_DIR = Path.home() / ".robotlegs"
CONFIG_PATH = CONFIG_DIR / "config.json"

DEFAULT_CONFIG = {
    "endpoints": [],
}


def load_config():
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH, "r") as f:
            data = json.load(f)
            return {
                "endpoints": data.get("endpoints", []),
            }
    return DEFAULT_CONFIG.copy()


def save_config(config):
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2)