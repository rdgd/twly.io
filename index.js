const http = require('http');
const https = require('https');
const twly = require('twly');
const qs = require('querystring');
const request = require('request');
const fs = require('fs');
const unzip = require('unzip');

function gitAccountRepoMeta (name, type = 'users') {
  return new Promise((accept, reject) => {
    var request = require('request');
    var options = {
      url: `https://api.github.com/${type}/${name}/repos`,
      headers: { 'User-Agent': 'twly' }
    };
    request(options, function (error, response, body) {
      (!error && response.statusCode === 200 && accept(JSON.parse(body))) || reject(error);
    });
  });
}

function makeRepoArchiveUrls (repoMeta) {
  return new Map(repoMeta.map((m) => [ m.name, { archiveUrl: `https://github.com/${m.full_name}/archive/${m.default_branch}.zip`, branch: m.default_branch }]));
}

function downloadRepos (repoNameUrlMap) {
  let promises = [];
  let tmpFolder = './tmp';

  repoNameUrlMap.forEach((v, k) => {
    var options = {
      url: v.archiveUrl,
      headers: { 'User-Agent': 'twly' }
    };
    let p = new Promise((resolve, reject) => {
      request(options, function (error, response, body) { if (error) { throw error; } })
      .pipe(unzip.Extract({ path: tmpFolder }))
      .on('error', () => { resolve([k, `${tmpFolder}/${k}-${v.branch}`]); })
      .on('finish', () => { resolve([k, `${tmpFolder}/${k}-${v.branch}`]); });
    });
    promises.push(p);
  });
  return Promise.all(promises);
}

function runTwly (paths) {
  let reports = [];
  paths = new Map(paths);
  paths.forEach((v, k) => {
    let p = new Promise((resolve, reject) => {
      twly({
        minLines: 3,
        files: `${v}/**/*.*`,
        failureThreshold: 95,
        logLevel: 'FATAL'
      }).then((report) => resolve(report));
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

function router (req, res) {
  switch (req.url) {
    case '/git/user':
      return parsePost(req)
               .then((params) => gitAccountRepoMeta(params.name))
               .then(makeRepoArchiveUrls)
               .then(downloadRepos)
               .then(runTwly);
      break;
    case '/git/account':
      return 'analyze for a whole git account';
      break;
    default:
      return 'not found!';
      break;
  }
}

http.createServer((req, res) => {
  if (req.method === 'POST') {
    router(req)
      .then((data) => {
        res.write(JSON.stringify(data));
        res.end();
      })
  } else {
    res.write('meh');
    res.end();
  }
}).listen(8080);
