const http = require('http');
const https = require('https');
const twly = require('twly');
const qs = require('querystring');
const request = require('request');
const fs = require('fs');
const unzip = require('unzip');
const uuid = require('uuid/v4');
const WebSocketServer = require('ws').Server;
const child_process = require('child_process');
const GITHUB_API_BASE = 'https://api.github.com';
var userWebsockets = {};

var wss = new WebSocketServer({ port: 8081 });
 
wss.on('connection', function connection(ws) {
  let userId = parseUserIdFromCookie(ws.upgradeReq.headers.cookie);
  userWebsockets[userId] = ws;
  ws.on('message', (message) => {
    console.log('received: %s', message);
  });
 
  sendWsMessage(userId, 'connected');
});

function parseUserIdFromCookie (cookie) {
  let c = /twly\-uuid=([^;]+)/.exec(cookie)
  let userId = c ? c[1] : '';
  return userId;
}

function sendWsMessage (userId, title, payload = {}) {
  let ws = userWebsockets[userId];
  return ws.send(JSON.stringify({ title, payload }));
}

function gitAccountRepoMeta (name, type = 'users') {
  return new Promise((accept, reject) => {
    var options = {
      url: `${GITHUB_API_BASE}/${type}/${name}/repos`,
      headers: { 'User-Agent': 'twly' }
    };
    request(options, function (error, response, body) {
      (!error && response.statusCode === 200 && accept(JSON.parse(body))) || reject(error);
    });
  });
}

function makeRepoArchiveUrls (repoMeta) {
  return new Map(repoMeta.filter((m) => m.fork === false).map((m) => [ m.name, { archiveUrl: `https://github.com/${m.full_name}/archive/${m.default_branch}.zip`, branch: m.default_branch }]));
}

function downloadRepos (repoNameUrlMap, userId, accountName) {
  let promises = [];
  let tmpFolder = `./tmp/${userId}/${accountName}`;

  repoNameUrlMap.forEach((v, k) => {
    var options = {
      url: v.archiveUrl,
      headers: { 'User-Agent': 'twly' }
    };
    let p = new Promise((resolve, reject) => {
      sendWsMessage(userId, 'Downloading repo', { name: k });
      request(options, function (error, response, body) {
        if (error) {
          throw error;
        }
      })
        .pipe(unzip.Extract({ path: tmpFolder }))
          .on('error', () => {
            sendWsMessage(userId, 'Error downloading repo', { name: k });
            resolve([k, `${tmpFolder}/${k}-${v.branch}`]);
          })
          .on('finish', () => {
            sendWsMessage(userId, 'Repo download success', { name: k });
            resolve([k, `${tmpFolder}/${k}-${v.branch}`]);
          });
    });
    promises.push(p);
  });
  return Promise.all(promises);
}

function runTwly (paths, userId) {
  let reports = [];
  paths = new Map(paths);
  paths.forEach((v, k) => {
    let p = new Promise((resolve, reject) => {
      sendWsMessage(userId, 'Analyzing repo', { name: k });
      twly({
        minLines: 3,
        files: `${v}/**/*.*`,
        failureThreshold: 95,
        logLevel: 'FATAL'
      }).then((report) => {
        report.name = v;
        // let repoName = k.substring(k.indexOf(userId + '/') + (userId.length + 1));
        sendWsMessage(userId, 'Repo analyzed', { name: k, report: report });
        report.prettyName = k;
        resolve(report);
      });
    });
    reports.push(p);
  });

  return Promise.all(reports);
}

function parsePost (req) {
  return new Promise((accept, reject) => {
    var body = '';
    req.on('data', (chunk) => body += chunk );
    req.on('end', () => accept(qs.parse(body)));
  })
}

function cleanupTmp (userId, accountName) {
  child_process.exec(`rm -rf ./tmp/${userId} -y`, (err, stdout, stderr) => {
    console.log(err);
    console.log(stdout);
    console.log(stderr);
  });
}

function analyze (userId, accountName, accountType) {
    sendWsMessage(userId, 'Searching for repos');
    return gitAccountRepoMeta(accountName, accountType)
    .then((meta) => {
      sendWsMessage(userId, 'repos found', meta);
      return meta;
    })
    .then(makeRepoArchiveUrls)
    .then((urls) => {
      sendWsMessage(userId, 'Downloading repos', urls);
      return downloadRepos(urls, userId, accountName);
    })
    .then((repoPaths) => { 
      sendWsMessage(userId, 'Starting analysis', repoPaths);
      return runTwly(repoPaths, userId);
    })
    .then((reports) => {
      sendWsMessage(userId, 'All repos analyzed', { reports: reports });
      cleanupTmp(userId, accountName);
      return reports;
    });
}

function router (req, res) {
  let userId = parseUserIdFromCookie(req.headers.cookie);
  switch (req.url) {
    case '/analyze/user': {
      return parsePost(req)
        .then((params) => {
          return analyze(userId, params.name, 'users');
        });
      break;
    }
    case '/analyze/org':
      return parsePost(req)
        .then((params) => {
          return analyze(userId, params.name, 'orgs');
        });
      break;
    default:
      return 'not found!';
      break;
  }
}

http.createServer((req, res) => {
  if (req.method === 'POST') {
    // res.end(fs.readFileSync('./mock_twly.json', 'utf8'));
    router(req)
      .then((data) => {
        res.write(JSON.stringify(data));
        res.end();
      })
      .catch((err) => {
        console.log(err);
      });
  } else if (/^\/assets\//.test(req.url)) {
    fs.createReadStream('.' + req.url).pipe(res);
  } else if (/^\/third_party\//.test(req.url)) {
    let r = /^\/third_party\/([^\?]+)/.exec(req.url);
    // We have to strip the get params from the URL that fontawesome includes, and also they assume case-insensitive filesystem.
    fs.createReadStream('./node_modules/' + r[1].toLowerCase()).pipe(res);
  } else {
    if (!parseUserIdFromCookie(req.headers.cookie)) {
      let userId = uuid();
      res.writeHead(200, {
        'Set-Cookie': `twly-uuid=${userId}`,
      });
    }
    // userWebsockets[userId] = {};
    fs.createReadStream('./index.html').pipe(res);
  }
}).listen(8080);
