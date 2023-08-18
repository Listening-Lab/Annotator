import sqlalchemy.orm as orm
import models
import schemas
import fastapi
import os

async def get_labels(user: schemas.User, db: orm.Session):
    keys = db.query(models.Settings.labels).filter_by(owner_id=user.id).all()
    values = db.query(models.Settings.colours).filter_by(owner_id=user.id).all()
    labels = {keys[i][0]: f'{values[i][0]}55' for i in range(len(keys))}
    return labels

async def add_label(settings: schemas.SettingsCreate, user: schemas.User, db: orm.Session):
    existing = len(db.query(models.Settings).filter_by(owner_id=user.id).filter_by(labels=settings.labels).all())

    if not existing: # Prevent duplicates
        db_settings = models.Settings(**settings.dict(), owner_id=user.id)
        db.add(db_settings)
        db.commit()
        db.refresh(db_settings)
        return schemas.Settings.from_orm(db_settings)

async def update_label(settings: schemas.SettingsCreate, user: schemas.User, db: orm.Session):
    settings_db = db.query(models.Settings).filter_by(owner_id=user.id).filter_by(labels=settings.labels).first()
    settings_db.colours = settings.colours
    db.commit()
    db.refresh(settings_db)

async def delete_label(label: str, user: schemas.User, db: orm.Session):
    label_object = db.query(models.Settings).filter_by(owner_id=user.id).filter(models.Settings.labels == label).first()

    if label_object is None:
        raise fastapi.HTTPException(status_code=404, detail="Label doesn't exist")
    else:
        if os.path.exists(f"./static/{user.id}/prototypes/{label}.npy"):
            os.remove(f"./static/{user.id}/prototypes/{label}.npy")
        db.delete(label_object)
        db.commit()
