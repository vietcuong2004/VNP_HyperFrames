import json
import sys
from gtts import gTTS
import os
import subprocess
import tempfile

SPEECH_SPEED = 1.18

def get_audio_duration(file_path):
    try:
        cmd = f'ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "{file_path}"'
        result = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        return float(result.stdout.strip())
    except Exception as e:
        print(f"Error getting duration for {file_path}: {e}")
        # fallback to word estimate
        words = len(open(file_path, 'r', errors='ignore').read().split())
        return words / 2.5

def speed_up_audio(file_path, speed):
    if speed <= 1:
        return
    temp_fd, temp_path = tempfile.mkstemp(suffix=os.path.splitext(file_path)[1])
    os.close(temp_fd)
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                file_path,
                "-filter:a",
                f"atempo={speed}",
                "-vn",
                temp_path,
            ],
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        os.replace(temp_path, file_path)
    except Exception as e:
        print(f"Warning: could not speed up {file_path}: {e}")
        if os.path.exists(temp_path):
            os.remove(temp_path)

if len(sys.argv) < 2:
    print("Usage: python gen_assets.py <json_path>")
    sys.exit(1)

json_path = sys.argv[1]
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Ensure audio folder exists
os.makedirs('assets/audio', exist_ok=True)

current_start_time = 0.5
total_duration = 0

# Determine file prefix from name
file_prefix = os.path.basename(json_path).replace('.json', '')

for i, scene in enumerate(data['scenes']):
    text = scene['voice']
    audio_path = f"assets/audio/{file_prefix}_scene_{i+1}.wav"
    
    print(f"Generating TTS for scene {i+1}...")
    tts = gTTS(text=text, lang='vi', slow=False)
    tts.save(audio_path)
    speed_up_audio(audio_path, SPEECH_SPEED)
    
    # Get exact duration using ffprobe
    scene_duration = get_audio_duration(audio_path)
    print(f"  Exact duration: {scene_duration}s")
    
    scene['audio_start'] = round(current_start_time, 2)
    scene['audio_duration'] = round(scene_duration, 2)
    scene['audio_path'] = audio_path
    
    # Calculate word durations based on exact total duration
    words = text.split()
    scene_transcript = []
    word_start = scene['audio_start']
    time_per_word = scene_duration / len(words)
    for w in words:
        scene_transcript.append({
            "text": w,
            "start": round(word_start, 2),
            "end": round(word_start + time_per_word, 2)
        })
        word_start += time_per_word
        
    scene['transcript'] = scene_transcript
    current_start_time += scene_duration + 1.2 # 1.2s pause between scenes

data['duration'] = int(current_start_time) + 2

with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Done! Total duration: {data['duration']}s")
