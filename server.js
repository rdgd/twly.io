const http = require('http');
const https = require('https');
const fs = require('fs-extra');
const uuid = require('uuid/v4');

const { parsePost, parseUserIdFromCookie } = require('./src/serverHelpers');
const sendWsMessage = require('./src/wsServer').sendWsMessage;
const git = (require('./src/gitService'))(sendWsMessage);
const analyze = (require('./src/analysisService').analyze)(sendWsMessage, git);
const cleanupTmp = require('./src/analysisService').cleanupTmp;

startServer();

function startServer () {
  let server = http.createServer((req, res) => {
    let userId = parseUserIdFromCookie(req.headers.cookie);
    if (req.method === 'POST') {
      // res.end(fs.readFileSync('./mock_twly.json', 'utf8'));
      router(req, userId)
        .then((data) => {
          res.write(JSON.stringify(data));
          res.end();
        })
        .catch((err) => console.log(err));
    } else if (/^\/assets\//.test(req.url)) {
      fs.createReadStream('.' + req.url).pipe(res);
    } else if (/^\/third_party\//.test(req.url)) {
      let r = /^\/third_party\/([^\?]+)/.exec(req.url);
      // We have to strip the get params from the URL that fontawesome includes, and also they assume case-insensitive filesystem.
      fs.createReadStream('./node_modules/' + r[1].toLowerCase()).pipe(res);
    } else {
      if (!parseUserIdFromCookie(req.headers.cookie)) {
        let userId = uuid();
        res.writeHead(200, { 'Set-Cookie': `twly-uuid=${userId}` });
      }
      fs.createReadStream('./index.html').pipe(res);
    }
  }).listen(8080);

  require('./src/wsServer').init(server);
}

function router (req, userId) {
  switch (req.url) {
    case '/analyze/user': {
      return parsePost(req)
        .then((params) => {
          let together = params.analysisType === 'together';
          return analyze(userId, params.name, 'users', together)
            .catch((err) => {
              console.log(err);
              cleanupTmp(userId, params.name);
            });
        });
    }
    case '/analyze/org':
      return parsePost(req)
        .then((params) => {
          let together = params.analysisType === 'together';
          return analyze(userId, params.name, 'orgs', together);
        });
    default:
      return 'not found!';
  }
}
