from pydantic import BaseModel, ConfigDict, Field


class RealityKeysResponse(BaseModel):
    private_key: str
    public_key: str
    short_id: str


class SniProfileBase(BaseModel):
    carrier: str = Field(..., min_length=1, max_length=100)
    domain: str = Field(..., min_length=1, max_length=255)
    is_active: bool = True


class SniProfileCreate(SniProfileBase):
    pass


class SniProfileUpdate(BaseModel):
    carrier: str | None = Field(default=None, min_length=1, max_length=100)
    domain: str | None = Field(default=None, min_length=1, max_length=255)
    is_active: bool | None = None


class SniProfileResponse(SniProfileBase):
    id: int
    node_id: int

    model_config = ConfigDict(from_attributes=True)


class NodeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    host: str = Field(..., min_length=1, max_length=255)
    location: str = Field(default="", max_length=100)
    flag: str = Field(default="🌐", max_length=10)
    grpc_port: int = Field(default=10085, ge=1, le=65535)
    inbound_port: int = Field(default=443, ge=1, le=65535)


class NodeCreate(NodeBase):
    reality_private_key: str | None = None
    reality_public_key: str | None = None
    reality_short_id: str | None = None
    sni_profiles: list[SniProfileCreate] = []


class NodeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    host: str | None = Field(default=None, min_length=1, max_length=255)
    location: str | None = Field(default=None, max_length=100)
    flag: str | None = Field(default=None, max_length=10)
    grpc_port: int | None = Field(default=None, ge=1, le=65535)
    inbound_port: int | None = Field(default=None, ge=1, le=65535)
    reality_private_key: str | None = None
    reality_public_key: str | None = None
    reality_short_id: str | None = None
    is_active: bool | None = None


class NodeResponse(NodeBase):
    id: int
    reality_private_key: str
    reality_public_key: str
    reality_short_id: str
    is_active: bool
    sni_profiles: list[SniProfileResponse] = []

    model_config = ConfigDict(from_attributes=True)
