"""Motion-energy profile of a video: mean absolute change between consecutive frames, per second.
Usage: python3 -I tools_motion.py video.mp4"""
import subprocess, sys, numpy as np
f = sys.argv[1]; w, h, fps = 108, 192, 15
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-vf', f'fps={fps},scale={w}:{h},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
per_s = [d[i * fps:(i + 1) * fps].mean() for i in range(len(d) // fps + 1) if len(d[i * fps:(i + 1) * fps])]
bar = lambda v: '#' * int(min(60, v * 12))
if '--json' in sys.argv:
    import json; print(json.dumps({'per_second': [round(float(v), 3) for v in per_s], 'mean': round(float(np.mean(per_s)), 3)})); sys.exit()
for i, v in enumerate(per_s): print(f'{i:3d}s {v:5.2f} {bar(v)}')
print(f'mean {np.mean(per_s):.2f} | seconds below 0.35 (near-static): {sum(v < 0.35 for v in per_s)} of {len(per_s)}')
