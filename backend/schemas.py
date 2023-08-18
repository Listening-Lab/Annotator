import datetime as dt
import pydantic

# User schemas
class UserBase(pydantic.BaseModel):
    email: str

class UserCreate(UserBase):
    hashed_password: str

    class Config:
        orm_mode = True

class User(UserBase):
    id: int
    verified: bool
    admin: bool

    class Config:
        orm_mode = True

# Audio schemas
class AudioBase(pydantic.BaseModel):
    filename: str
    status: str
    validation: bool
    confidence: float
    completion: float

class AudioCreate(AudioBase):
    pass

class Audio(AudioBase):
    id: int
    owner_id: int
    date_created: str
    date_updated: str

    class Config:
        orm_mode = True

# User setting schemas
class SettingsBase(pydantic.BaseModel):
    labels: str
    colours: str
    # sr: int

class SettingsCreate(SettingsBase):
    pass

class Settings(SettingsBase):
    id: int
    owner_id: int

    class Config:
        orm_mode = True

# Segments schemas
class SegmentBase(pydantic.BaseModel):
    filename: str
    status: str
    validation: bool
    start: float
    end: float
    x: float
    y: float
    confidence: float
    cluster: float
    label: str

class SegmentCreate(SegmentBase):
    pass

class Segment(SegmentBase):
    id: int
    owner_id: int
    date_created: str
    date_updated: str

    class Config:
        orm_mode = True