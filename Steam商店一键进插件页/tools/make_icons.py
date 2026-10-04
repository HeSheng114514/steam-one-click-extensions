# -*- coding: utf-8 -*-
"""生成扩展图标：Steam 蓝渐变底 + 白色齿轮，输出 16/32/48/128 PNG。"""
import math
import os

from PIL import Image, ImageDraw

# 图标输出到扩展根目录下的 icons/
OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons"
)
os.makedirs(OUT, exist_ok=True)

S = 512
TOP = (102, 192, 244)      # Steam 亮蓝
BOTTOM = (27, 40, 56)      # Steam 深蓝


def gradient_base(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        r = int(TOP[0] + (BOTTOM[0] - TOP[0]) * t)
        g = int(TOP[1] + (BOTTOM[1] - TOP[1]) * t)
        b = int(TOP[2] + (BOTTOM[2] - TOP[2]) * t)
        d.line([(0, y), (size, y)], fill=(r, g, b, 255))
    # 圆角遮罩
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=int(size * 0.22), fill=255
    )
    img.putalpha(mask)
    return img


def gear_mask(size):
    """齿轮形状的遮罩（白色齿轮 + 中间镂空）。"""
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    cx = cy = size / 2
    teeth = 8
    r_body = size * 0.30          # 齿根半径
    r_tip = size * 0.395          # 齿顶半径
    r_hole = size * 0.115         # 中心孔半径
    half_tooth = math.radians(360 / teeth * 0.28)

    pts = []
    step = 720
    for i in range(step):
        a = 2 * math.pi * i / step
        phase = (a * teeth) % (2 * math.pi)
        # 每个齿的周期里，前 40% 是齿顶，其余是齿根
        frac = phase / (2 * math.pi)
        if frac < 0.34 or frac > 0.66:
            r = r_tip
        else:
            r = r_body
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))

    d.polygon(pts, fill=255)
    d.ellipse([cx - r_hole, cy - r_hole, cx + r_hole, cy + r_hole], fill=0)
    return mask


def main():
    base = gradient_base(S)
    white = Image.new("RGBA", (S, S), (255, 255, 255, 0))
    white.putalpha(gear_mask(S))
    icon = Image.alpha_composite(base, white)

    for size in (16, 32, 48, 128):
        small = icon.resize((size, size), Image.LANCZOS)
        path = os.path.join(OUT, "icon%d.png" % size)
        small.save(path, "PNG")
        print("saved", path, small.size)

    icon.save(os.path.join(OUT, "icon512.png"), "PNG")


if __name__ == "__main__":
    main()
