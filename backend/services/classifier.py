import sqlalchemy.orm as orm
import models
import schemas
import fastapi
import datetime as dt
import os
import pandas as pd
import random

# from preprocessing.classifier import pipeline, predict
from preprocessing.classifier import pipeline, predict

from services.segments import segment_selector
from services.labels import get_labels
import services.prototypes as prototype_services

async def audio_selector(filename: str, user: schemas.User, db: orm.Session):
    audio = db.query(models.Audio).filter_by(owner_id=user.id).filter(models.Audio.filename == filename).first()
    if audio is None:
        raise fastapi.HTTPException(status_code=404, detail="Audio doesn't exist")
    return audio

# Change Status
async def change_status(start: str, end: str, status: str, user: schemas.User, db: orm.Session):
    audio_files = db.query(models.Audio).filter_by(owner_id=user.id).filter(models.Audio.status == 'Complete').filter(models.Audio.validation != True).all()
    startDate = dt.datetime(*list(map(int, start.split('-'))))
    endDate = dt.datetime(*list(map(int, end.split('-'))))

    for audio in audio_files:
        dateCreated = dt.datetime(*list(map(int, audio.date_created.split('-'))))
        if ((dateCreated >= startDate) and (dateCreated <= endDate)):
            instance_db = db.query(models.Audio).filter_by(owner_id=user.id).filter(models.Audio.filename == audio.filename).first()
            instance_db.status = status
            db.commit()
            db.refresh(instance_db)
    return "Status Updated"


async def export(user: schemas.User, db: orm.Session, start:str='2020-01-01', end:str='2200-01-01'):
    await create_validation(user, db)
    segments = db.query(models.Segments).filter_by(owner_id=user.id).all() # .filter(models.Segments.status == 'Complete')
    startDate = dt.datetime(*list(map(int, start.split('-'))))
    endDate = dt.datetime(*list(map(int, end.split('-'))))

    training_set = []
    columns = ['Filename', 'Validation', 'Label', 'Start', 'End']

    MODEL_PATH = f'./static/{user.id}/model'
    if not os.path.exists(MODEL_PATH):
        os.makedirs(MODEL_PATH, exist_ok=True)

    for segment in segments:
        dateCreated = dt.datetime(*list(map(int, segment.date_created.split('-'))))

        if ((dateCreated >= startDate) and (dateCreated <= endDate)):
            seg = [segment.filename, 
                   segment.validation, 
                   segment.label, 
                   segment.start,
                   segment.end]
            training_set.append(seg)

    df_training = pd.DataFrame(training_set, columns=columns)
    df_training.to_csv(f"./static/{user.id}/model/annotations.csv")
    return df_training.to_dict()

async def create_validation(user: schemas.User, db: orm.Session):
    # Sets validation dataset, maintains 20/80 val-training split
    segments = db.query(models.Segments).filter_by(owner_id=user.id).filter(models.Segments.status == 'Complete').all()
    validation = db.query(models.Segments).filter_by(owner_id=user.id).filter(models.Segments.status == 'Complete').filter(models.Segments.validation == True).all()

    def prob(segments, validation, target=0.2):
        p = target - len(validation)/len(segments)
        return p if (p > 0) else None

    def decision(probability):
        return random.random() < probability
    
    if len(segments) > 0:
        p = prob(segments, validation)
    else:
        p = None

    if p:
        for segment in segments:
            if decision(p): 
                segment_db = await segment_selector(segment.filename, user, db)
                segment_db.validation = True
                db.commit()
                db.refresh(segment_db)
    return segments

async def classifier(user: schemas.User, db: orm.Session, background_task):
    await create_validation(user, db)
    segs = await export(user, db)

    print(len(segs['Filename']))
    if len(segs['Filename']) < 10:
        raise fastapi.HTTPException(status_code=405, detail="Insufficient training data")
    else:
        MODEL_PATH = f'./static/{user.id}/model'
        if not os.path.exists(MODEL_PATH):
            os.makedirs(MODEL_PATH, exist_ok=True)

        classes = await get_labels(user, db)
        labels = []
        for label in classes.keys():
            labels.append(label)

        # Make background task
        print("training...")
        background_task.add_task(pipeline, user, labels)

        # Set all segments to trained
        segments = db.query(models.Segments).filter_by(owner_id=user.id).filter(models.Segments.status == 'Complete').all()
        for segment in segments:
            segment_db = await segment_selector(segment.filename, user, db)
            segment_db.status = "Trained"
            db.commit()
            db.refresh(segment_db)

        # Update prototypes
        print("Updating prototypes...")
        await prototype_services.generate_supports(user, db)

        # Remove this once training tab not required
        stats = {
            'loss': [1],
            'accuracy': [1],
            'val_loss': [1],
            'val_accuracy': [1]
        }

        return stats

async def prediction(segment, user: schemas.User, db: orm.Session):
    classes = await get_labels(user, db)
    labels = []
    for label in classes.keys():
        labels.append(label)

    pred, confidence = predict(segment, user, labels)

    segment_db = await segment_selector(segment, user, db)

    if confidence < 0.7:
        segment_db.label = 'unknown'
    else:
        segment_db.label = pred 
        
    segment_db.status = "Automatic"
    segment_db.confidence = confidence
    db.commit()
    db.refresh(segment_db)

    return pred

