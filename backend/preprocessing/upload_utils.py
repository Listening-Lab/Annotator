import schemas
import librosa
import os
import numpy as np
from pydub import AudioSegment
from preprocessing.classifier import embeddings

def save_supports(filename: str, user: schemas.User):
    if not os.path.exists(f'./static/{user.id}/supports/{filename[:-4]}.npy'):
        if not os.path.exists(f'./static/{user.id}/supports/'):
            os.mkdir(f'./static/{user.id}/supports/')
        e = embeddings(filename, user)
        np.save(f'./static/{user.id}/supports/{filename[:-4]}.npy',e) 


def convert_mp3(file):
    audio_mp3 = AudioSegment.from_mp3(file)
    samples = audio_mp3.get_array_of_samples()
    fp_arr = np.array(samples).T.astype(np.float32)
    fp_arr /= np.iinfo(samples.typecode).max
    fp_arr = fp_arr.reshape(-1)
    return fp_arr, audio_mp3.frame_rate