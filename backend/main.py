from http.client import HTTPResponse
import shutil
import fastapi
import fastapi.security as security
from fastapi import UploadFile, Request, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, HTMLResponse
import sqlalchemy.orm as orm
import schemas
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import os
import jwt
from dotenv import dotenv_values
import verification
import models
from fastapi.templating import Jinja2Templates
import passlib.hash as hash
import json

import services.audio as audio_services
import services.classifier as classifier
import services.labels as labels_services
import services.segments as segments_services
import services.user as user_services
import services.visualisation as visualisation
import services.prototypes as prototype_services

templates = Jinja2Templates(directory="templates")


app = fastapi.FastAPI()

app.mount("/styles", StaticFiles(directory="styles"), name="styles")

origins = [
    "http://localhost:3000",
    "http://localhost:8000",
    "https://csse-audioanno1.canterbury.ac.nz"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

config_credentials = dict(dotenv_values(".env"))


@app.get('/api')
async def status():
    return {"message": "active"}


# User Endpoints
@app.post("/api/users", status_code=201)
async def create_user(user_data: schemas.UserCreate, db: orm.Session = fastapi.Depends(user_services.get_db)):
    db_user = await user_services.get_user_by_email(user_data.email, db)
    if db_user:
        raise fastapi.HTTPException(status_code=400, detail="Email already in use")

    user_data =  await user_services.create_user(user_data, db)
    await verification.send_verification_email([user_data.email], user_data)
    return await user_services.create_token(user_data)

###NEED TO WRITE SOME WAY OF GETTING USER IF HAD TOUR OR NOT

# User Verification
@app.get('/verification/user/', response_class=HTMLResponse)
async def email_user_verification(request: Request, token: str, db: orm.Session = fastapi.Depends(user_services.get_db)):
    payload = jwt.decode(token, config_credentials['SECRET'], algorithms=['HS256'])
    user_data = db.query(models.User).filter_by(id = payload.get("id")).first()
    try:
        await user_services.verify(user_data, db)
    except:
        raise fastapi.HTTPException(status_code=400, detail="Invalid token")
    return templates.TemplateResponse("verified.html",{"request":request})

@app.get('/verification/password/', response_class=HTMLResponse)
async def email_password_verification(request: Request, email: str):
    return templates.TemplateResponse("passwordReset.html",{"request": request, "email": email})


# Password Reset
@app.get('/password_reset/{email}', status_code=200)
async def password_reset(email: str, db: orm.Session = fastapi.Depends(user_services.get_db)):
    exists = db.query(models.User).filter(models.User.email == email).first()

    emails = db.query(models.User.email).all()
    if exists:
        await verification.send_password_email(email)

@app.get('/api/change_password/')
async def change_password(email: str, hashed_password: str, db: orm.Session = fastapi.Depends(user_services.get_db)):
    user_db = await user_services.get_user_by_email(email, db)
    user_db.hashed_password = hash.bcrypt.hash(hashed_password)
    db.add(user_db)
    db.commit()
    db.refresh(user_db)


# Token
@app.post("/api/token", status_code=200)
async def generate_token(form_data: security.OAuth2PasswordRequestForm = fastapi.Depends(), db: orm.Session = fastapi.Depends(user_services.get_db)):
    user_data = await user_services.authenticate_user(form_data.username, form_data.password, db)
    if not user_data:
        raise fastapi.HTTPException(status_code=401, detail='Invalid Credentials')
    elif not user_data.verified:    
        raise fastapi.HTTPException(status_code=401, detail='User not Validated')
    else:
        return await user_services.create_token(user_data)


# Handle User Account
@app.get("/api/users/current", response_model=schemas.User, status_code=200)
async def get_user(user: schemas.User = fastapi.Depends(user_services.get_current_user)):
    return user

@app.delete("/api/user/delete_account", status_code=200)
async def delete_account(user_data: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    await user_services.delete_user(user_data, db)


# User-Specific Labels
@app.get("/api/settings/labels", status_code=200)
async def get_user_labels(user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    return await labels_services.get_labels(user, db)

@app.post("/api/settings/labels/", response_model=schemas.Settings, status_code=201)
async def add_user_labels(label: schemas.SettingsCreate, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    return await labels_services.add_label(label, user, db)

@app.put("/api/settings/labels/", status_code=200)
async def update_user_label(label: schemas.SettingsCreate, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    return await labels_services.update_label(label, user, db)

@app.delete("/api/settings/labels/{label}", status_code=200)
async def delete_user_label(label: str, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    await labels_services.delete_label(label, user, db)


# User-Specific Sample Rate
@app.post("/api/settings/sample-rate/{sr}", status_code=200)
async def set_user_sample_rate(sr:int, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    return await user_services.set_sample_rate(sr, user, db)

@app.get("/api/settings/sample-rate", status_code=200)
async def get_user_sample_rate(user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    return await user_services.get_sample_rate(user, db)


# Audio Endpoints
@app.post("/api/upload-audio", status_code=200)
async def upload_audio(files: list[UploadFile], 
                       user: schemas.User = fastapi.Depends(user_services.get_current_user), 
                       db: orm.Session = fastapi.Depends(user_services.get_db), 
                       downsample: bool = True, 
                       denoise: bool = True,
                       segment: bool = True,
                       predict: bool = False):

    response = await audio_services.upload_audio(user, db, files, downsample, denoise, segment, predict)
    return response

@app.get("/api/get-audio-files/{tag}", status_code=200)
async def get_audio_files(tag='testing', user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    filenames = await audio_services.get_audio_files(tag, user=user, db=db)
    return filenames

@app.get("/api/get-audio/{filename}", status_code=200)
async def get_audio(filename: str, user: schemas.User = fastapi.Depends(user_services.get_current_user)): #, user: schemas.User = fastapi.Depends(user_services.get_current_user)
    if filename != 'null':
        
        path = f'./static/{user.id}/audio/{filename}'
        if os.path.exists(path):
            return FileResponse(path=path, filename=f"{filename}", media_type=".wav")
        else:
            HTTPResponse("file doesn't exist")
    else:
        return HTTPResponse("invalid filename")

@app.delete("/api/delete-audio/{filename}", status_code=200)
async def delete_audio(filename: str, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    await audio_services.delete_audio(filename, user, db)
    return {"messages": "Audio successfully deleted"}


# Reference Audio Endpoints
@app.put("/api/update-audio/{filename}", status_code=200)
async def updateAudio(background_task: BackgroundTasks, filename: str, audio: schemas.AudioCreate, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    audio = await audio_services.update_audio(filename, audio, user, db=db)

    # Check training status
    segments = db.query(models.Segments).filter_by(owner_id=user.id).filter(models.Segments.status == 'Complete').all()
    if len(segments) > 10:
        # Trigger training
        print("Updating model")
        _ = await classifier.classifier(user, db, background_task)
    
    return audio

@app.post("/api/upload-refs", status_code=200)
async def upload_refs(files: list[UploadFile], 
                       user: schemas.User = fastapi.Depends(user_services.get_current_user)):
    response = await audio_services.upload_refs(user, files)
    return response

@app.get("/api/get-refs/", status_code=200)
async def get_refs(user: schemas.User = fastapi.Depends(user_services.get_current_user)):
    refs = await audio_services.get_refs(user=user)
    return refs

@app.delete("/api/delete-refs/{filename}", status_code=200)
async def delete_refs(filename: str, user: schemas.User = fastapi.Depends(user_services.get_current_user)):
    await audio_services.delete_refs(filename, user)
    return {"messages": "Reference successfully deleted"}


# Export annotations
@app.get("/api/annotations/{start}/{end}", status_code=200)
async def export_annotations(start: str, end: str, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    annotations = await classifier.export(start, end, user, db)
    return {"annoations": annotations} 

# Export Model
@app.get("/api/model", status_code=200)
async def export_model(user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    # annotations = await classifier.export_model(user, db)
    directory = f"./classifier/{user.id}/model/"
    shutil.make_archive(f"classifier/{user.id}/model", 'zip', directory)
    return FileResponse(path=f"classifier/{user.id}/model.zip", filename="model", media_type='zip')


# Visualisations
@app.get('/api/visualise/status', status_code=200)
async def visualise_status(user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    stats = await visualisation.audio_count(user, db)
    return {"stats": stats}

@app.get('/api/visualise/annotations', status_code=200)
async def visualise_annotations(user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    stats = await visualisation.annotation_count(user, db)
    return {"stats": stats}

@app.get('/api/visualise/val', status_code=200)
async def visualise_annotations(user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    stats = await visualisation.val_percentage(user, db)
    return {"stats": stats}


# API endpoint to retrieve points
@app.get('/api/points', status_code=200)
async def getPoints(user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    colours = [f'rgba(154, 188, 154, 0.8)',f'rgba(224, 143, 133, 0.8)', 'rgba(103, 139, 255, 0.8)']
    segments = await segments_services.get_segments(user, db)
    path = f'./static/{user.id}/points.json'

    points = await segments_services.generatePoints(user, db, segments)
    print(f"Points: {points}")

    point_files = []
    for i in range(len(points["datasets"])):
        point_files.append(points["datasets"][i]["file"])
    for _,_,filenames in os.walk(f'./static/{user.id}/seg/'):
        for file in filenames:
            if file not in point_files:
                segment = await segments_services.segment_selector(file, user, db)
                points["datasets"].append({
                "id":   segment.id,
                "file": file,
                "label": segment.label,
                # "data": [segments[i].x, segments[i].y, np.floor(10*(confidence[i]))],
                "data": [float(segment.x[i]), float(segment.y[i]), (1-float(segment.confidence[i]))],
                "backgroundColor": colours[0],
                "cluster": 0
                })
    svs = []
    for i in range(len(points["datasets"])):
        svs.append([points["datasets"][i]["data"][0],points["datasets"][i]["data"][1]])

    # confidence, clusters = await segments_services.kmeans_clustering(svs)

    # for i in range(len(points["datasets"])):
    #     points["datasets"][i]["data"][2] = float(confidence[i])
    #     points["datasets"][i]["backgroundColor"] = colours[int(clusters[i])]
    #     points["datasets"][i]["cluster"] = int(clusters[i])

    with open(path, 'w') as points_json:
        json.dump(points, points_json)
        points_json.close()
    return points


# API endpoints to retreive segments
@app.get("/api/get-seg-files/{tag}", status_code=200)
async def get_seg_files(tag='testing', user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    filenames = await segments_services.get_seg_files(tag, user=user, db=db)
    if (filenames == None):
        return []
    else:
        return filenames

@app.get('/api/segments/{filename}', status_code=200)
async def getSegments(filename: str, user: schemas.User = fastapi.Depends(user_services.get_current_user)):
    if filename != 'null':
        path = f'./static/{user.id}/seg/{filename}'
        if os.path.exists(path):
            return FileResponse(path=path, filename=f"{filename}", media_type=".wav")
        else:
            HTTPResponse("file doesn't exist")
    else:
        return HTTPResponse("invalid filename")


# Endpoints for segment operations
@app.get('/api/segs', status_code=200)
async def getSegments(user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    segment_list = await segments_services.get_segments(user, db)
    return segment_list

@app.get('/api/seg/{filename}', status_code=200)
async def getSegment(filename: str, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    segment = await segments_services.segment_selector(filename, user, db)
    return segment

@app.post('/api/seg', status_code=200)
async def addSegment(segment: dict, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    segment = await segments_services.add_segments(user, segment, db=db)
    return segment

@app.put('/api/seg/{filename}', status_code=200)
async def updateSegment(filename: str, segment:schemas.SegmentCreate, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    print(filename)
    path = f'./static/{user.id}/points.json'
    if os.path.exists(path):
        with open(path, 'r') as points_json:
            points = json.load(points_json)
            points_json.close()
        for i in range(len(points["datasets"])):
            if points["datasets"][i]["file"] == filename:
                points["datasets"][i]["label"] = segment.label
        with open(path, 'w') as points_json:
            json.dump(points, points_json)
            points_json.close()
    segment = await segments_services.update_segments(filename, segment, user, db=db)
    return segment

@app.delete('/api/seg/{filename}', status_code=200)
async def deleteSeg(filename: str, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    segment = await segments_services.delete_segment(filename, user=user, db=db)
    return segment

@app.post('/api/user-seg', status_code=200)
async def generateUserSegment(segment_data: dict, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    print("user generated segment")
    point = await segments_services.add_user_segment(segment_data, user)
    segment = {
        "filename": segment_data["filename"],
        "validation": 0,
        "confidence": segment_data["confidence"],
        "label": 'unknown',
        "start": segment_data["start"],
        "end": segment_data["end"],
        "x": point[0],
        "y": point[1],
        "cluster": 1.0,
        "status": segment_data["status"]
    }
    await segments_services.add_segments(user, segment, db)
    print(f"{segment['filename']} successfully added to the database")

@app.get('/api/new', status_code=200)
async def newSegment(segment: dict, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    # parent audio file
    pass

# Get parent audio ID from segment
@app.get('/api/parent/{filename}', status_code=200)
async def getParent(filename: str, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    filename = "_".join(filename.split("_")[:2]) + ".WAV"
    data = await audio_services.audio_selector(filename, user, db)
    return data

# Get child segments for parent audio
@app.get('/api/child/{parent}', status_code=200)
async def getChildren(parent:str, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    directory = f'./static/{user.id}/seg'
    segment_list = []
    for _,_,filenames in os.walk(directory):
        # print(filenames)
        for filename in filenames:
            if parent[:-4] in filename:
                segment = await segments_services.segment_selector(filename, user, db)
                if segment == None:
                    print(f'{filename} segment returned null')
                else:
                    segment_list.append(segment)
    return segment_list


# Classifier Test Training and Export Endpoints
@app.get('/api/test/train', status_code=200)
async def train(background_task: BackgroundTasks ,user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    stats = await classifier.classifier(user, db, background_task)
    return stats

@app.get('/api/test/predict', status_code=200)
async def predict(segment, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    await classifier.prediction(segment, user, db)

@app.get('/api/test/export/{start}/{end}', status_code=200)
async def export_annotation(start: str, end: str, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    print(start)
    annotations = await classifier.export(user, db, start, end)
    return {"annotations": annotations} 
    
@app.get('/api/test/validation', status_code=200)
async def validation(user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    await classifier.create_validation(user, db)
    return 1

@app.get('/api/confidence', status_code=200)
async def getConfidence(user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    max = await audio_services.get_max_confidence(user, db)
    return max

@app.post('/api/change_status/{start}/{end}', status_code=200)
async def change_status(start: str, end: str, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    status = await classifier.change_status(start, end, 'Trained', user, db)
    print(status)

# @app.post('/api/train/{start}/{end}', status_code=200)
# async def train(start: str, end: str, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
#     annotations = await classifier.export(start, end, user, db)
#     stats = await classifier.train_model(annotations, user, db)
#     return stats

@app.get('/api/export_annotations', status_code=200)
async def export_annotations(user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    for _,_,files in os.walk(f'./static/{user.id}/audio'):
        data = {}
        for file in files:
            segments = await getChildren(file, user, db)
            segment_valid = []
            for segment in segments:
                print(segment.label)
                if segment.label == 'possum':
                    segment_valid.append(segment)
            data[file] = [(segment.start, segment.end) for segment in segment_valid]
        print(data)
        if not os.path.exists(f'./static/{user.id}/exports'):
            os.mkdir(f'./static/{user.id}/exports')
        with open(f'./static/{user.id}/exports/annotations.json', 'w') as outfile:
            json.dump(data, outfile)
            outfile.close()

# Prototypical Learning
@app.get('/api/prototype/get_supports', status_code=200)
async def get_supports(user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    await prototype_services.generate_supports(user, db)

@app.get('/api/prototype/predict', status_code=200)
async def prototype_predict(filename: str, user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    # Applies prediction to segment
    await prototype_services.predict(filename, user, db)

@app.get('/api/prototype/recommender', status_code=200)
async def prototype_recommender(user: schemas.User = fastapi.Depends(user_services.get_current_user), db: orm.Session = fastapi.Depends(user_services.get_db)):
    # Ranks segments in terms of confidence
    await prototype_services.recommend(user, db)