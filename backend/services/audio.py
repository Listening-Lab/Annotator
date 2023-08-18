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

from services.classifier import prediction
from services.prototypes import predict
from services.segments import delete_segments
from preprocessing.upload_utils import convert_mp3
from preprocessing.upload_utils import save_supports

async def add_audio(user: schemas.User, db: orm.Session, audio: schemas.AudioCreate):
    audio = models.Audio(**audio, owner_id=user.id)
    db.add(audio)
    db.commit()
    db.refresh(audio)
    return schemas.Audio.from_orm(audio)

async def generate_segments(file: UploadFile, audio: np.ndarray, sampleRate: int, data: dict, predictRegion: bool, user: schemas.User, db: orm.Session):
    refs = await get_refs(user)
    audio_data = {}
    audio_data[file.filename] = (audio, sampleRate)
    files = [file.filename]
    print("Generating segments")
    segments, seg_regions, seg_correlations = get_segs(user.id, files, audio_data, refs)
    data = models.Audio(**data, owner_id=user.id)
    for index, name in enumerate(segments.keys()):
        segment = {
            "filename": name,
            "validation": 0,
            "confidence": seg_correlations[index],
            "label": 'unknown',
            "start": seg_regions[index][0],
            "end": seg_regions[index][1],
            "x": segments[name][0],
            "y": segments[name][1],
            "cluster": 0,
            "status": 'auto'
        }

        segment = models.Segments(**segment, owner_id=user.id)
        db.add(segment)
        db.commit()
        db.refresh(segment)

        # Temp for testing full-file mfccs
        save_supports(name, user)

        # Classifier prediction
        if predictRegion:
            await predict(name, user, db)
            # await prediction(name, user, db)

async def upload_audio(user: schemas.User, db: orm.Session, files: list[UploadFile] = File(...), downsample: bool = True, denoise: bool = True, genSegments: bool = True, predictRegion: bool = False):
    user_classes = db.query(models.Settings.labels).filter_by(owner_id=user.id).all()

    classes = []
    for label in user_classes:
        classes.append(label)
            
    for file in files:
        extensions = ['.wav', '.WAV', '.mp3', '.MP3']
        if file.filename.endswith(tuple(extensions)):
            old = file.filename
            file.filename = file.filename[:-4] + '.WAV'

            if not os.path.exists(f"./static/{user.id}/audio/{file.filename}"):
                data = {"filename": file.filename}

                audio = await add_audio(user, db, data)
                data = {"filename":audio.filename,
                        "status":audio.status,
                        "validation":audio.validation}
                
                # Query database for sample rate 
                # target_rate = db.query(models.Settings.sr).filter_by(owner_id=user.id).first()[0]
                target_rate = 16000

                if old.endswith(('.mp3','.MP3')):
                    audio, sampleRate = convert_mp3(file.file)
                else:
                    audio, sampleRate = librosa.load(file.file, sr=None)

                # Downsample audio
                if downsample:
                    print('Resampling...')
                    audio = librosa.resample(audio, orig_sr=sampleRate, target_sr=target_rate, res_type='fft')
                    sampleRate = target_rate
                
                # Save audio and denoise if option is selected
                audio = await denoiseAudio(audio, sampleRate, file.filename, user.id, denoise)

                # Ensure 300 second length
                if np.shape(audio)[0] < 300 * sampleRate:
                    zeroArray = np.zeros(300*sampleRate-np.shape(audio)[0])
                    newAudio = np.concatenate((audio,zeroArray))
                    audio = newAudio
                
                # Generate 5 second segments
                if genSegments:
                    print('Segment...')
                    await generate_segments(file, audio, sampleRate, data, predictRegion, user, db)


                return fastapi.HTTPException(status_code=200, detail=f"File {file.filename} uploaded successfully")
            else:
                print(f"File {file.filename} already exists")
                return fastapi.HTTPException(status_code=404, detail=f"File {file.filename} already exists")

