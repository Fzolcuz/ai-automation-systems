"""Image Studio batch runner (showcase excerpt): makes a product's pictures on kie.ai with spending safety built in.
This excerpt contains the picture run and every spending safeguard. The video and balance commands, the planner
and the picture instructions (plan files) are private.
Usage: KIE_API_KEY=... MAX_CREDITS=200 python kie_batch.py pictures <plan.json> [first|rest]
The key is read from the environment and never printed."""
import base64, json, os, re, subprocess, sys, tempfile, time

HERE = os.environ.get('STUDIO_DIR', '.')
EXT = os.path.join(HERE, 'ext')
KEY = os.environ.get('KIE_API_KEY', '')   # read from the environment, never printed or stored in code
os.makedirs(EXT, exist_ok=True)


def api(method, url, body=None):
    """One call to kie.ai. The key goes in a private header file that curl reads (never on the command line,
    where other programs could see it), and every temporary file is deleted afterwards."""
    if not KEY:
        raise SystemExit('STOPPED: KIE_API_KEY is not set')
    tmp = []
    try:
        hdr = tempfile.NamedTemporaryFile('w', delete=False, suffix='.hdr', encoding='utf-8')
        hdr.write('Authorization: Bearer ' + KEY + '\nContent-Type: application/json\n'); hdr.close(); tmp.append(hdr.name)
        cmd = ['curl', '-s', '-S', '-m', '240', '-X', method, '-H', '@' + hdr.name, url]
        if body is not None:
            f = tempfile.NamedTemporaryFile('w', delete=False, suffix='.json', encoding='utf-8')
            json.dump(body, f); f.close(); tmp.append(f.name)
            cmd += ['--data-binary', '@' + f.name]
        out = subprocess.run(cmd, capture_output=True)
        if out.returncode != 0:
            raise RuntimeError(f'curl failed ({out.returncode}): {out.stderr.decode(errors="replace")[:200]}')
        return json.loads(out.stdout.decode('utf-8'))
    finally:
        for t in tmp:
            try: os.remove(t)
            except OSError: pass


def upload(src_url, name):
    png = tempfile.NamedTemporaryFile(delete=False, suffix='.img').name
    subprocess.run(['curl', '-s', '-S', '-m', '120', '-o', png, src_url])
    with open(png, 'rb') as fh:
        data = fh.read()
    # A reference that is not a real picture (an expired link answers with a small error page) is never passed on.
    # References are uploaded before anything is sent, so this stops the run with nothing spent.
    if not whole(png):
        raise SystemExit(f'STOPPED before sending anything: the reference picture {name} could not be fetched ({src_url[:100]})')
    mime = 'image/png' if data[:4] == b'\x89PNG' else 'image/jpeg'
    a = api('POST', 'https://kieai.redpandaai.co/api/file-base64-upload', {'base64Data': f'data:{mime};base64,' + base64.b64encode(data).decode(), 'uploadPath': 'catalogue-studio', 'fileName': name + ('.png' if mime == 'image/png' else '.jpg')})
    return a['data']['downloadUrl']


def save(url, out, shot=''):
    # A download that comes back cut short is fetched again from the same link, never made (and paid for) again.
    for attempt in range(4):
        subprocess.run(['curl', '-s', '-S', '-m', '300', '-o', out, url])
        if whole(out):
            break
        print('download incomplete, fetching again', os.path.basename(out), flush=True)
        time.sleep(5)
    print('saved', os.path.basename(out), os.path.getsize(out), flush=True)
    if shot != 'spec' and out.lower().endswith('.png'):
        warm(out)


def whole(path):
    """The file is complete: a picture that opens fully, or a video of a sensible size."""
    if not os.path.exists(path) or os.path.getsize(path) < 1000:
        return False
    if path.lower().endswith('.mp4'):
        # a complete MP4 has its index ('moov'); a download cut off part way does not
        with open(path, 'rb') as fh:
            return b'moov' in fh.read()
    try:
        from PIL import Image
        Image.open(path).load()
        return True
    except Exception:
        return False


# ── Spending safeguards ──────────────────────────────────────────────────────────────────────────────────────────
# Every request ever sent to kie is written to a permanent ledger the moment it is sent. A picture or clip already in
# the ledger is NEVER sent again: if it is still being made the run waits for it; if it was made, its result is fetched
# again for free. Only a failed request (kie charges nothing for those) may be sent again. A remake is a NEW name (-v2).
# Before anything is sent the run prints what it will cost and stops if that is more than MAX_CREDITS (when set).
LEDGER = os.path.join(EXT, '_sent_ledger.json')


def load_ledger():
    if not os.path.exists(LEDGER):
        return {}
    with open(LEDGER, encoding='utf-8') as fh:
        return json.load(fh)


def _lock(fh):
    """Lock the ledger's lock file: msvcrt on Windows, fcntl on Linux and macOS."""
    try:
        import msvcrt
        fh.seek(0); msvcrt.locking(fh.fileno(), msvcrt.LK_NBLCK, 1)
    except ImportError:
        import fcntl
        fcntl.flock(fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)


def _unlock(fh):
    try:
        import msvcrt
        fh.seek(0); msvcrt.locking(fh.fileno(), msvcrt.LK_UNLCK, 1)
    except ImportError:
        import fcntl
        fcntl.flock(fh.fileno(), fcntl.LOCK_UN)


