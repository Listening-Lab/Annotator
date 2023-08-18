import numpy as np
from scipy import signal
import matplotlib.pyplot as plt
import os


def extract():
    # Extract recordings, repalce with SD card directory
    masks = []
    for _, _, filenames in os.walk('./preprocessing/reference'):
        for filename in filenames:
            if filename == "possum_snip4.npy":
                data = np.load(f"./preprocessing/reference/{filename}")
                masks.append(data)
    return masks


def spectrograms(recording, sampleRate, plot=False):
    # Plot spectrograms of recording and ref
    fp, tp, Sp = signal.spectrogram(recording, fs=sampleRate)

    if plot:
        cmap = plt.get_cmap('magma')
        plt.pcolormesh(tp, fp, Sp, cmap=cmap, shading='auto')
        plt.show()

    return Sp


def normalise(mask):
    # Normalise to prevent higher energy masks becoming biased
    norm = np.linalg.norm(mask)
    mask = np.divide(mask, norm)
    mask = mask / mask.sum()
    return mask


def correlation(recording, masks, sampleRate):
    # Convolve spectrogram with ref to generate correlation
    Sp = spectrograms(recording, sampleRate)

    # Normalisation
    Sp = normalise(Sp)

    kernel = np.ones((2,2)) * 0.5
 
    cor = []
    scaled = []

    lower = 0
    upper = 0.0033

    for mask in masks:
        # Normalise Mask
        mask = normalise(mask)

        # Smoothing (Optional)
        mask = signal.convolve2d(mask, kernel, mode='same', boundary='wrap', fillvalue=0)
        c = signal.correlate(Sp, mask, mode="valid")
        cor.append(c[0])

    # Scale correlation relative to upper and lower values
    for c in cor:
        c = np.interp(c, (lower,upper), (0,10)) 
        scaled.append(c)

    return scaled


def dilation(recommend, k=200):
    # Expand binary mask to include surrounding areas
    d = []
    for i in range(len(recommend)):
        if any(recommend[i-k:i+k]) == 1:
            d.append(1)
        else:
            d.append(0)
    return d


def findRegions(correlation, n):
    # Find the regions of interest
    mean = np.mean(correlation[0])
    std = np.std(correlation[0])
    threshold = mean + n*std
    minimum = 0.030

    if (threshold < minimum):
        threshold = minimum

    regions = []
    for cor in correlation:
        recommend = []
        for c in cor:
            if c >= threshold:
                recommend.append(1) # append highest correlation for that region
            else:
                recommend.append(0)

        regions.append(dilation(recommend))

    return regions 


def segment(cor, mask):
    # Segment regions of interest
    seg = []
    for i,m in enumerate(mask):
        seg.append(np.multiply(cor[i], m))
    return seg


def extractIndices(masks, audio_length, sampleRate):
    mask = masks[0]
    state = 0
    last = len(mask) - 1
    F = audio_length/last

    stamps = []
    indices = []

    for i,m in enumerate(mask):
        if m != state:
            state = m
            stamps.append((i*F)/sampleRate)
            indices.append(i)
        elif state and i == last:
            stamps.append((i*F)/sampleRate)
            indices.append(i)
    return stamps, indices


def convertToDict(regions, cor, indices):
    ROI = []
    for i in range(0, len(regions), 2):
        start = regions[i]
        end = regions[i+1]
        correlation = max(cor[indices[i]:indices[i+1]])

        current = {
            "start": start,
            "end": end,
            "correlation": correlation,
            "label": "unknown"}
        ROI.append(current)
    return ROI


# Changed to only generate cor as ROI was unused
async def cor_map(audio, sampleRate: int, n=1):
    # num_sample = len(audio)
    masks = extract()                        
    cor = correlation(audio, masks, sampleRate)
    # regions = findRegions(cor, n)                
    # stamp, indices = extractIndices(regions, num_sample, sampleRate)       
    # ROI = convertToDict(stamp, cor[0], indices)

    # print('______________________')
    # print(f'Max Correlation: {max(cor[0])}')
    # print(f'Mean Correlation: {np.mean(cor[0])}')
    # print('______________________')

    # Add correlation parameter to audio model: percentage of audio above threshold
    # score = 100*sum(regions[0])/len(regions[0])
    # print(f"Occurrence score: {score}%")

    return cor