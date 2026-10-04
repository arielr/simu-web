"""FluidSIM 4 .ct decoder (reference implementation in Python; the app uses src/fluid/ctFormat.ts).

usage: python3 fluidsim_ct.py tables.json file.ct   -> prints the decoded text
"""
import json, struct, sys

DEC = None

def load_tables(path):
    global DEC
    t = json.load(open(path))
    DEC = t['dec'] if isinstance(t, dict) else t

def dec_line(l):
    t = DEC[len(l) % 8]
    return bytes(t[c] for c in l)

def lz_decompress(d):
    w0, w1, hl, D, maxfill, bits = struct.unpack_from('<6H', d, 0)
    W = bytearray(0x1000); pre = b'PREVIEW'; W[:len(pre)] = pre; wpos = len(pre)
    out = bytearray(); p = hl
    while p < len(d):
        b = d[p]
        if b & 0x80:
            n = b & 0x7f; q = p + 1
            if wpos + n >= D:
                while True:
                    k = D - wpos - 1
                    if k > 0:
                        W[wpos:wpos + k] = d[q:q + k]; out += d[q:q + k]; q += k; n -= k
                    wpos = 0
                    if n < D: break
            W[wpos:wpos + n] = d[q:q + n]; out += d[q:q + n]; wpos += n; p = q + n
        else:
            if p + 1 >= len(d): break          # trailing padding
            w = (d[p] << 8) | d[p + 1]; L = ((w >> bits) + 1) & 0xff; off = w & (D - 1)
            if L == 1:
                if p + 2 >= len(d): break
                cnt = off; ch = d[p + 2]
                if cnt <= maxfill and wpos + cnt < D:
                    W[wpos:wpos + cnt] = bytes([ch]) * cnt; wpos += cnt
                out += bytes([ch]) * cnt; p += 3
            else:
                if L == 2:
                    p += 1; L = d[p + 1]
                seg = bytes(W[off:off + L]); out += seg
                if wpos + L + 1 >= D: wpos = 0
                W[wpos:wpos + L] = seg; wpos += L; p += 2
    return bytes(out)

def read_ct(raw):
    """returns (header_lines, decoded_body_or_None)"""
    head = []; pos = 0
    for l in raw.split(b'\r\n'):
        t = dec_line(l); head.append(t); pos += len(l) + 2
        if t == b'COMPRESS': break
    else:
        return head, None
    body = raw[pos:]
    key = 0x9a if struct.unpack_from('<H', body, 0)[0] != 1 else 0
    return head, lz_decompress(bytes(b ^ key for b in body))

def body_text(data):
    if data.startswith(b'PREVIEW '):
        nl = data.index(b'\n'); n = int(data[8:nl]); data = data[nl + 1 + n:]
    return data.decode('latin-1').replace('\r', '')

if __name__ == '__main__':
    load_tables(sys.argv[1])
    head, data = read_ct(open(sys.argv[2], 'rb').read())
    print('\n'.join(h.decode('latin-1') for h in head))
    if data is not None: print(body_text(data))
