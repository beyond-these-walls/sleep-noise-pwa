import math
import os
import random
import struct
import subprocess
import wave

SAMPLE_RATE = 44100
CROSSFADE_SEC = 4.0
CROSS_SAMPLES = int(SAMPLE_RATE * CROSSFADE_SEC)

def ensure_seamless_loop(input_path, output_path, target_duration=75):
    """
    Decodes input audio to PCM WAV via ffmpeg, takes (target_duration + CROSSFADE_SEC),
    applies an equal-power crossfade of the tail into the head, and encodes to MP3.
    """
    temp_wav_in = "temp_in.wav"
    temp_wav_out = "temp_out.wav"
    
    total_needed_sec = target_duration + CROSSFADE_SEC
    # Decode segment to 44.1kHz 16-bit stereo WAV
    cmd_decode = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-ss", "10", "-t", str(total_needed_sec),
        "-i", input_path,
        "-af", "highpass=f=25,loudnorm=I=-21:TP=-2:LRA=11",
        "-ar", str(SAMPLE_RATE), "-ac", "2",
        temp_wav_in
    ]
    subprocess.run(cmd_decode, check=True)
    
    with wave.open(temp_wav_in, "rb") as wf_in:
        n_frames = wf_in.getnframes()
        raw_bytes = wf_in.readframes(n_frames)
    
    n_samples = n_frames * 2  # stereo 16-bit
    samples = struct.unpack(f"<{n_samples}h", raw_bytes)
    
    loop_frames = int(SAMPLE_RATE * target_duration)
    if n_frames < loop_frames + CROSS_SAMPLES:
        # If input was shorter, adjust target_duration
        loop_frames = max(int(SAMPLE_RATE * 30), n_frames - CROSS_SAMPLES)
        cross_s = min(CROSS_SAMPLES, int((n_frames - loop_frames)))
    else:
        cross_s = CROSS_SAMPLES
        
    out_frames = bytearray()
    
    for i in range(loop_frames):
        # Frame i: left is samples[i*2], right is samples[i*2 + 1]
        l = samples[i * 2] / 32767.0
        r = samples[i * 2 + 1] / 32767.0
        
        if i < cross_s:
            t = i / float(cross_s)
            fade_in = math.sin(0.5 * math.pi * t)
            fade_out = math.cos(0.5 * math.pi * t)
            
            tail_idx = loop_frames + i
            if tail_idx * 2 + 1 < len(samples):
                tail_l = samples[tail_idx * 2] / 32767.0
                tail_r = samples[tail_idx * 2 + 1] / 32767.0
                l = (l * fade_in) + (tail_l * fade_out)
                r = (r * fade_in) + (tail_r * fade_out)
        
        l_int = max(-32767, min(32767, int(l * 32767.0)))
        r_int = max(-32767, min(32767, int(r * 32767.0)))
        out_frames.extend(struct.pack("<hh", l_int, r_int))
        
    with wave.open(temp_wav_out, "wb") as wf_out:
        wf_out.setnchannels(2)
        wf_out.setsampwidth(2)
        wf_out.setframerate(SAMPLE_RATE)
        wf_out.writeframes(out_frames)
        
    # Encode with LAME
    cmd_encode = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", temp_wav_out,
        "-codec:a", "libmp3lame", "-b:a", "160k",
        output_path
    ]
    subprocess.run(cmd_encode, check=True)
    
    if os.path.exists(temp_wav_in):
        os.remove(temp_wav_in)
    if os.path.exists(temp_wav_out):
        os.remove(temp_wav_out)
    print(f"Created seamless loop: {output_path}")

