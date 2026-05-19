import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes import auth, users, shops, items, orders, sales, sync, reports, companies, price_types
from app.db.database import engine
from app.db.base import Base
from app.db.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

from fastapi.staticfiles import StaticFiles

# Create tables (In a real app, use Alembic migrations instead)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME, openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Mount static uploads folder
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(shops.router, prefix=f"{settings.API_V1_STR}/shops", tags=["shops"])
app.include_router(items.router, prefix=f"{settings.API_V1_STR}/items", tags=["items"])
app.include_router(companies.router, prefix=f"{settings.API_V1_STR}/companies", tags=["companies"])
app.include_router(price_types.router, prefix=f"{settings.API_V1_STR}/price-types", tags=["price-types"])
app.include_router(orders.router, prefix=f"{settings.API_V1_STR}/orders", tags=["orders"])
app.include_router(sales.router, prefix=f"{settings.API_V1_STR}/sales", tags=["sales"])
app.include_router(sync.router, prefix=f"{settings.API_V1_STR}/sync", tags=["sync"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["reports"])


@app.get("/")
def root():
    """Avoid 404 when opening the server base URL in a browser."""
    return {
        "name": settings.PROJECT_NAME,
        "docs": "/docs",
        "openapi": f"{settings.API_V1_STR}/openapi.json",
        "api_prefix": settings.API_V1_STR,
    }


@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                hashed_password=get_password_hash("admin"),
                role="admin",
                is_active=True
            )
            db.add(admin_user)
        else:
            # Force admin to be active if it already exists to prevent lockouts
            admin_user.is_active = True
        db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    import uvicorn

    # Legacy conhost may show ANSI as "?[32m"; Windows Terminal sets WT_SESSION and supports colors.
    use_colors = (
        sys.stdout.isatty()
        and (sys.platform != "win32" or os.environ.get("WT_SESSION") is not None)
    )
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        use_colors=use_colors,
    )

