import sqlalchemy.orm as orm
import models
import schemas

from services.labels import get_labels

# Visualisation UPDATED
async def audio_count(user: schemas.User, db: orm.Session):
    segments = db.query(models.Segments).filter_by(owner_id=user.id)

    total = len(segments.all())
    complete = len(segments.filter(models.Segments.status == 'Complete').all())
    incomplete = len(segments.filter(models.Segments.status == 'auto').all())

    stats = {
        'total': total,
        'dist': {
            'complete': complete,
            'incomplete': incomplete
            }
    }
    return stats

# UPDATED
async def annotation_count(user: schemas.User, db: orm.Session):
    segments = db.query(models.Segments).filter_by(owner_id=user.id).all()
    classes = await get_labels(user, db)

    keys = []
    for label in classes.keys():
        keys.append(label)

    labels = dict.fromkeys(keys, 0)
    for segment in segments:
        if segment.label in labels:
            labels[segment.label] = labels[segment.label] + 1
    return labels


# UPDATED
async def val_percentage(user: schemas.User, db: orm.Session):
    segments = db.query(models.Segments).filter_by(owner_id=user.id)
    val = len(segments.filter(models.Segments.validation == True).all())
    stats = {'validation': val}
    return stats