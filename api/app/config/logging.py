"""
Logging configuration for ETL pipeline using dictConfig.
"""

import json
import logging
import logging.config
from pathlib import Path
from app.config.settings import get_settings

settings = get_settings()
APP_NAME = settings.app_name


def setup_logging() -> logging.Logger:
    """
    Configure logging using JSON config file.
    Environment differences handled by settings (log_level, log_to_file).
    """

    # Load JSON config
    config_file = settings.logging_config_file

    if not config_file.exists():
        raise FileNotFoundError(f"Logging configuration not found: {config_file}")

    with open(config_file, "r", encoding="utf-8") as f:
        config = json.load(f)

    # Apply log level from settings to all loggers
    for logger_config in config.get("loggers", {}).values():
        logger_config["level"] = settings.log_level

    # Update log file paths
    if settings.log_to_file:
        settings.log_dir.mkdir(parents=True, exist_ok=True)

        for handler in config.get("handlers", {}).values():
            if "filename" in handler:
                filename = Path(handler["filename"]).name
                handler["filename"] = str(settings.log_dir / filename)
    else:
        # Remove file handlers if log_to_file is False
        config["handlers"] = {
            k: v
            for k, v in config.get("handlers", {}).items()
            if v.get("class") != "logging.handlers.RotatingFileHandler"
        }

        # Update loggers to only use console
        for logger_config in config.get("loggers", {}).values():
            logger_config["handlers"] = ["console"]

    # Apply the configuration
    logging.config.dictConfig(config)

    # Get and return the logger
    logger = logging.getLogger(settings.app_name)
    logger.info("Logging initialized - Level: %s", settings.log_level)

    return logger


def get_logger(name: str = None) -> logging.Logger:
    """
    Get a logger for a specific module.
    
    If name starts with 'app.', returns that logger directly (matches config).
    Otherwise returns the root 'app' logger.
    """
    if name and name.startswith("app"):
        return logging.getLogger(name)
    return logging.getLogger("app")