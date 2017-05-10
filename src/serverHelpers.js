const qs = require('querystring');

function parsePost (req) {
  return new Promise((accept, reject) => {
    var body = '';
    req.on('data', (chunk) => body += chunk );
    req.on('end', () => accept(qs.parse(body)));
  })
}

function parseUserIdFromCookie (cookie) {
  let c = /twly\-uuid=([^;]+)/.exec(cookie);
  let userId = c ? c[1] : '';
  return userId;
}

module.exports = { parsePost, parseUserIdFromCookie };