def note(ledger, out, **kw):
    """Record one request. Several runs can share the ledger at the same time, so the file is locked, re-read and
    merged before every write: no run can overwrite another run's entries."""
    lock = open(LEDGER + '.lock', 'a+')
    for _ in range(600):
        try:
            _lock(lock)
            break
        except OSError:
            time.sleep(0.1)
    else:
        raise SystemExit('STOPPED: could not lock the ledger')
    try:
        disk = load_ledger()
        disk[out] = {**disk.get(out, {}), **kw, 'at': time.strftime('%Y-%m-%d %H:%M:%S')}
        tmp = LEDGER + f'.{os.getpid()}.tmp'
        with open(tmp, 'w', encoding='utf-8') as fh:
            json.dump(disk, fh, indent=1)
        os.replace(tmp, LEDGER)
        ledger.clear(); ledger.update(disk)
    finally:
        _unlock(lock); lock.close()


def guard(count, each, what):
    cost = count * each
    print(f'PLAN: {count} {what} to send, {cost} credits', flush=True)
    cap = os.environ.get('MAX_CREDITS')
    if cap and cost > float(cap):
        raise SystemExit(f'STOPPED before sending anything: {cost} credits is more than MAX_CREDITS={cap}')


def warm(path, shift=2):
    """House colour standard: every picture (never the spec card) gets the same tiny warming of the whole image,
    red up and blue down by 2 out of 255, so diamonds look true to life. No shape, stone or position changes."""
    import numpy as np
    from PIL import Image
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.int16)
    a[..., 0] = np.clip(a[..., 0] + shift, 0, 255)
    a[..., 2] = np.clip(a[..., 2] - shift, 0, 255)
    Image.fromarray(a.astype('uint8')).save(path)


# The three pictures a ring is judged on before the other 21 are paid for: an audit showed these shots go wrong most
# often (stones close-up 26%, marble 18%), and when the model misreads a ring it misreads it in most pictures.
# A right ring costs the same; a misread one costs 18 credits, not 150.
FIRST = ('main-white', 'marble-white', 'stone-white')


def pictures(plan_name, stage=''):
    with open(os.path.join(HERE, plan_name), encoding='utf-8') as fh:
        plan = json.load(fh)
    if stage not in ('', 'first', 'rest'):
        raise SystemExit('STOPPED: the stage is "first" (3 pictures), "rest" (the other 21) or nothing (all)')
    if stage:
        plan['reqs'] = [r for r in plan['reqs'] if (r['shot'] in FIRST) == (stage == 'first')]
        print(f'STAGE {stage}: {len(plan["reqs"])} pictures of this plan', flush=True)
    ledger = load_ledger()
    tasks, send = {}, []
    for r in plan['reqs']:
        out = os.path.join(EXT, f"{r['task']}.png")
        if whole(out):
            continue
        rec = ledger.get(out)
        if rec and rec.get('state') in ('sent', 'done'):
            # already sent: wait for it or fetch its result again, never send (and pay for) it again
            tasks[rec['id']] = (r['shot'], out)
            continue
        send.append(r)
    guard(len(send), 6 if os.environ.get('PIC_MODEL', 'nb21') == 'nb21' else 10, 'pictures')
    kie = {}
    for h in {h for r in send for h in r['order']}:
        kie[h] = upload(plan['uniq'][h], h)
    print('uploaded', len(kie), 'references', flush=True)
    for r in send:
        out = os.path.join(EXT, f"{r['task']}.png")
        refs = [kie[h] for h in r['order']]
        # Nano Banana 2.1 by default; GPT Image only when asked for by name
        if os.environ.get('PIC_MODEL', 'nb21') == 'nb21':
            # Nano Banana 2.1 at 2K: 6 credits a picture instead of 10, same quality in our tests
            body = {'model': 'nano-banana-2-1', 'input': {'prompt': r['prompt'], 'image_input': refs, 'aspect_ratio': '1:1', 'resolution': '2K', 'output_format': 'png'}}
        else:
            body = {'model': 'gpt-image-2-5-sunburst-image-to-image', 'input': {'prompt': r['prompt'], 'input_urls': refs, 'aspect_ratio': '1:1', 'resolution': '2K', 'background': 'opaque'}}
        t = api('POST', 'https://api.kie.ai/api/v1/jobs/createTask', body)
        if t.get('code') != 200:
            print('REFUSED', r['shot'], t.get('code'), t.get('msg'), flush=True)
            continue
        tasks[t['data']['taskId']] = (r['shot'], out)
        note(ledger, out, id=t['data']['taskId'], state='sent', kind='picture')
        print('sent', r['shot'], flush=True)
    # One run waits until every picture is back (up to an hour), so nothing is ever sent twice while kie is busy
    for _ in range(450):
        for tid in list(tasks):
            s = api('GET', 'https://api.kie.ai/api/v1/jobs/recordInfo?taskId=' + tid)['data']
            shot, out = tasks[tid]
            if s.get('state') == 'success':
                save(json.loads(s['resultJson'])['resultUrls'][0], out, shot); print('  ->', shot, flush=True); del tasks[tid]
                note(ledger, out, state='done')
            elif s.get('state') == 'fail':
                print('FAILED', shot, s.get('failMsg'), flush=True); del tasks[tid]
                note(ledger, out, state='failed')
        if not tasks:
            break
        time.sleep(8)
    if tasks:
        print('STILL BEING MADE (kept in the ledger, fetched on the next run, never sent again):', len(tasks), flush=True)


if __name__ == '__main__':
    if len(sys.argv) >= 3 and sys.argv[1] == 'pictures':
        pictures(sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else '')
    else:
        raise SystemExit(__doc__)
