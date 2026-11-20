import os
import struct
import zlib
import math

def write_png(filename, width, height, rgb_generator):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # filter type 0: None
        for x in range(width):
            r, g, b = rgb_generator(x, y, width, height)
            raw_data.extend((max(0, min(255, int(r))),
                             max(0, min(255, int(g))),
                             max(0, min(255, int(b)))))
    
    def make_chunk(chunk_type, data):
        length = struct.pack(">I", len(data))
        type_and_data = chunk_type + data
        crc = struct.pack(">I", zlib.crc32(type_and_data) & 0xffffffff)
        return length + type_and_data + crc

    png = bytearray(b"\x89PNG\r\n\x1a\n")
    # IHDR
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    png.extend(make_chunk(b"IHDR", ihdr_data))
    # IDAT
    compressed = zlib.compress(bytes(raw_data), 6)
    png.extend(make_chunk(b"IDAT", compressed))
    # IEND
    png.extend(make_chunk(b"IEND", b""))

    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, "wb") as f:
        f.write(png)
    print(f"Generated {filename} ({width}x{height}, {len(png)} bytes)")

def hero_grid_gen(x, y, w, h):
    # Normalized coords
    nx = x / w
    ny = y / h
    # Vertical gradient: Deep midnight sapphire to twilight cyan
    r = 5 + ny * 12 + math.sin(nx * 3.14) * 8
    g = 12 + ny * 35 + math.sin(nx * 3.14) * 25
    b = 32 + ny * 65 + math.sin(nx * 3.14) * 45
    # Cyber grid lines
    gx = (x % 60 < 2)
    gy = (y % 60 < 2)
    if gx or gy:
        # Distance to center
        glow = math.exp(-((nx - 0.5)**2 + (ny - 0.5)**2) * 4)
        r += 0
        g += 180 * glow
        b += 220 * glow
    # Horizon energy beam
    if abs(ny - 0.65) < 0.005:
        r += 40
        g += 240
        b += 220
    return r, g, b

def consumer_villa_gen(x, y, w, h):
    nx = x / w
    ny = y / h
    # Deep sapphire with emerald glow towards bottom-left
    r = 6 + ny * 15
    g = 18 + ny * 45 + (1.0 - nx) * 35 * ny
    b = 40 + ny * 70
    # Subtle solar grid pattern
    if (x % 48 < 2 and ny > 0.4) or (y % 48 < 2 and ny > 0.4):
        r += 10
        g += 140
        b += 120
    # Ambient radial light
    dist_villa = math.hypot(nx - 0.35, ny - 0.55)
    villa_glow = math.exp(-dist_villa * dist_villa * 6)
    r += 0
    g += 190 * villa_glow
    b += 170 * villa_glow
    return r, g, b

def bescom_grid_gen(x, y, w, h):
    nx = x / w
    ny = y / h
    # Deep midnight SCADA navy with electric blue & cyan conduits
    r = 6 + ny * 18
    g = 16 + ny * 32
    b = 48 + ny * 85 + nx * 30 * ny
    # Substation node radial glow
    dist_core = math.hypot(nx - 0.65, ny - 0.5)
    core_glow = math.exp(-dist_core * dist_core * 8)
    r += 20 * core_glow
    g += 160 * core_glow
    b += 255 * core_glow
    # High voltage grid network lines
    if (x % 50 < 2 and ny > 0.3) or (y % 50 < 2 and ny > 0.3):
        r += 15
        g += 100
        b += 200
    return r, g, b

if __name__ == "__main__":
    out_dir = r"c:\Users\yadav\OneDrive\Desktop\ev\frontend\public\images"
    write_png(os.path.join(out_dir, "energyq-hero-grid.png"), 1280, 720, hero_grid_gen)
    write_png(os.path.join(out_dir, "consumer-smart-villa.png"), 1280, 720, consumer_villa_gen)
    write_png(os.path.join(out_dir, "bescom-bengaluru-grid.png"), 1280, 720, bescom_grid_gen)
