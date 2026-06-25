"""
ponytail: generate PWA icons (192, 512, 180 for iOS) by compositing the Morning
sticker on a brand-gradient rounded background.
"""
from PIL import Image, ImageDraw
from pathlib import Path

PUBLIC = Path('/Users/zephan/Downloads/Claude-Yann/Small Punch Card/frontend/public')
STICKER = PUBLIC / 'stickers' / 'Morning.png'

def gradient(size, colors):
    img = Image.new('RGB', (size, size), colors[0])
    px = img.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            if t < 0.5:
                a = t * 2
                rgb = tuple(int(colors[0][i] * (1 - a) + colors[1][i] * a) for i in range(3))
            else:
                a = (t - 0.5) * 2
                rgb = tuple(int(colors[1][i] * (1 - a) + colors[2][i] * a) for i in range(3))
            px[x, y] = rgb
    return img

def make_icon(size, rounded=True):
    bg = gradient(size, [(99, 102, 241), (147, 51, 234), (236, 72, 153)]).convert('RGBA')
    if rounded:
        mask = Image.new('L', (size, size), 0)
        d = ImageDraw.Draw(mask)
        radius = int(size * 0.22)  # iOS-style rounded square (squircle-ish)
        d.rounded_rectangle((0, 0, size, size), radius=radius, fill=255)
        bg.putalpha(mask)

    sticker = Image.open(STICKER).convert('RGBA')
    # scale sticker to 80% of icon
    scale = (size * 0.85) / max(sticker.size)
    s = sticker.resize((int(sticker.width * scale), int(sticker.height * scale)), Image.LANCZOS)
    x = (size - s.width) // 2
    y = (size - s.height) // 2 + int(size * 0.02)
    out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    out.paste(bg, (0, 0), bg if rounded else None)
    out.paste(s, (x, y), s)
    return out

for size, name, rounded in [
    (192, 'icon-192.png', False),   # Android/Chrome: square (system handles rounding via maskable hints)
    (512, 'icon-512.png', False),
    (180, 'apple-touch-icon.png', True),  # iOS already rounds, but we round for safety
    (512, 'icon-maskable-512.png', False), # maskable: full-bleed bg, safe zone in center
]:
    icon = make_icon(size, rounded=rounded)
    icon.save(PUBLIC / name, 'PNG', optimize=True)
    print(f'  {name}  {size}x{size}  {(PUBLIC / name).stat().st_size // 1024}KB')
