"""Celery application configuration."""
from celery import Celery
from celery.schedules import crontab
from app.config import settings

celery_app = Celery(
    "gr_rating",
    broker=settings.celery_broker_url,
    backend=settings.redis_url,
    include=["app.workers.compute_scores"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        "nightly-refresh-all": {
            "task": "app.workers.compute_scores.batch_refresh_all",
            "schedule": crontab(hour=2, minute=0),  # 2 AM IST
        },
        "weekly-clear-fwci-cache": {
            "task": "app.workers.compute_scores.weekly_fwci_cache_clear",
            "schedule": crontab(hour=3, minute=0, day_of_week="sunday"),  # Sunday 3 AM IST
        },
    },
)
