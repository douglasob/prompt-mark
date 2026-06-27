import zlib, struct, math, os

W = H = 128
# paleta
BG = (30, 30, 46)        # #1e1e2e
ACCENT = (137, 180, 250) # azul claro (catppuccin blue)
WHITE = (205, 214, 244)

px = [[BG[0], BG[1], BG[2], 255] for _ in range(W*H)]

def setpx(x, y, rgb, a=255):
    if 0 <= x < W and 0 <= y < H:
        i = y*W + x
        # alpha-composite simples sobre o que já existe
        sr, sg, sb = rgb
        dr, dg, db, da = px[i]
        af = a/255
        px[i] = [int(sr*af+dr*(1-af)), int(sg*af+dg*(1-af)),
                 int(sb*af+db*(1-af)), 255]

def aa(d, edge):
    # antialias: 1 dentro, 0 fora, rampa de 1px na borda
    return max(0.0, min(1.0, edge - d + 0.5))

# 1) cantos arredondados: deixa transparente fora do raio
R = 24
for y in range(H):
    for x in range(W):
        cx = min(x, W-1-x); cy = min(y, H-1-y)
        if cx < R and cy < R:
            d = math.hypot(R-cx, R-cy)
            if d > R:
                px[y*W+x] = [BG[0], BG[1], BG[2], 0]

cx, cy = 64, 64

# 2) anel "@": annulus
ro, ri = 40, 28
for y in range(H):
    for x in range(W):
        d = math.hypot(x-cx, y-cy)
        out = aa(d, ro)         # dentro do externo
        inn = aa(ri, d)         # fora do interno
        cov = min(out, inn)
        if cov > 0:
            setpx(x, y, ACCENT, int(255*cov))

# 3) "miolo" do @: pequeno arco/ponto central
for y in range(H):
    for x in range(W):
        d = math.hypot(x-cx, y-cy)
        cov = aa(d, 12)
        if cov > 0:
            setpx(x, y, ACCENT, int(255*cov))

# 4) barra diagonal "/": linha grossa do canto inf-esq ao sup-dir
# reta: y = -x + b  -> x + y = b, b=128 passa pelo centro
half = 7
for y in range(H):
    for x in range(W):
        d = abs((x + y) - 128) / math.sqrt(2)
        cov = aa(d, half)
        # limita ao comprimento (margens)
        if 18 <= x <= 110 and 18 <= y <= 110 and cov > 0:
            setpx(x, y, WHITE, int(255*cov))

# escreve PNG (RGBA, 8-bit)
def chunk(typ, data):
    c = typ + data
    return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xffffffff)

raw = bytearray()
for y in range(H):
    raw.append(0)  # filtro none
    for x in range(W):
        raw.extend(px[y*W+x])

png = b"\x89PNG\r\n\x1a\n"
png += chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0))
png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
png += chunk(b"IEND", b"")

proj = os.environ.get(
    "PROJ", os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
out = os.path.join(proj, "media", "icon.png")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "wb") as f:
    f.write(png)
print("wrote", out, len(png), "bytes")
