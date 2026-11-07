# The OS's system sounds for the web: the user's Longhorn / Vista-beta WAVs (assets-src/sounds,
# SOURCES.md section 14) trimmed and encoded to AAC (.m4a, which Safari / iOS and Chrome both
# decode with decodeAudioData) in public/sounds, for src/os/sounds.js.
#
# Only the sounds an OS event plays are written (docs/sounds.md has the mapping); the others stay
# in assets-src. Each file loses its leading silence (everything before the first sample above
# -60 dBFS, less 2 ms) and its silent tail (after the last sample above -66 dBFS, plus 10 ms faded
# out): the tails were up to 0.8 s of near-zero samples, which cost decoded memory and nothing
# else. Encoded with macOS's afconvert (Apple's AAC-LC; the m4a carries the encoder's priming in
# its edit list, which both engines honour), 128 kbit/s stereo, 64 kbit/s for a mono source.
#
# usage: python3 -I tools/sounds/encode.py
import os
import subprocess
import sys
import tempfile
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'assets-src', 'sounds')
OUT = os.path.join(ROOT, 'public', 'sounds')

# the shipped sounds: output name <- source file (Windows' event names, without the Vista_ prefix)
USED = {
    'WindowsLogon': 'Vista_WindowsLogon.wav',
    'WindowsLogoff': 'Vista_WindowsLogoff.wav',
    'SystemStart': 'Vista_SystemStart.wav',
    'SystemExit': 'Vista_SystemExit.wav',
    'SystemAsterisk': 'Vista_SystemAsterisk.wav',
    'SystemExclamation': 'Vista_SystemExclamation.wav',
    'SystemHand': 'Vista_SystemHand.wav',
    'Default': 'Vista_Default.wav',
    'EmptyRecycleBin': 'Vista_EmptyRecycleBin.wav',
}

HEAD_DB = -60
TAIL_DB = -66


def trim(a, rate):
    m = np.abs(a).max(axis=1)
    on = np.nonzero(m > 10 ** (HEAD_DB / 20))[0]
    off = np.nonzero(m > 10 ** (TAIL_DB / 20))[0]
    a0 = max(0, on[0] - int(0.002 * rate))
    fade = int(0.010 * rate)
    a1 = min(len(a), off[-1] + 1 + fade)
    out = a[a0:a1].copy()
    k = min(fade, len(out))
    out[-k:] *= np.linspace(1, 0, k)[:, None]
    return out, a0 / rate, (len(a) - a1) / rate


def main():
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for name, src in USED.items():
        w = wave.open(os.path.join(SRC, src))
        rate, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
        a = np.frombuffer(w.readframes(n), dtype='<i2').astype(np.float64).reshape(-1, ch) / 32768
        b, head, tail = trim(a, rate)
        with tempfile.TemporaryDirectory() as d:
            tmp = os.path.join(d, 'x.wav')
            o = wave.open(tmp, 'wb')
            o.setnchannels(ch)
            o.setsampwidth(2)
            o.setframerate(rate)
            o.writeframes((np.clip(b, -1, 1) * 32767).round().astype('<i2').tobytes())
            o.close()
            dst = os.path.join(OUT, name + '.m4a')
            subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', str(128000 if ch == 2 else 64000), tmp, dst], check=True)
        size = os.path.getsize(dst)
        total += size
        print(f'{name:18s} {src:32s} {n / rate:5.2f} s -> {len(b) / rate:5.2f} s (head -{head * 1000:4.0f} ms, tail -{tail * 1000:4.0f} ms) {ch} ch {size / 1024:6.1f} KB')
    print(f'total {total / 1024:.0f} KB')


if __name__ == '__main__':
    sys.exit(main())
