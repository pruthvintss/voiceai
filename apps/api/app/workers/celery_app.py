from __future__ import annotations

from celery import Celery
from celery.signals import worker_process_init

from app.core.config import settings

celery_app = Celery(
    "voice_ai_workers",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.workers.post_call_worker",
        "app.workers.memory_worker",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.workers.post_call_worker.*": {"queue": "post_call"},
        "app.workers.memory_worker.*": {"queue": "memory"},
    },
    task_default_queue="default",
    task_queues={
        "default": {},
        "post_call": {},
        "memory": {},
    },
    result_expires=3600,
    task_soft_time_limit=300,   # 5 minutes soft limit
    task_time_limit=600,        # 10 minutes hard limit
    broker_connection_retry_on_startup=True,
)


@worker_process_init.connect
def init_worker_process(**kwargs):
    """Initialize resources for each worker process."""
    import asyncio
    import structlog

    log = structlog.get_logger(__name__)
    log.info("Celery worker process initialized")
