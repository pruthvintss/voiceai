from fastapi import APIRouter

from app.api.v1 import analytics, api_keys, auth, conversations, memory, tools, workspaces

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(workspaces.router)
api_router.include_router(api_keys.router)
api_router.include_router(conversations.router)
api_router.include_router(memory.router)
api_router.include_router(tools.router)
api_router.include_router(analytics.router)
