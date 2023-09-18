import sqlalchemy.orm as orm
import models
import schemas
import fastapi
from fastapi import File, UploadFile
import librosa
import os
import time
import numpy as np
from pydub import AudioSegment

from preprocessing.denoise import denoiseAudio
from preprocessing.segmentation.extract_regions import get_regions as get_segs

from services.labels import get_labels
from services.segments import segment_selector, get_segments

async def generate_supports(user: schemas.User, db: orm.Session):
    # Get current user-defined classes
    labels = await get_labels(user, db)
    classes = list(labels.keys())

    classes.remove('unknown')

    s = {}
    # Get support segments for each class
    for label in classes:
        supports = db.query(models.Segments).filter_by(owner_id=user.id).filter(models.Segments.label == label).all()
        s[label] = supports

    p = []
    for label in classes:
        temp = []
        for support in s[label]:
            if os.path.exists(f'./static/{user.id}/supports/{support.filename[:-4]}.npy'):
                test = np.load(f'./static/{user.id}/supports/{support.filename[:-4]}.npy', allow_pickle=True)
                print(test)
                temp.append(np.load(f'./static/{user.id}/supports/{support.filename[:-4]}.npy', allow_pickle=True)[0])

        if len(temp) > 0:
            prototype = np.mean(np.array(temp), axis=0)
        else:
            prototype = None
        p.append(prototype)

    # Save .npy files to prototypes directory with class name = filename
    if not os.path.exists(f"./static/{user.id}/prototypes/"):
        os.mkdir(f"./static/{user.id}/prototypes/")

    for i in range(len(classes)):
        outfile = f"./static/{user.id}/prototypes/{classes[i]}.npy"
        np.save(outfile, p[i]) # Save prototypes
    return p

async def predict(filename, user: schemas.User, db: orm.Session):
    # compare query with all protoypes
    query = np.load(f"./static/{user.id}/supports/{filename[:-4]}.npy", allow_pickle=True)

    d = []
    for _,_,labels in os.walk(f'./static/{user.id}/prototypes'):
        for label in labels:
            prototype = np.load(f'./static/{user.id}/prototypes/{label}', allow_pickle=True)

            if prototype.any():
                d.append(np.linalg.norm(query - prototype))
            else:
                d.append(20) # temp

    # Compute softmax of distances
    probability = 1-abs(np.array(d) / np.sum(np.array(d)))
    i = np.argmax(probability)

    # Update Segment
    segment_db = await segment_selector(filename, user, db)
    # segment_db.status = "automatic"
    segment_db.confidence = probability[i]
    segment_db.label = labels[i][:-4]
    db.commit()
    db.refresh(segment_db)

async def recommend(user: schemas.User, db: orm.Session):
    segments = await get_segments(user, db)

    # Filter by unlabeled
    # filtered = [segment for segment in segments if segment.status == 'Incomplete']
    # print(filtered)

    for segment in segments:
        # compare query with all protoypes
        query = np.load(f"./static/{user.id}/supports/{segment.filename[:-4]}.npy", allow_pickle=True)

        d = []
        for _,_,labels in os.walk(f'./static/{user.id}/prototypes'):
            for label in labels:
                prototype = np.load(f'./static/{user.id}/prototypes/{label}', allow_pickle=True)

                if prototype.any():
                    d.append(np.linalg.norm(query - prototype))
                else:
                    d.append(-1) # temp

        # Compute softmax of distances
        probability = 1-abs(np.array(d) / np.sum(np.array(d)))
        i = np.argmax(probability)

        # Update Segment
        print(f"Updating segment {segment.filename}")
        segment_db = await segment_selector(segment.filename, user, db)
        print(labels[i][:-4])
        # segment_db.status = "Complete"
        segment_db.label = labels[i][:-4]
        segment_db.confidence = probability[i]
        db.commit()
        db.refresh(segment_db)