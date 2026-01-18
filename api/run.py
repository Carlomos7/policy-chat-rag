"""Entrypoint for running the API server."""

import uvicorn

from app.config.settings import get_settings


def main():
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug_mode,
    )


if __name__ == "__main__":
    main()
