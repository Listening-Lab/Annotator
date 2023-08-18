import soundfile as sf
from preprocessing.spectral_noise_grating import spectrogram, autoThreshold, mask, ISTFT, convertToAmp
import os
import numpy as np


async def denoiseAudio(recording, sampleRate, filename, user, denoise, ref=False):
    if not os.path.exists(f'./static/{user}/audio'):
        os.makedirs(f'./static/{user}/audio')

    if not os.path.exists(f'./static/{user}/images'):
        os.makedirs(f'./static/{user}/images')

    if denoise: # current speed (1.29s)
        sig_stft, sig_stft_db = spectrogram(recording)
        thresh = autoThreshold(sig_stft)
        masked,_ = mask(thresh, sig_stft, sig_stft_db)
        # denoised = convertToAmp(masked)
        print(len(recording))
        denoised = ISTFT(masked, len(recording))
        print(len(denoised))
        if ref:
            sf.write(f'./static/{user}/ref/denoised_{filename}', denoised, sampleRate)
        else:
            sf.write(f'./static/{user}/audio/{filename}', denoised, sampleRate)
        return denoised
    else:
        if ref:
            sf.write(f'./static/{user}/ref/{filename}', recording, sampleRate)
        else:
            sf.write(f'./static/{user}/audio/{filename}', recording, sampleRate)
        return recording