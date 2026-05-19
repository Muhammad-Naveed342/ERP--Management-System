from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str


class UserBrief(BaseModel):
    id: int
    username: str
    role: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserBrief


class TokenPayload(BaseModel):
    sub: str | None = None
