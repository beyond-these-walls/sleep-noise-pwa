import math
import random
import struct
import wave
import subprocess
import os

SAMPLE_RATE = 44100
DURATION = 60 # seconds
CROSSFADE = 4 # seconds of crossfade
TOTAL_SEC = DURATION + CROSSFADE
TOTAL_SAMPLES = int(SAMPLE_RATE * DURATION)
CROSS_SAMPLES = int(SAMPLE_RATE * CROSSFADE)
GEN_SAMPLES = TOTAL_SAMPLES + CROSS_SAMPLES

def save_wav_and_mp3(filename_base, left_samples, right_samples):
    wav_path = f"audio/{filename_base}.wav"
    mp3_path = f"audio/{filename_base}.mp3"
    
    with wave.open(wav_path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2) # 16-bit
        wf.setframerate(SAMPLE_RATE)
        
        frames = bytearray()
        for i in range(TOTAL_SAMPLES):
            # Equal-power crossfade at boundary:
            if i < CROSS_SAMPLES:
                t = i / CROSS_SAMPLES
                # equal-power crossfade: sin/cos
                fade_in = math.sin(0.5 * math.pi * t)
                fade_out = math.cos(0.5 * math.pi * t)
                l = (left_samples[i] * fade_in) + (left_samples[TOTAL_SAMPLES + i] * fade_out)
                r = (right_samples[i] * fade_in) + (right_samples[TOTAL_SAMPLES + i] * fade_out)
            else:
                l = left_samples[i]
                r = right_samples[i]
            
            # Clip between -1.0 and 1.0
            l = max(-1.0, min(1.0, l))
            r = max(-1.0, min(1.0, r))
            
            # 16-bit PCM integer
            l_int = int(l * 32767.0)
            r_int = int(r * 32767.0)
            frames.extend(struct.pack("<hh", l_int, r_int))
            
        wf.writeframes(frames)
    
    print(f"WAV created: {wav_path}")
    # Convert to MP3
    cmd = [
        "ffmpeg", "-y", "-i", wav_path,
        "-codec:a", "libmp3lame", "-b:a", "192k",
        mp3_path
    ]
    subprocess.run(cmd, check=True)
    print(f"MP3 created: {mp3_path}")
    if os.path.exists(wav_path):
        os.remove(wav_path)

def generate_white_noise():
    print("Generating White Noise...")
    left, right = [], []
    # Gentle lowpass filter to prevent harsh, piercing treble
    # Simple single-pole lowpass around 6500Hz
    alpha = 0.55
    l_prev, r_prev = 0.0, 0.0
    for _ in range(GEN_SAMPLES):
        w_l = random.uniform(-1.0, 1.0)
        w_r = random.uniform(-1.0, 1.0)
        l_prev = l_prev + alpha * (w_l - l_prev)
        r_prev = r_prev + alpha * (w_r - r_prev)
        left.append(l_prev * 0.35)
        right.append(r_prev * 0.35)
    save_wav_and_mp3("white-noise", left, right)

def generate_brown_noise():
    print("Generating Brown Noise...")
    left, right = [], []
    # Leaky integrator for deep, soothing brown noise (-6dB/octave)
    l_state, r_state = 0.0, 0.0
    # Also gentle DC removal
    l_dc, r_dc = 0.0, 0.0
    for _ in range(GEN_SAMPLES):
        w_l = random.uniform(-1.0, 1.0)
        w_r = random.uniform(-1.0, 1.0)
        
        l_state = (l_state * 0.985) + (w_l * 0.08)
        r_state = (r_state * 0.985) + (w_r * 0.08)
        
        # Highpass at ~30Hz to eliminate sub-bass DC rumble
        l_dc = l_dc * 0.996 + l_state * 0.004
        r_dc = r_dc * 0.996 + r_state * 0.004
        
        left.append((l_state - l_dc) * 0.75)
        right.append((r_state - r_dc) * 0.75)
        
    save_wav_and_mp3("brown-noise", left, right)

def generate_pink_noise():
    print("Generating Pink Noise...")
    # Paul Kellet's filtered pink noise algorithm
    left, right = [], []
    b0_l = b1_l = b2_l = b3_l = b4_l = b5_l = b6_l = 0.0
    b0_r = b1_r = b2_r = b3_r = b4_r = b5_r = b6_r = 0.0
    
    for _ in range(GEN_SAMPLES):
        w_l = random.uniform(-1.0, 1.0)
        w_r = random.uniform(-1.0, 1.0)
        
        b0_l = 0.99886 * b0_l + w_l * 0.0555179
        b1_l = 0.99332 * b1_l + w_l * 0.0750759
        b2_l = 0.96900 * b2_l + w_l * 0.1538520
        b3_l = 0.86650 * b3_l + w_l * 0.3104856
        b4_l = 0.55000 * b4_l + w_l * 0.5329522
        b5_l = -0.7616 * b5_l - w_l * 0.0168980
        pink_l = b0_l + b1_l + b2_l + b3_l + b4_l + b5_l + b6_l + w_l * 0.5362
        b6_l = w_l * 0.115926
        
        b0_r = 0.99886 * b0_r + w_r * 0.0555179
        b1_r = 0.99332 * b1_r + w_r * 0.0750759
        b2_r = 0.96900 * b2_r + w_r * 0.1538520
        b3_r = 0.86650 * b3_r + w_r * 0.3104856
        b4_r = 0.55000 * b4_r + w_r * 0.5329522
        b5_r = -0.7616 * b5_r - w_r * 0.0168980
        pink_r = b0_r + b1_r + b2_r + b3_r + b4_r + b5_r + b6_r + w_r * 0.5362
        b6_r = w_r * 0.115926
        
        left.append(pink_l * 0.075)
        right.append(pink_r * 0.075)
        
    save_wav_and_mp3("pink-noise", left, right)

if __name__ == "__main__":
    generate_white_noise()
    generate_brown_noise()
    generate_pink_noise()
    print("All noises generated successfully!")
