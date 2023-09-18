import sqlalchemy.orm as orm
import models
import schemas
import librosa
import os
import time
import numpy as np

from sklearn.preprocessing import normalize
from sklearn.decomposition import PCA

from preprocessing.segmentation.extract_regions import generate_segment as get_user_seg
from preprocessing.segmentation.extract_regions import kmeans as kmeans
from preprocessing.upload_utils import save_supports

# Reduce dimension of embedding
def reduce_dimension(supports):
    pca = PCA(n_components=2)
    points = pca.fit_transform(supports)
    return points

# CRUD operations for segments
async def segment_selector(filename: str, user: schemas.User, db: orm.Session):
    segment = db.query(models.Segments).filter_by(owner_id=user.id).filter(models.Segments.filename == filename).first()
    if segment is None:
        return None
        # raise fastapi.HTTPException(status_code=404, detail="Segment doesn't exist")
    return segment

async def add_segments(user: schemas.User, segment: schemas.SegmentCreate, db: orm.Session):
    segment = models.Segments(**segment, owner_id=user.id)
    db.add(segment)
    db.commit()
    db.refresh(segment)
    return schemas.Segment.from_orm(segment)

async def get_segments(user: schemas.User, db: orm.Session):
    segments = db.query(models.Segments).filter_by(owner_id=user.id).all()
    # print(segments)
    return list(map(schemas.Segment.from_orm, segments))


async def update_segments(filename, segment: schemas.SegmentCreate, user: schemas.User, db: orm.Session):
    point = await add_user_segment(dict(segment), user)

    # Adds user selected segment supports
    save_supports(filename, user)

    segment.x = point[0]
    segment.y = point[1]
    segment_db = await segment_selector(filename, user, db)

    try: # Checks if segment exists - if audio is deleted then reuploaded it will try to update a segment that no longer exists
        segment_db.status = segment.status
        segment_db.validation = segment.validation
        segment_db.confidence = segment.confidence
        segment_db.start = segment.start
        segment_db.end = segment.end
        segment_db.x = segment.x
        segment_db.y = segment.y
        segment_db.cluster = segment.cluster
        segment_db.label = segment.label
        db.commit()
        db.refresh(segment_db)
    except:
        print("Error: segment doesn't exist")

async def delete_segments(filename, user: schemas.User, db: orm.Session):
    print(f'Deleting segment {filename}')
    parent_name = filename[:-4]

    seg_path = f"./static/{user.id}/seg/"
    support_path = f"./static/{user.id}/supports/"
    # mfcc_path = f"./static/{user.id}/mfccs/"

    for _,_,segments in os.walk(f"./static/{user.id}/seg/"): # [seg1, seg2, ...]
        for segment in segments:
            if '_'.join(segment.split('_')[:-1]) == parent_name:
                name = f"{segment[:-4]}.npy" # Remove .wav and add .npy
                if os.path.exists(support_path+name):
                    os.remove(support_path+name)
                # if os.path.exists(mfcc_path+name):
                #     os.remove(mfcc_path+name)

                audio_path = f"./static/{user.id}/seg/{segment}"

                if os.path.exists(audio_path):
                    print(f"Delete {segment}")
                    os.remove(audio_path)

                audio = await segment_selector(segment, user, db)
                db.delete(audio)
                db.commit()

async def delete_segment(filename, user: schemas.User, db: orm.Session):
    print(f'Deleting individial segment {filename}')

    seg_path = f"./static/{user.id}/seg/{filename}"
    support_path = f"./static/{user.id}/supports/"
    mfcc_path = f"./static/{user.id}/mfccs/"

    ## Only use if there is a database inconsistence
    # audio = await segment_selector(filename, user, db)
    # db.delete(audio)
    # db.commit()

    if os.path.exists(seg_path):
        name = f"{filename[:-4]}.npy" # Remove .wav and add .npy
        if os.path.exists(support_path+name):
            os.remove(support_path+name)
        if os.path.exists(mfcc_path+name):
            os.remove(mfcc_path+name)

        audio_path = f"./static/{user.id}/seg/{filename}"

        if os.path.exists(audio_path):
            print(f"Delete {filename}")
            os.remove(audio_path)

        audio = await segment_selector(filename, user, db)
        db.delete(audio)
        db.commit()

# API for retreiving segments
async def get_seg_files(tag, user: schemas.User, db: orm.Session):
    for _,_,filenames in os.walk(f'./static/{user.id}/seg/'): 
        if filenames != None: 
            return filenames
        else:
            return []

# API for user-created segment creating and updating
async def add_user_segment(segment_data, user: schemas.User):
    points = get_user_seg(user.id, segment_data)
    save_supports(segment_data['filename'], user)
    return points

async def generatePoints(user: schemas.User, db: orm.Session, segments):
    ids = []
    svs = []
    files = []
    labels = []
    confidence = []

    # Collecting data related to each segment
    for _, _, filenames in os.walk(f'./static/{user.id}/seg/'):
        for filename in filenames:
            save_supports(filename, user)

        filenames.reverse()
        for i in range(len(filenames)):
            segment_object = await segment_selector(filenames[i], user, db)
            ids.append(segment_object.id)
            svs.append([segments[i].x, segments[i].y])
            files.append(filenames[i])
            labels.append(segment_object.label)
            confidence.append(segment_object.confidence)

    # define a points object -> sent as a json
    points_object = {
        "datasets": []
        }
    
    ## Supports
    total = np.array([])
    for file in files:
        part = np.load(f'./static/{user.id}/supports/{file[:-4]}.npy')[:,:]
        if total.shape == (0,):
            total = part
        else:
            total = np.append(total, part, 0)

    total = normalize(total)

    points = reduce_dimension(total)

    x = [point[0] for point in points]
    y = [point[1] for point in points]

    colours = [f'rgba(154, 188, 154, 0.8)',f'rgba(224, 143, 133, 0.8)', 'rgba(103, 139, 255, 0.8)']

    for i in range(len(files)):
        points_object["datasets"].append({
            "id":   ids[i],
            "file": files[i],
            "label": labels[i],
            "data": [float(x[i]), float(y[i]), max(float(confidence[i]), 0.5)],
            "backgroundColor": colours[0],
            "cluster": 0
            })
    return points_object

async def kmeans_clustering(points):
    return kmeans(points)