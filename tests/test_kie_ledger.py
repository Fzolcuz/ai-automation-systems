"""Tests for the Image Studio spending safety. Run: python -m unittest discover -s tests -p "test_*.py"
No key, no network: kie.ai is replaced by a stand-in."""
import json, os, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'src', 'image-studio'))
TMP = tempfile.mkdtemp()
os.environ['STUDIO_DIR'] = TMP
os.environ['KIE_API_KEY'] = 'test-key'
import kie_batch as kie  # noqa: E402


class SpendingSafety(unittest.TestCase):
    def setUp(self):
        if os.path.exists(kie.LEDGER):
            os.remove(kie.LEDGER)
        self.sent = []

        def fake_api(method, url, body=None):
            if 'createTask' in url:
                self.sent.append(body)
                return {'code': 200, 'data': {'taskId': f't{len(self.sent)}'}}
            return {'data': {'state': 'success', 'resultJson': json.dumps({'resultUrls': ['https://x/y.png']})}}
        kie.api = fake_api
        kie.upload = lambda url, name: 'https://kie/ref/' + name
        kie.save = lambda url, out, shot='': None
        kie.whole = lambda path: False
        kie.time.sleep = lambda s: None

    def plan(self, tasks):
        p = os.path.join(TMP, 'plan.json')
        with open(p, 'w', encoding='utf-8') as fh:
            json.dump({'uniq': {'h1': 'https://ref/1.png'}, 'reqs': [{'task': t, 'shot': 'main-white', 'order': ['h1'], 'prompt': '(private)'} for t in tasks]}, fh)
        return 'plan.json'

    def test_credit_cap_stops_before_anything_is_sent(self):
        os.environ['MAX_CREDITS'] = '10'
        try:
            with self.assertRaises(SystemExit):
                kie.pictures(self.plan(['a', 'b']))   # 2 pictures x 6 credits = 12 > 10
            self.assertEqual(self.sent, [])
        finally:
            del os.environ['MAX_CREDITS']

    def test_already_sent_is_never_sent_again(self):
        ledger = {}
        kie.note(ledger, os.path.join(kie.EXT, 'a.png'), id='t-old', state='sent', kind='picture')
        kie.pictures(self.plan(['a', 'b']))
        self.assertEqual(len(self.sent), 1)          # only "b" is paid for

    def test_ledger_writes_merge_instead_of_overwriting(self):
        first, second = {}, {}
        kie.note(first, 'x.png', state='sent')
        kie.note(second, 'y.png', state='sent')       # a second run with its own, older copy
        self.assertEqual(sorted(kie.load_ledger()), ['x.png', 'y.png'])


if __name__ == '__main__':
    unittest.main()
