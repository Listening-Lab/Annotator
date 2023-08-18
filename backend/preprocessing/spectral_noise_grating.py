# May not be needed

# Ref: https://timsainburg.com/noise-reduction-python.html

import matplotlib.pyplot as plt
import numpy as np
import librosa
from scipy.signal import fftconvolve

n_fft = 2048
win_length = 2048
hop_length = 512


def STFT(y, n_fft=n_fft, hop_length=hop_length, win_length=win_length):
    return librosa.stft(y=y, n_fft=n_fft, hop_length=hop_length, win_length=win_length)

def convertToDB(x):
    return librosa.core.amplitude_to_db(x, ref=1.0, amin=1e-20, top_db=100.0)

def convertToAmp(x,):
    return librosa.core.db_to_amplitude(x, ref=1.0)

def ISTFT(y, length, step=hop_length, window=win_length):
    return librosa.istft(y, hop_length=step, win_length=window, length=length)

def spectrogram(signal):
    # Generate spectrogram and convert to db
    stft = STFT(signal, n_fft, hop_length, win_length)
    stft_db = convertToDB(abs(stft))

    return stft, stft_db

def autoThreshold(sig_stft, window=1000, step=1000, n=1.5):
    thres = []
    # Find threshold for each frequency band
    for j,row in enumerate(sig_stft):
        min_std = 1000
        min_mean = 0

        for i in range(0,len(row),step):
            mean = np.mean(row[i:i+window])
            std = np.std(row[i:i+window])

            if std < min_std:
                min_std = std
                min_mean = mean
        
        t = min_mean + min_std * n
        thres.append(t)

    # smooth = []
    # for i in range(len(thres)):
    #     smooth.append(np.mean(thres[i:i+50]))

    # thres = smooth

    def exp_decay(x):
        length = np.ones(len(x))
        e = np.exp2(length)
        return e
    
    e = exp_decay(thres)
    thres = np.multiply(e, thres)

    # thres[0:200] = np.ones(200)*0.2

    # Reshape and extend mask across full recording
    reshaped = np.reshape(thres, (1,len(thres)))
    repeats = np.shape(sig_stft)[1]
    thres = np.repeat(reshaped, repeats, axis=0).T

    return thres

def mask(db_thresh, sig_stft, sig_stft_db):
    # Smoothing filter and normalise
    smooth = np.ones((50,1))
    smooth = smooth / np.sum(smooth)

    # mask if the signal is above the threshold
    mask = sig_stft < db_thresh

    # convolve the mask with a smoothing filter
    mask = fftconvolve(mask, smooth, mode="same")
    mask = mask * 1.0

    # mask the signal
    # gain = np.min(convertToDB(np.abs(sig_stft)))
    masked = (sig_stft * (1 - mask))
    return masked, mask

def reconstruct(masked):
    reconstructed = convertToDB(abs(convertToAmp(masked)))
    # original = convertToDB(abs(STFT(recording, n_fft, hop_length, win_length)))
    return reconstructed