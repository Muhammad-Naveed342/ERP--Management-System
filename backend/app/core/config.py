from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Business Order & Sales Management API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7" # MUST CHANGE IN PRODUCTION
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8 # 8 days
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/business_db"

    class Config:
        env_file = ".env"

settings = Settings()
