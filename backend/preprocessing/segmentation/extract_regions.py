import numpy as np
import json
import matplotlib.pyplot as plt
import preprocessing.segmentation.wavelet_segmentation as w
# import energy_segmentation as e
# import reference_segmentation as r
# import parameter_segmentation as p
import sklearn.metrics as sk
import os
from time import time
import librosa
import soundfile as sf
import shutil as sh

# # Threshold values estimated for each method
# method_thresholds = {'w': 40,
#                     'e': 20,
#                     'r': 40,
#                     'p': 20}

# Paths of dataset and reference files
directory = './dataset/'

ref_options = ['./static/audio/ref.wav',
                './audio/ref2.wav', 
                './audio/ref3.wav', 
                './audio/ref4.wav']

methods_names = {'w':'Wavelet', 
                'e': 'Energy', 
                'r': 'Reference', 
                'p': 'Parameter'}


# Segment the specified file for a given method.
# Times the operation so that the performance of each method can be evaluated.
def get_correlation(file, audio_data, method=None, w_refs=None, p_refs=None):
    audio, sr = audio_data[file]
    t0 = time()
    if method == 'w':
        data = w.wavelet_segmentation(audio, sr, w_refs, 3)
        print(data.shape)
    t = time() - t0
    print(f"{methods_names[method]} segmentation executed in {t:.4f}s.")
    return(data)

# Extract binary data from a correlation dataset from a segmentation
def get_binary(data, method, threshold):
    binary = None
    # threshold = method_thresholds[method] * ratio
    if method == 'w':
        binary, correlation = w.wavelet_binary(data, threshold)
    return binary, correlation

def slice_audio(audio_dict, binary_dict, correlation_dict, files, id):
    if not os.path.exists(f'./static/{id}/seg/'):
        os.mkdir(f'./static/{id}/seg/')

    output_path = f'./static/{id}/seg/'
    count = 0
    for file in files:
        audio, sr = audio_dict[file]
        duration = len(audio)/sr
        binary = binary_dict[file]
        regions = []
        in_region = False
        start = None
        stop = None
        for i in range(len(binary)):
            if in_region:
                if binary[i]:
                    continue
                else:
                    stop = i
                    in_region = False
                    regions.append((start, stop))
            else:
                if binary[i]:
                    start = i
                    in_region = True
                else:
                    continue
        if in_region:
            stop = (len(binary)-1)
            regions.append((start, stop))
        filtered_regions = []
        filtered_corrs = []
        region_num = 0
        for region in regions:
            start, stop = region
            if stop > start:
                n = (5-(stop-start))/2
                d_start = start - n
                d_stop = stop + n
                if d_start < 0:
                    d_stop -= d_start
                    d_start -= d_start
                if d_stop > duration:
                    d_start -= (d_stop-duration)
                    d_stop -= (d_stop-duration)
                filtered_corrs.append(np.max(correlation_dict[file][int(np.floor(d_start)):int(np.floor(d_stop))]))
                filtered_regions.append((d_start, d_stop, region_num))
                region_num += 1
        print(f'{file}:{filtered_regions}')
        print(f'{filtered_corrs}')
        count+=len(filtered_regions)

        segments = {}
                    
        for region in filtered_regions:
            start, stop, num = region
            scaled_start = int(np.floor(sr * start))
            scaled_stop = int(np.floor(sr * stop))
            audio_slice = audio[scaled_start:scaled_stop]
            sf.write(f'{output_path}{file[:-4]}_R{num}.WAV', audio_slice, sr)
            segments[(f'{file[:-4]}_R{num}.WAV')] = w.mfcc_svd(f'{output_path}{file[:-4]}_R{num}.WAV')
    return count, segments, filtered_regions, np.array(filtered_corrs)

def parent_name(string, file_extension):
    extension_pos = string.rfind(file_extension)
    if extension_pos == -1:
        return string
    underscore_pos = string[:extension_pos].rfind('_')
    if underscore_pos == -1:
        return string
    return string[:underscore_pos] + file_extension

def generate_segment(id, segment):
    # Segment audio generated here
    output_path = f'./static/{id}/seg/'
    audio, sr = librosa.load(f'./static/{id}/audio/' + parent_name(segment['filename'], segment['filename'][-4:]), sr=None)
    scaled_start = int(np.floor(sr * segment['start']))
    scaled_stop = int(np.floor(sr * segment['end']))
    audio_slice = audio[scaled_start:scaled_stop]
    sf.write(f"{output_path}{segment['filename']}", audio_slice, sr)
    point = w.mfcc_svd(f"{output_path}{segment['filename']}")
    print(point)
    return point

def get_regions(userID, files, audio_data, refs, method='w', threshold=4.5):

    if not os.path.exists(f'./static/{userID}/ref/'):
        os.mkdir(f'./static/{userID}/ref/')

    ref_paths = [f'./static/{userID}/ref/'+ref for ref in refs]
    t0 = time()
    w_ref = w.decomp_refs(ref_paths, 3)
    
    # Get all data
    binary_dict = {}
    correlation_dict = {}

    #Load or generate segmentation data
    for file in files:
        correlation = get_correlation(file, audio_data, method, w_ref)
        
        # Generate binaries
        # m = w.noise_mask(audio_data, file)
        b, c = get_binary(correlation, method, threshold)
        # b = np.logical_and(b[:,0],m)
        binary_dict[file] = b
        correlation_dict[file] = c
    
    count, segments, regions, correlations = slice_audio(audio_data, binary_dict, correlation_dict, files, userID)
        
    print(f'{count} segments extracted in {time()-t0:.3f}s.')

    return segments, regions, correlations

def kmeans(svs):
    return w.kmeans_cluster(svs)