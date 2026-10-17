import json
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

from iniciar import Handler


class API(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.worker = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.worker.start()
        cls.url = f"http://127.0.0.1:{cls.server.server_port}"
        cls.client = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.worker.join()

    def test_health(self):
        with self.client.open(self.url + "/api/health") as r:
            self.assertEqual(json.load(r)["status"], "ok")

    def test_simulate(self):
        req = urllib.request.Request(
            self.url + "/api/simulate",
            json.dumps(dict(p=15000, c=10500, q=10, t=1000)).encode(),
            headers={"Content-Type": "application/json"},
        )
        with self.client.open(req) as r:
            self.assertEqual(json.load(r)["channel"], 30000)

    def test_bad_input(self):
        req = urllib.request.Request(
            self.url + "/api/simulate",
            b'{"p":0}',
            headers={"Content-Type": "application/json"},
        )
        with self.assertRaises(urllib.error.HTTPError) as e:
            self.client.open(req)
        self.assertEqual(e.exception.code, 400)

    def test_cross_origin_refused(self):
        req = urllib.request.Request(
            self.url + "/api/simulate",
            b"{}",
            headers={
                "Content-Type": "application/json",
                "Origin": "https://unrelated.invalid",
            },
        )
        with self.assertRaises(urllib.error.HTTPError) as e:
            self.client.open(req)
        self.assertEqual(e.exception.code, 403)

    def post_status(self, headers):
        req = urllib.request.Request(self.url + '/api/simulate',
            json.dumps(dict(p=15000,c=10500,q=10,t=1000)).encode(),
            headers={'Content-Type':'application/json',**headers})
        try:
            with self.client.open(req) as response:return response.status
        except urllib.error.HTTPError as error:return error.code

    def test_loopback_same_origin_ip_and_localhost(self):
        for host in (f'127.0.0.1:{self.server.server_port}', f'localhost:{self.server.server_port}'):
            with self.subTest(host=host):
                self.assertEqual(self.post_status({'Host':host,'Origin':'http://'+host}),200)

    def test_null_origin_is_refused(self):
        self.assertEqual(self.post_status({'Origin':'null'}),403)

    def test_alias_does_not_bypass_same_origin_check(self):
        self.assertEqual(self.post_status({'Origin':f'http://localhost:{self.server.server_port}'}),403)

    def test_matching_attacker_host_and_origin_are_refused(self):
        self.assertEqual(self.post_status({'Host':'attacker.invalid','Origin':'http://attacker.invalid'}),403)

    def test_health_refuses_untrusted_host(self):
        req=urllib.request.Request(self.url+'/api/health',headers={'Host':'attacker.invalid'})
        with self.assertRaises(urllib.error.HTTPError) as error:self.client.open(req)
        self.assertEqual(error.exception.code,403)
