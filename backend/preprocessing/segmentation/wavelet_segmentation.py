import librosa 
import matplotlib.pyplot as plt
import numpy as np
from scipy import signal
import pywt
from sklearn.decomposition import TruncatedSVD
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans

wavelet = 'db4'
# Get the wavelet decomposition coefficients for a number of reference files
def decomp_refs(refs, wave_dec_level):
    ref_data = []
    for ref in refs:
        ref_audio, _ = librosa.load(ref, sr=None)
        ref_data.append(pywt.wavedec(ref_audio, wavelet, level=wave_dec_level, mode='per'))
    return np.array(ref_data, dtype=object)

def dilation(recommend, k1=5, k2=5):
    # Expand binary mask to include surrounding areas
    if (k1 == 0) & (k2 == 0):
        return(recommend)
    d = []
    for i in range(len(recommend)):
        if i-k1 >=0:
            if np.any(recommend[i-k1:i+k2]) == 1:
                d.append(1)
            else:
                d.append(0)
        else:
            if np.any(recommend[0:i+k2]) == 1:
                d.append(1)
            else:
                d.append(0)
    return d

# For a given interval, compute and return as a list the correlation of the sampled coefficients and those in the reference
def corr_map(slice, reference):
    corrs = []
    for level in range(len(slice)):
        corrs.append(signal.correlate(slice[level], reference[level], mode='valid'))
    return np.transpose(corrs) 

def wavelet_segmentation(audio, sampleRate, ref_coeffs_list, wave_dec_level):
    #Import and generate the coefficient matrix for the audio sample
    length_s = int(np.ceil(audio.size / sampleRate))
    print(length_s)
    coeffs_matrix = np.array(pywt.wavedec(audio, wavelet, level=wave_dec_level, mode='per'), dtype=object)

    # Get correlation value matrix
    correlations = []
    for ref_coeffs in ref_coeffs_list:
        corrs = []
        for i in range(length_s):
            slice = [coeff[i*len(coeff)//length_s:(i+1)*len(coeff)//length_s] for coeff in coeffs_matrix]
            corrs.append(corr_map(slice, ref_coeffs))
        correlations.append(corrs)
    correlations = np.array(correlations)

    # print(correlations)
    # Sum and normalise correlation signals
    corrs_processed = (np.abs(correlations[:,:,:,1:])).sum(3)
    print(corrs_processed)
    print(len(corrs_processed))
    return corrs_processed

def wavelet_binary(correlations, threshold):
    # Compute regions
    binary_maps = np.zeros(np.shape(correlations))    
    for i in range(np.shape(correlations)[0]):
        thr = max(threshold * np.mean(correlations[i,:,:]), 0)
        binary_maps[i,:,:] = correlations[i,:,:] > thr
    binary_sum = np.array(binary_maps.sum(0) > 0)
    cor_max = np.amax(correlations, 0)
    # plot_data(cor_max, binary_sum)
    return binary_sum, cor_max

def noise_mask(audio_data, file):
    audio, _ = audio_data[file]
    mfccs = librosa.feature.mfcc(y=audio, sr=16000, n_mfcc=2, hop_length=16000)[1,:-1]
    mfcc_binary = np.where(mfccs < max(np.mean(mfccs) - 3*np.std(mfccs), 0), 1, 0)
    noise_mask = np.array(dilation(mfcc_binary, k1=2, k2=2))
    return noise_mask

# Plot
# def plot_data(corr_mat, binary_map):
#     x = np.arange(300)
#     fig, (ax0, ax1, ax2) = plt.subplots(nrows=3)
#     ax1.plot(x, corr_mat, label=f'ref')
#     ax2.plot(x, binary_map)
#     fig.legend()
#     plt.show()

def expand(some_list, target_len):
    multiplier = target_len//len(some_list)
    new_list = []
    for entry in some_list:
        new_list.extend(multiplier*[entry])
    return new_list

# def wavelet_svd(file):
#     audio, _ = librosa.load(file, sr=None)
#     coeffs = pywt.wavedec(audio, wavelet, level=3, mode='per')[1:]
#     new_cs = []
#     for coeff in coeffs:
#         new_c = expand(list(coeff), len(coeffs[-1]))
#         new_cs.append(new_c)
#     coeffs = np.array(new_cs)
#     svd = TruncatedSVD(n_components=2)
#     svd.fit(coeffs)
#     svs = svd.singular_values_
#     return svs

def mfcc_svd(file):
    audio,sr = librosa.load(file, sr=None)
    hop = 1600
    samples_per_file = 80000/hop
    result = librosa.feature.mfcc(y=audio, n_mfcc=39, hop_length=hop).T[:-1,:]
    pca = PCA(n_components=2)
    points = pca.fit_transform(result)
    new = []
    count=0
    for point in points:
        if count == 0:
            temp = point
        else:
            temp += point
        count+=1
        if count == samples_per_file:
            new.append(temp/samples_per_file)
            count=0
    return(new[0])

def kmeans_cluster(svs):
    svs = np.array(svs)
    if len(svs) >= 2:
        km = KMeans(n_clusters=2, random_state=0).fit(svs)
        labels = km.labels_
        confidence = []
        for i in range(len(labels)):
            confidence.append(np.linalg.norm(km.cluster_centers_[labels[i]]-svs[i]))
        confidence = np.array(confidence)
    else:
        confidence = [2]
        labels = [0]
    if len(confidence) > 2:
        confidence = 2-(confidence - np.min(confidence))/(np.max(confidence) - np.min(confidence))
    else:
        confidence = np.array([2 for con in confidence])
    return confidence, list(labels)