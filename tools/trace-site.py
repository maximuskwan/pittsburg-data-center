"""Site geometry traced from the City of Pittsburg's Notice of Preparation
(Feb. 28, 2024), Attachment 1 (Plan Area aerial, 0.3 mi scale bar) and
Attachment 2 (Conceptual Site Plan, 600 ft scale bar), rendered at 200 dpi.

Outputs data/site-local.json: every shape in meters east/north of an anchor
point (where the Contra Costa Canal crosses the plan area's straight east
boundary). js/config.js places the anchor on the map, so moving the whole
site is a one-line edit. Run: python3 tools/trace-site.py
"""
import json, math, os

A1_M_PER_PX = 482.8 / 220.0          # 0.3 mi = 220 px
A2_M_PER_PX = 182.88 / 173.3         # 600 ft = 173.3 px
ANCHOR_A1 = (908.0, 988.6)           # canal x east boundary, Attachment 1 px

def a1_to_m(p):
    return ((p[0] - ANCHOR_A1[0]) * A1_M_PER_PX, -(p[1] - ANCHOR_A1[1]) * A1_M_PER_PX)

# ── Attachment 1 traces (page px) ────────────────────────────────────────────
north_parcel = [(883.3, 708.3), (906.7, 713.3), (908.3, 981.7), (828.3, 953.3), (803.3, 878.3),
                (778.3, 870.0), (785.0, 816.7), (885.0, 816.7)]
south_west = [(775, 890), (765, 960), (712, 1090), (797, 1097), (815, 1130), (908, 1100), (908, 1000), (840, 975), (812, 965)]
south_east = [(815, 1130), (825, 1148), (720, 1305), (835, 1305), (867, 1242), (908, 1242), (908, 1100)]
canal = [(650, 722), (690, 738), (700, 780), (712, 850), (730, 865), (760, 875), (780, 890), (800, 940), (812, 958),
         (840, 968), (930, 995), (1000, 1015), (1030, 1035), (1060, 1012), (1100, 1003), (1180, 1003), (1210, 1035),
         (1240, 1035), (1270, 1003), (1300, 990)]

# ── Attachment 2 → Attachment 1 (similarity fit on matching parcel corners) ──
pairs = [((958, 480), (883.3, 708.3)), ((1015, 480), (906.7, 713.3)), ((958, 690), (885.0, 816.7)),
         ((752, 690), (785.0, 816.7)), ((1015, 1040), (908.3, 981.7))]
def fit(pairs):
    n = len(pairs)
    sx = sum(p[0][0] for p in pairs) / n; sy = sum(p[0][1] for p in pairs) / n
    tx = sum(p[1][0] for p in pairs) / n; ty = sum(p[1][1] for p in pairs) / n
    a = b = d = 0.0
    for (x, y), (u, v) in pairs:
        x -= sx; y -= sy; u -= tx; v -= ty
        a += x * u + y * v; b += x * v - y * u; d += x * x + y * y
    a /= d; b /= d
    return lambda p: (a * (p[0] - sx) - b * (p[1] - sy) + tx, b * (p[0] - sx) + a * (p[1] - sy) + ty), math.hypot(a, b), math.degrees(math.atan2(b, a))
a2_to_a1, s, rot = fit(pairs)
print(f'A2→A1 scale {s:.3f} (expected {A2_M_PER_PX / A1_M_PER_PX:.3f}), rotation {rot:.1f}°')
for src, dst in pairs:
    u, v = a2_to_a1(src)
    print(f'  residual {math.hypot(u - dst[0], v - dst[1]) * A1_M_PER_PX:5.1f} m')
a2_to_m = lambda p: a1_to_m(a2_to_a1(p))

# Phase 1 pad from the site plan: left edge (800,765)→(850,910), bottom edge (850,910)→(950,881.7)
TL, BL, BR = (800, 765), (850, 910), (950, 881.7)
def lerp(p, q, t): return (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)
def quad(o, u, v, u0, u1, v0, v1):
    """Rectangle in the pad's own frame: u along the short (west→east) axis, v along the long (north→south) axis."""
    pt = lambda a, b: (o[0] + u[0] * a + v[0] * b, o[1] + u[1] * a + v[1] * b)
    return [pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1), pt(u0, v0)]

