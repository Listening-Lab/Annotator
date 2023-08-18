import database
import sqlalchemy.orm as orm
import models
import schemas
import passlib.hash as hash
import jwt
import fastapi
import fastapi.security as security
import os
import shutil

from dotenv import dotenv_values

config_credentials = dict(dotenv_values(".env"))
oauth2schema = security.OAuth2PasswordBearer(tokenUrl="/api/token")

def create_database():
    return database.Base.metadata.create_all(bind=database.engine)
    
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_user_by_email(email: str, db: orm.Session):
    return db.query(models.User).filter(models.User.email == email).first()

async def create_user(user: schemas.UserCreate, db: orm.Session):
    user_object = models.User(email=user.email, hashed_password=hash.bcrypt.hash(user.hashed_password))
    db.add(user_object)
    db.commit()
    db.refresh(user_object)

    # Add default user settings (UNNECESSARY? default set in models.py)
    default = models.Settings(labels='unknown', owner_id=user_object.id)
    db.add(default)
    db.commit()
    db.refresh(default)

    return user_object

async def authenticate_user(email: str, password: str, db: orm.Session):
    user = await get_user_by_email(email,db)
    if not user:
        return False
    if not user.verify_password(password):
        return False
    return user

async def create_token(user_data: models.User):
    user_object = schemas.User.from_orm(user_data)
    token = jwt.encode(user_object.dict(), config_credentials['SECRET'])
    return dict(access_token=token, token_type='bearer')

async def get_current_user(db: orm.Session = fastapi.Depends(get_db), token: str = fastapi.Depends(oauth2schema)):
    try:
        payload = jwt.decode(token, config_credentials['SECRET'], algorithms=["HS256"])
        user = db.query(models.User).get(payload['id'])
        if user==None:
            # Additional catch in case user has token that does not correspond to a valid user
            raise fastapi.HTTPException(status_code=401, detail='Invalid Email or password')
    except:
        raise fastapi.HTTPException(status_code=401, detail='Invalid Email or password')
    return schemas.User.from_orm(user)

async def delete_user(user: schemas.User, db: orm.Session):
    user = db.query(models.User).filter_by(id=user.id).first()
    try:
        if os.path.exists(f"./static/{user.id}"):
            shutil.rmtree(f"./static/{user.id}")
        if os.path.exists(f"./classifier/{user.id}"):
            shutil.rmtree(f"./classifier/{user.id}")

        db.delete(user)
        db.commit()
    except:
        raise fastapi.HTTPException(status_code=405, detail="User doesn't exist")

async def verify(user: schemas.User, db: orm.Session):
    user_db = db.query(models.User).filter_by(id=user.id).first()
    user_db.verified = True
    db.add(user_db)
    db.commit()
    db.refresh(user_db)
    print('verified')

async def set_sample_rate(sr:int, user: schemas.UserCreate, db: orm.Session):
    settings_db = db.query(models.Settings).filter_by(owner_id=user.id).first()
    settings_db.sr = sr
    db.commit()
    db.refresh(settings_db)

async def get_sample_rate(user: schemas.UserCreate, db: orm.Session):
    settings = db.query(models.Settings).filter_by(owner_id=user.id).first()
    return settings.sr