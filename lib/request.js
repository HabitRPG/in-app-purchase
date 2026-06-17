'use strict';

var http = require('http');
var https = require('https');

function build(defaultOptions) {
    function request(options, cb) {
        send(options.method, mergeOptions(defaultOptions, options), cb);
    }

    request.post = function (options, cb) {
        send('POST', mergeOptions(defaultOptions, options), cb);
    };

    request.put = function (options, cb) {
        send('PUT', mergeOptions(defaultOptions, options), cb);
    };

    request.del = function (options, cb) {
        send('DELETE', mergeOptions(defaultOptions, options), cb);
    };

    request.patch = function (options, cb) {
        send('PATCH', mergeOptions(defaultOptions, options), cb);
    };

    request.get = function (options, cb) {
        send('GET', mergeOptions(defaultOptions, options), cb);
    };

    request.head = function (options, cb) {
        send('HEAD', mergeOptions(defaultOptions, options), cb);
    };

    request.defaults = function (options) {
        return build(mergeOptions(defaultOptions, options));
    };

    return request;
}

module.exports = build();

function send(method, options, cb) {

    if (typeof options === 'string')    {
        options = {
            url: options,
            body: null    
        };
    }

    var bodyData = qstring(options.body, options || {});
    var opts = createOptions(method, bodyData, options || {});
    opts.headers = addHeaders(opts.headers, options || {});
    var proto = opts.port === 443 ? https : http;
    var req = proto.request(opts, function (res) {
        res.setEncoding('utf8');
        var data = '';
        res.on('data', function (chunk) {
            data += chunk;
        });
        res.on('end', function () {
            try {
                var parsedData = JSON.parse(data);
                res.body = parsedData;
                cb(null, res, parsedData);
            } catch (e) {
                res.body = data;
                cb(null, res, data);
            }
        });
    });
    req.on('error', cb);
    
    if (bodyData) {
        req.write(bodyData);
    }

    req.end();
}

function qstring(body, options) {
    
    if (!body) {
        return '';
    }

    if (options.json) {
        return JSON.stringify(body);
    }

    var q = [];
    for (var name in body) {
        q.push(
            encodeURIComponent(name) +
            '=' +
            encodeURIComponent(body[name])
        );
    }
    return q.join('&');
}

function createOptions(method, data, options) {
    var url = options.url;
    var proto = url.substring(0, url.indexOf('://') + 3);
    var noProto = url.replace(proto, '');
    var host = noProto.substring(0, noProto.indexOf('/'));
    var path = noProto.substring(noProto.indexOf('/'));
    var port = options.port || (proto === 'http://' ? 80 : 443);
    var ctype = options.json ? 'application/json' : 'application/x-www-form-urlencoded';
    var opts = {
        host: host,
        port: port,
        path: path,
        method: method,
        headers: {
            'Content-Type': ctype,
            'Content-Length': Buffer.byteLength(data)
        }
    };
    return opts;
}

function addHeaders(headers, options) {
    var headersToAdd = options.headers;
    if (!headersToAdd) {
        return headers;
    }
    for (var name in headersToAdd) {
        headers[name] = headersToAdd[name];
    }
    return headers;
}

function mergeOptions(base, override) {
    if (!base && !override) {
        return {};
    }
    if (typeof override === 'string') {
        return override;
    }
    base = base || {};
    override = override || {};
    var result = {};
    copyProps(result, base);
    copyProps(result, override);
    result.headers = {};
    copyProps(result.headers, base.headers || {});
    copyProps(result.headers, override.headers || {});
    if (!Object.keys(result.headers).length) {
        delete result.headers;
    }
    return result;
}

function copyProps(target, source) {
    for (var name in source) {
        target[name] = source[name];
    }
}