o = a2_to_m(TL)
ux, uy = (a2_to_m(BR)[0] - a2_to_m(BL)[0], a2_to_m(BR)[1] - a2_to_m(BL)[1])
vx, vy = (a2_to_m(BL)[0] - o[0], a2_to_m(BL)[1] - o[1])
W, L = math.hypot(ux, uy), math.hypot(vx, vy)
u = (ux / W, uy / W); v = (vx / L, vy / L)
print(f'Phase 1 pad: {W:.0f} m × {L:.0f} m')

# Split the pad: generator yard on the west side (per the Draft EIR), building to the east.
# Building width chosen so three floors ≈ the NOP's 347,740 sq ft of Phase I development.
floor_m2 = 347740 * 0.092903 / 3
bw = floor_m2 / (L - 10)
yard_w = W - bw - 8
shapes = []
def add(kind, ring, **props):
    shapes.append({'kind': kind, 'ring': [[round(x, 1), round(y, 1)] for x, y in ring], **props})

add('building', quad(o, u, v, W - bw, W, 5, L - 5), height=21)
# 37 generators in two rows along the yard, long side perpendicular to the building.
rows = [(19, 2), (18, 2 + 14 + 4)]
n = 0
for count, u0 in rows:
    pitch = (L - 10) / count
    for i in range(count):
        v0 = 5 + i * pitch + (pitch - 3.6) / 2
        add('generator', quad(o, u, v, u0, u0 + 13, v0, v0 + 3.6), height=4.5)
        n += 1
print(f'{n} generators, yard {yard_w:.0f} m wide; building {bw:.0f} m × {L - 10:.0f} m = {bw * (L - 10) * 3 / 0.092903:,.0f} sq ft over 3 floors')

# Substation: the block south of the pad in the site plan.
so = a2_to_m(lerp(BL, BR, 0.0)); so = (so[0] + v[0] * 6, so[1] + v[1] * 6)
SW, SL = 140 * A2_M_PER_PX, 62 * A2_M_PER_PX
add('substation-pad', quad(so, u, v, 0, SW, 0, SL), height=0.4)
for i, (a, b, h) in enumerate([(12, 14, 5), (34, 14, 5), (56, 14, 5), (12, 38, 4), (34, 38, 4), (56, 38, 4), (90, 20, 6), (110, 20, 6)]):
    add('substation-equipment', quad(so, u, v, a, a + 10, b, b + 8), height=h, base=0.4)
for a in (8, 80, 130):
    for b in (6, 56):
        add('substation-mast', quad(so, u, v, a, a + 1.2, b, b + 1.2), height=16, base=0.4)

def area(ring):
    return abs(sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(ring, ring[1:] + ring[:1]))) / 2
m = lambda pts: [a1_to_m(p) for p in pts]
for name, poly, expect in [('north (Phase 1)', north_parcel, 22.05), ('south parcels', None, 54.33)]:
    a = area(m(north_parcel)) if poly else area(m(south_west)) + area(m(south_east))
    print(f'{name}: {a / 4046.86:.1f} acres traced (NOP: {expect})')

close = lambda r: r + [r[0]]
out = {
    'source': 'Traced from City of Pittsburg, Notice of Preparation, Pittsburg Technology Park Specific Plan EIR (Feb. 28, 2024), Attachments 1 and 2. Approximate.',
    'anchor_note': 'Origin (0,0) is where the Contra Costa Canal crosses the plan area’s straight east boundary. Units: meters east, meters north.',
    'parcels': [
        {'name': 'Phase 1 (north of the canal, ~22 acres)', 'phase': 1, 'ring': [[round(x, 1), round(y, 1)] for x, y in close(m(north_parcel))]},
        {'name': 'Future phases (south of the canal, ~54 acres)', 'phase': 2, 'ring': [[round(x, 1), round(y, 1)] for x, y in close(m(south_west))]},
        {'name': 'Future phases (south of the canal, ~54 acres)', 'phase': 3, 'ring': [[round(x, 1), round(y, 1)] for x, y in close(m(south_east))]},
    ],
    'canal': [[round(x, 1), round(y, 1)] for x, y in m(canal)],
    'model': shapes,
    # Corners of the Attachment 1 crop used by ?calibrate, in local meters (west, north, east, south).
    'calibration_image': {'file': 'media/calibration/nop-attachment-1.jpg', 'px_box': [650, 650, 1300, 1350],
                          'bounds_m': [round(c, 1) for c in (*a1_to_m((650, 650)), *a1_to_m((1300, 1350)))]},
}
root = os.path.join(os.path.dirname(__file__), '..')
with open(os.path.join(root, 'data/site-local.json'), 'w') as f:
    json.dump(out, f, indent=1)
print('wrote data/site-local.json')