def generate_seamless_noise(noise_type, output_path, duration=60):
    """
    Generates high-quality brown, pink, or white noise with seamless equal-power loop.
    """
    temp_wav = f"temp_{noise_type}.wav"
    total_frames = int(SAMPLE_RATE * (duration + CROSSFADE_SEC))
    cross_frames = int(SAMPLE_RATE * CROSSFADE_SEC)
    loop_frames = int(SAMPLE_RATE * duration)
    
    left = []
    right = []
    
    if noise_type == "white":
        # Gently lowpassed white noise to prevent harsh high-frequency sizzle
        alpha = 0.55
        l_prev, r_prev = 0.0, 0.0
        for _ in range(total_frames):
            wl = random.uniform(-1.0, 1.0)
            wr = random.uniform(-1.0, 1.0)
            l_prev += alpha * (wl - l_prev)
            r_prev += alpha * (wr - r_prev)
            left.append(l_prev * 0.35)
            right.append(r_prev * 0.35)
            
    elif noise_type == "brown":
        # Leaky integrator for deep restorative -6dB/octave brown noise
        l_state, r_state = 0.0, 0.0
        l_dc, r_dc = 0.0, 0.0
        for _ in range(total_frames):
            wl = random.uniform(-1.0, 1.0)
            wr = random.uniform(-1.0, 1.0)
            l_state = (l_state * 0.985) + (wl * 0.08)
            r_state = (r_state * 0.985) + (wr * 0.08)
            l_dc = l_dc * 0.996 + l_state * 0.004
            r_dc = r_dc * 0.996 + r_state * 0.004
            left.append((l_state - l_dc) * 0.75)
            right.append((r_state - r_dc) * 0.75)
            
    elif noise_type == "pink":
        # Paul Kellet's filter
        b0_l = b1_l = b2_l = b3_l = b4_l = b5_l = b6_l = 0.0
        b0_r = b1_r = b2_r = b3_r = b4_r = b5_r = b6_r = 0.0
        for _ in range(total_frames):
            wl = random.uniform(-1.0, 1.0)
            wr = random.uniform(-1.0, 1.0)
            b0_l = 0.99886 * b0_l + wl * 0.0555179
            b1_l = 0.99332 * b1_l + wl * 0.0750759
            b2_l = 0.96900 * b2_l + wl * 0.1538520
            b3_l = 0.86650 * b3_l + wl * 0.3104856
            b4_l = 0.55000 * b4_l + wl * 0.5329522
            b5_l = -0.7616 * b5_l - wl * 0.0168980
            pink_l = b0_l + b1_l + b2_l + b3_l + b4_l + b5_l + b6_l + wl * 0.5362
            b6_l = wl * 0.115926
            
            b0_r = 0.99886 * b0_r + wr * 0.0555179
            b1_r = 0.99332 * b1_r + wr * 0.0750759
            b2_r = 0.96900 * b2_r + wr * 0.1538520
            b3_r = 0.86650 * b3_r + wr * 0.3104856
            b4_r = 0.55000 * b4_r + wr * 0.5329522
            b5_r = -0.7616 * b5_r - wr * 0.0168980
            pink_r = b0_r + b1_r + b2_r + b3_r + b4_r + b5_r + b6_r + wr * 0.5362
            b6_r = wr * 0.115926
            
            left.append(pink_l * 0.075)
            right.append(pink_r * 0.075)

    out_frames = bytearray()
    for i in range(loop_frames):
        l = left[i]
        r = right[i]
        if i < cross_frames:
            t = i / float(cross_frames)
            fade_in = math.sin(0.5 * math.pi * t)
            fade_out = math.cos(0.5 * math.pi * t)
            l = (l * fade_in) + (left[loop_frames + i] * fade_out)
            r = (r * fade_in) + (right[loop_frames + i] * fade_out)
            
        l_int = max(-32767, min(32767, int(l * 32767.0)))
        r_int = max(-32767, min(32767, int(r * 32767.0)))
        out_frames.extend(struct.pack("<hh", l_int, r_int))
        
    with wave.open(temp_wav, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(out_frames)
        
    cmd_encode = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-i", temp_wav,
        "-codec:a", "libmp3lame", "-b:a", "160k",
        output_path
    ]
    subprocess.run(cmd_encode, check=True)
    if os.path.exists(temp_wav):
        os.remove(temp_wav)
    print(f"Generated noise loop: {output_path}")

if __name__ == "__main__":
    src_dir = "tools/.src"
    audio_dir = "audio"
    os.makedirs(audio_dir, exist_ok=True)
    
    # 1. Field recordings from raw sources
    mappings = [
        ("rain-calm.wav", "rain-calm.mp3", 75),
        ("rain-light.ogg", "rain-light.mp3", 50),
        ("thunderstorm.wav", "thunderstorm.mp3", 90),
        ("rain-distant-thunder.wav", "rain-distant-thunder.mp3", 80),
        ("ocean-waves.ogg", "ocean-waves.mp3", 75),
        ("river-stream.ogg", "river-stream.mp3", 75),
    ]
    
    for src_file, out_file, dur in mappings:
        full_src = os.path.join(src_dir, src_file)
        full_out = os.path.join(audio_dir, out_file)
        if os.path.exists(full_src):
            print(f"Processing {src_file} -> {out_file} ({dur}s)...")
            ensure_seamless_loop(full_src, full_out, target_duration=dur)
        else:
            print(f"Warning: Source not found: {full_src}")
            
    # 2. Procedural noises
    generate_seamless_noise("brown", os.path.join(audio_dir, "brown-noise.mp3"), duration=60)
    generate_seamless_noise("white", os.path.join(audio_dir, "white-noise.mp3"), duration=60)
    generate_seamless_noise("pink", os.path.join(audio_dir, "pink-noise.mp3"), duration=60)
    print("All seamless loops ready!")