async def get_audio_files(tag, user: schemas.User, db: orm.Session):
    if tag == "All":
        files = db.query(models.Audio).filter_by(owner_id=user.id).all()
        # print(f"Number of files: {len(files)}")
        return list(map(schemas.Audio.from_orm, files))
    else:
        segments = db.query(models.Segments).filter(models.Segments.label == tag).all()
        contains_tag = []
        for segment in segments:
            parent = segment.filename[0:-7] + ".WAV"
            try:
                audio = await audio_selector(parent, user, db)
            except:
                pass

            if audio.id not in contains_tag:
                contains_tag.append(audio.id)

        files = db.query(models.Audio).filter_by(owner_id=user.id).all()
        filtered = []
        for audio in files:
            if audio.id in contains_tag:
                filtered.append(audio)
        return list(map(schemas.Audio.from_orm, filtered))


async def audio_selector(filename: str, user: schemas.User, db: orm.Session):
    audio = db.query(models.Audio).filter_by(owner_id=user.id).filter(models.Audio.filename == filename).first()
    if audio is None:
        raise fastapi.HTTPException(status_code=404, detail="Audio doesn't exist")
    return audio

async def delete_audio(filename: str, user: schemas.User, db: orm.Session):
    audio_path = f"./static/{user.id}/audio/{filename}"
    if os.path.exists(audio_path):
        os.remove(audio_path)

    # Deletes every support point associated with the segment
    # parent_name = filename[:-4]
    # print(parent_name)

    # seg_path = f"./static/{user.id}/seg/"
    # support_path = f"./static/{user.id}/supports/"
    # mfcc_path = f"./static/{user.id}/mfccs/"

    # for _,_,segments in os.walk(f"./static/{user.id}/seg/"): # [seg1, seg2, ...]
    #     for segment in segments:
    #         if '_'.join(segment.split('_')[:-1]) == parent_name:
    #             name = f"{segment[:-4]}.npy" # Remove .wav and add .npy
    #             if os.path.exists(support_path+name):
    #                 os.remove(support_path+name)
    #             if os.path.exists(mfcc_path+name):
    #                 os.remove(mfcc_path+name)

    await delete_segments(filename, user, db)

    print(f'Deleting parent audio file {filename}')
    audio = await audio_selector(filename, user, db)
    db.delete(audio)
    db.commit()

async def update_audio(filename: str, audio: schemas.AudioCreate, user: schemas.User, db: orm.Session):
    audio_db = await audio_selector(filename, user, db)
    audio_db.filename = audio.filename
    audio_db.status = audio.status
    audio_db.validation = audio.validation
    audio_db.confidence = audio.confidence
    audio_db.completion = audio.completion
    db.commit()
    db.refresh(audio_db)
    return(audio_db)

async def upload_refs(user: schemas.User, refs: list[UploadFile] = File(...)):
    for ref in refs:
        audio, sampleRate = librosa.load(ref.file, sr=None)
        if len(audio)/sampleRate == 1:
            if not os.path.exists(f'./static/{user.id}/ref'):
                os.makedirs(f'./static/{user.id}/ref')
            audio = await denoiseAudio(audio, sampleRate, ref.filename, user.id, False, ref=True)
            return fastapi.HTTPException(status_code=200, detail=f"File {ref.filename} saved successfully")
        else:
            return fastapi.HTTPException(status_code=404, detail=f"File {ref.filename} incorrect length")

async def delete_refs(filename: str, user:schemas.User):
    ref_path = f"./static/{user.id}/ref/{filename}"
    if os.path.exists(ref_path):
        os.remove(ref_path)
        print(f'{filename} successfully removed')
    else:
        print(f'{filename} does not exist')

async def get_refs(user: schemas.User):
    if not os.path.exists(f'./static/{user.id}/ref'): # Create user static folder if they don't exist
        os.makedirs(f'./static/{user.id}/ref', exist_ok=True)
        os.makedirs(f'./static/{user.id}/audio', exist_ok=True)
        os.makedirs(f'./static/{user.id}/mfccs', exist_ok=True)
        os.makedirs(f'./static/{user.id}/seg', exist_ok=True)
        os.makedirs(f'./static/{user.id}/exports', exist_ok=True)

    for _,_,ref_filenames in os.walk(f'./static/{user.id}/ref'):
        refs = ref_filenames
    return refs

async def get_max_confidence(user: schemas.User, db: orm.Session):
    files = db.query(models.Audio).filter_by(owner_id=user.id).all()
    max = 0
    for file in files:
        audio = await audio_selector(file.filename, user, db)
        if audio.confidence > max:
            max = audio.confidence
    return max