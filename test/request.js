var assert = require('assert');
var http = require('http');
var request = require('../lib/request');

describe('#### Local Request Helper ####', function () {

    var server;
    var baseUrl;
    var requestPort;

    before(function (done) {
        server = http.createServer(function (req, res) {
            var chunks = '';
            req.on('data', function (chunk) {
                chunks += chunk;
            });
            req.on('end', function () {
                if (req.url === '/text') {
                    res.statusCode = 200;
                    res.end('plain-text-response');
                    return;
                }
                if (req.url === '/json') {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                        method: req.method,
                        body: chunks,
                        ctype: req.headers['content-type'],
                        xBase: req.headers['x-base'],
                        xChild: req.headers['x-child']
                    }));
                    return;
                }
                res.statusCode = 404;
                res.end('not-found');
            });
        });
        server.listen(0, '127.0.0.1', function () {
            var info = server.address();
            baseUrl = 'http://127.0.0.1';
            requestPort = info.port;
            done();
        });
    });

    after(function (done) {
        server.close(done);
    });

    it('can send GET and parse JSON response', function (done) {
        request.get({
            url: baseUrl + '/json',
            port: requestPort
        }, function (error, res, body) {
            assert.equal(error, null);
            assert.equal(res.statusCode, 200);
            assert.equal(body.method, 'GET');
            assert.equal(res.body.method, 'GET');
            done();
        });
    });

    it('can send urlencoded body for POST', function (done) {
        request.post({
            url: baseUrl + '/json',
            port: requestPort,
            body: {
                a: '1',
                b: 'hello world'
            }
        }, function (error, res, body) {
            assert.equal(error, null);
            assert.equal(res.statusCode, 200);
            assert.equal(body.method, 'POST');
            assert.equal(body.ctype, 'application/x-www-form-urlencoded');
            assert(body.body.indexOf('a=1') > -1);
            assert(body.body.indexOf('b=hello%20world') > -1);
            done();
        });
    });

    it('can send JSON body when json option is true', function (done) {
        request.post({
            url: baseUrl + '/json',
            port: requestPort,
            json: true,
            body: {
                value: 7
            }
        }, function (error, res, body) {
            assert.equal(error, null);
            assert.equal(res.statusCode, 200);
            assert.equal(body.ctype, 'application/json');
            assert.equal(body.body, '{"value":7}');
            done();
        });
    });

    it('can merge default headers with request headers', function (done) {
        var reqWithDefaults = request.defaults({
            headers: {
                'X-Base': 'base-header'
            }
        });
        reqWithDefaults.get({
            url: baseUrl + '/json',
            port: requestPort,
            headers: {
                'X-Child': 'child-header'
            }
        }, function (error, res, body) {
            assert.equal(error, null);
            assert.equal(res.statusCode, 200);
            assert.equal(body.xBase, 'base-header');
            assert.equal(body.xChild, 'child-header');
            done();
        });
    });

    it('can use defaults with callable request function', function (done) {
        var reqWithDefaults = request.defaults({
            url: baseUrl + '/json',
            port: requestPort,
            method: 'GET'
        });
        reqWithDefaults({}, function (error, res, body) {
            assert.equal(error, null);
            assert.equal(res.statusCode, 200);
            assert.equal(body.method, 'GET');
            done();
        });
    });

    it('returns raw text when response is not JSON', function (done) {
        request.get({
            url: baseUrl + '/text',
            port: requestPort
        }, function (error, res, body) {
            assert.equal(error, null);
            assert.equal(res.statusCode, 200);
            assert.equal(body, 'plain-text-response');
            assert.equal(res.body, 'plain-text-response');
            done();
        });
    });

    it('returns network errors through callback', function (done) {
        request.get({
            url: 'http://127.0.0.1:1/fail'
        }, function (error) {
            assert(error);
            done();
        });
    });
});