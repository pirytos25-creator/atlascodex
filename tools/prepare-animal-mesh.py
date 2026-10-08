"""Convert the uncompressed WHS v4 root GLB from DANDI to local typed arrays.
Source geometry is unchanged apart from RAS -> presentation rotation/centering.
"""
from pathlib import Path
import json, struct, hashlib
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'tools/source-animals/rat-whs-v4.glb'
raw = source.read_bytes()
assert raw[:4] == b'glTF'
cursor = 12
while cursor < len(raw):
    length, kind = struct.unpack_from('<II', raw, cursor)
    chunk = raw[cursor + 8:cursor + 8 + length]
    if kind == 0x4E4F534A:
        document = json.loads(chunk)
    elif kind == 0x004E4942:
        binary = chunk
    cursor += 8 + length

def accessor(index):
    a = document['accessors'][index]
    view = document['bufferViews'][a['bufferView']]
    dtype = {5126: '<f4', 5125: '<u4', 5123: '<u2'}[a['componentType']]
    width = {'SCALAR': 1, 'VEC3': 3}[a['type']]
    assert 'byteStride' not in view
    return np.frombuffer(binary, dtype=dtype, count=a['count'] * width,
                         offset=view.get('byteOffset', 0) + a.get('byteOffset', 0)).reshape(-1, width)

primitive = document['meshes'][0]['primitives'][0]
positions = accessor(primitive['attributes']['POSITION']).copy()
positions = positions[:, [0, 2, 1]]
positions[:, 2] *= -1
dimensions = positions.max(axis=0) - positions.min(axis=0)
positions -= (positions.max(axis=0) + positions.min(axis=0)) / 2
indices = accessor(primitive['indices']).astype('<u4')
output = ROOT / 'dist/assets'
positions.astype('<f4').tofile(output / 'rat-whs-positions.bin')
indices.tofile(output / 'rat-whs-indices.bin')
(output / 'rat-whs.json').write_text(json.dumps({
    'vertices': len(positions), 'triangles': len(indices)//3,
    'dimensionsMm': dimensions.tolist(), 'sourceSha256': hashlib.sha256(raw).hexdigest(),
    'source': 'https://atlas.dandiarchive.org/data/atlases/whs_sd/meshes/9999.glb?v=20260519',
    'atlas': 'Waxholm Space Sprague Dawley rat v4 (root mask)',
    'license': 'CC BY 4.0',
    'modifications': 'RAS rotation and centering; no further simplification. DANDI mesh is already a simplified atlas-mask surface.'
}, indent=2), encoding='utf-8')
print(len(positions), 'vertices;', len(indices)//3, 'triangles;', dimensions)
