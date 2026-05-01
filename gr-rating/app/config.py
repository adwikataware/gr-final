from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://gruser:grpass@localhost:5433/gr_rating"
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    meilisearch_url: str = "http://localhost:7700"
    meilisearch_api_key: str = ""
    openalex_email: str = "your-email@example.com"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
