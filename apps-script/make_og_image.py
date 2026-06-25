"""
ponytail: generate a 1200x630 og:image for social previews.
Composites: indigo-purple-pink gradient + brand title + tagline + a mascot sticker.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT = Path('/Users/zephan/Downloads/Claude-Yann/Small Punch Card/frontend/public/og.png')
STICKER = Path('/Users/zephan/Downloads/Claude-Yann/Small Punch Card/frontend/public/stickers/Morning.png')

W, H = 1200, 630

def find_chinese_font(size):
    candidates = [
        '/System/Library/Fonts/PingFang.ttc',
        '/System/Library/Fonts/STHeiti Medium.ttc',
        '/Library/Fonts/Arial Unicode.ttf',
        '/System/Library/Fonts/Hiragino Sans GB.ttc',
    ]
    for c in candidates:
        if Path(c).exists():
            try:
                return ImageFont.truetype(c, size)
            except Exception:
                continue
    return ImageFont.load_default()

def gradient(w, h, colors):
    # 3-stop diagonal gradient
    img = Image.new('RGB', (w, h), colors[0])
    px = img.load()
    for y in range(h):
        for x in range(w):
            t = (x + y) / (w + h)
            if t < 0.5:
                a = t * 2
                r = int(colors[0][0] * (1 - a) + colors[1][0] * a)
                g = int(colors[0][1] * (1 - a) + colors[1][1] * a)
                b = int(colors[0][2] * (1 - a) + colors[1][2] * a)
            else:
                a = (t - 0.5) * 2
                r = int(colors[1][0] * (1 - a) + colors[2][0] * a)
                g = int(colors[1][1] * (1 - a) + colors[2][1] * a)
                b = int(colors[1][2] * (1 - a) + colors[2][2] * a)
            px[x, y] = (r, g, b)
    return img

# Brand colors: indigo-500 / purple-600 / pink-500
img = gradient(W, H, [(99, 102, 241), (147, 51, 234), (236, 72, 153)])
draw = ImageDraw.Draw(img, 'RGBA')

# Decorative blobs
draw.ellipse((W - 220, -120, W + 80, 180), fill=(255, 255, 255, 28))
draw.ellipse((-140, H - 200, 180, H + 120), fill=(255, 255, 255, 28))

# White card
card_x, card_y = 60, 60
card_w, card_h = W - 120, H - 120
draw.rounded_rectangle((card_x, card_y, card_x + card_w, card_y + card_h), radius=36, fill=(255, 255, 255, 250))

# Mascot on right
try:
    sticker = Image.open(STICKER).convert('RGBA')
    s_h = 380
    s_w = int(sticker.width * s_h / sticker.height)
    sticker = sticker.resize((s_w, s_h), Image.LANCZOS)
    img.paste(sticker, (W - s_w - 90, (H - s_h) // 2), sticker)
except Exception as e:
    print('sticker load failed:', e)

# Text — left side
font_big = find_chinese_font(76)
font_mid = find_chinese_font(36)
font_small = find_chinese_font(28)
font_hash = find_chinese_font(40)

draw.text((110, 150), '打卡小程序', font=font_big, fill=(31, 41, 55))
draw.text((110, 250), '100 人 · 100 天 · 与你同行', font=font_mid, fill=(75, 85, 99))
draw.text((110, 320), '每日打卡 · 朋友圈墙 · 排行榜 · 古典金句陪伴', font=font_small, fill=(107, 114, 128))

# Hashtag pill
hashtag = '#100人100天打卡'
bbox = draw.textbbox((0, 0), hashtag, font=font_hash)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]
pill_x, pill_y = 110, 430
pad_x, pad_y = 24, 12
draw.rounded_rectangle(
    (pill_x, pill_y, pill_x + tw + pad_x * 2, pill_y + th + pad_y * 2),
    radius=999,
    fill=(238, 242, 255)
)
draw.text((pill_x + pad_x, pill_y + pad_y - 4), hashtag, font=font_hash, fill=(99, 102, 241))

img.save(OUT, 'PNG', optimize=True)
print(f'Saved {OUT}  {OUT.stat().st_size // 1024}KB')
