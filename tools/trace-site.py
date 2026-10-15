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

# ── Phase 1 model, from AVAIO's landscape plans ──────────────────────────────
# Sheets L-202 to L-205 of the "Pittsburg Data Hub" 90% progress set (CI Design,
# for AVAIO Digital Partners), stitched edge to edge into one image (2000 px
# wide sheets; the viewports overlap by exactly 1129 px across and 817 px down).
# Scale bar: 60 ft = 95 px. North points to the right of the sheet, so
# east = down the page and north = right. The traced Phase 1 outline from
# these sheets is 22.1 acres (NOP: 22.05) and fits the NOP outline above with
# a mean error of 9 m after the shift below (closest-point fit).
P_M_PER_PX = 18.288 / 95
P_SHIFT = (-388.9, -48.7)
def p_to_m(p):
    return (p[1] * P_M_PER_PX + P_SHIFT[0], p[0] * P_M_PER_PX + P_SHIFT[1])
def pm(points): return [p_to_m(p) for p in points]

shapes = []
def add(kind, ring, **props):
    ring = list(ring)
    if ring[0] != ring[-1]: ring.append(ring[0])
    shapes.append({'kind': kind, 'ring': [[round(x, 1), round(y, 1)] for x, y in ring], **props})

# "Parcel 1, 3 story data center": the heavy outline, minus the gravel
# ("Lyngso black La Paz pebbles") yard along its west side.
building = [(1055, 1327), (1730, 1110), (1862, 1070), (1902, 1197), (1967, 1310),
            (1972, 1415), (1840, 1460), (1157, 1656)]
yard = [(995, 1132), (1652, 925), (1690, 997), (1730, 1110), (1055, 1327)]
# Height is not in any document reviewed; 21 m (~70 ft) is typical for three
# data-center floors plus rooftop equipment. Change it here if a filing says.
BUILDING_HEIGHT = 21
add('building', pm(building), height=BUILDING_HEIGHT)
add('yard', pm(yard), height=0.3)

# Generators: the 37 small squares in the gravel yard on the plans, located
# one by one (registered to within ~0.2 m). The CEC filing: "Thirty-six (36) of
# the generators would be dedicated to replacing the electricity needs of the
# data center and one (1) ... would be used to support general office loads
# along with building and life safety services (house generator)." On the plans
# that's 12 groups of three, plus one square on its own at the north end.
# The squares mark positions only; the enclosure size below is an estimate.
GENERATORS = [
    (1069, 1264), (1075, 1282), (1081, 1300),
    (1123, 1248), (1128, 1265), (1135, 1283),
    (1174, 1231), (1180, 1249), (1185, 1267),
    (1224, 1215), (1230, 1232), (1235, 1251),
    (1274, 1199), (1280, 1217), (1285, 1235),
    (1325, 1182), (1331, 1200), (1339, 1218),
    (1393, 1161), (1399, 1179), (1405, 1197),
    (1447, 1144), (1452, 1163), (1458, 1180),
    (1498, 1128), (1504, 1146), (1509, 1163),
    (1548, 1112), (1554, 1130), (1559, 1147),
    (1598, 1096), (1604, 1114), (1609, 1132),
    (1649, 1080), (1655, 1098), (1660, 1116),
]
HOUSE_GENERATOR = (1695, 1059)
band_bot = [(1055, 1327), (1730, 1110)]   # yard edge against the building (measured on a clean crop of L-202/L-203)
a0, a1 = [p_to_m(p) for p in band_bot]
along = (a1[0] - a0[0], a1[1] - a0[1]); Lb = math.hypot(*along); along = (along[0] / Lb, along[1] / Lb)
across = (-along[1], along[0])
GEN_W, GEN_L, GEN_H = 3.0, 8.0, 4.5   # across the yard × along it × height, meters (estimated)
def enclosure(center):
    cx, cy = p_to_m(center)
    hw, hl = GEN_W / 2, GEN_L / 2
    return [(cx + along[0] * l + across[0] * w, cy + along[1] * l + across[1] * w) for l, w in ((-hl, -hw), (hl, -hw), (hl, hw), (-hl, hw))]
for p in GENERATORS:
    add('generator', enclosure(p), height=GEN_H, base=0.3)
add('house-generator', enclosure(HOUSE_GENERATOR), height=GEN_H, base=0.3)
print(f'{len(GENERATORS)} data-center generators + 1 house generator')

# "Parcel 0 substation" (open switchyard) and "Parcel 2 substation" (enclosed building).
sub0 = [(620, 1222), (890, 1146), (992, 1436), (702, 1502)]
add('substation-pad', pm(sub0), height=0.3)
c = [p_to_m(p) for p in sub0]
def in_quad(u, v, w, h):
    """Box at fractions (u, v) across the pad, w × h meters, aligned with the pad."""
    o = (c[0][0] + (c[1][0] - c[0][0]) * u + (c[3][0] - c[0][0]) * v, c[0][1] + (c[1][1] - c[0][1]) * u + (c[3][1] - c[0][1]) * v)
    e1 = (c[1][0] - c[0][0], c[1][1] - c[0][1]); n1 = math.hypot(*e1); e1 = (e1[0] / n1, e1[1] / n1)
    e2 = (c[3][0] - c[0][0], c[3][1] - c[0][1]); n2 = math.hypot(*e2); e2 = (e2[0] / n2, e2[1] / n2)
    return [o, (o[0] + e1[0] * w, o[1] + e1[1] * w), (o[0] + e1[0] * w + e2[0] * h, o[1] + e1[1] * w + e2[1] * h), (o[0] + e2[0] * h, o[1] + e2[1] * h)]
for u, v in [(0.3, 0.25), (0.62, 0.25), (0.3, 0.6), (0.62, 0.6)]:
    add('substation-equipment', in_quad(u, v, 9, 7), height=5, base=0.3)
for u in (0.2, 0.5, 0.8):
    for v in (0.12, 0.85):
        add('substation-mast', in_quad(u, v, 1.2, 1.2), height=16, base=0.3)
sub2_pad = [(720, 1560), (1010, 1470), (1100, 1765), (805, 1850)]
sub2_bldg = [(838, 1625), (968, 1585), (1038, 1785), (900, 1825)]
add('substation-pad', pm(sub2_pad), height=0.3)
add('substation-building', pm(sub2_bldg), height=8, base=0.3)

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
