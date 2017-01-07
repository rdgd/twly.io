const http = require('http');
const https = require('https');
const twly = require('twly');
const qs = require('querystring');
const request = require('request');
const fs = require('fs');
const unzip = require('unzip');

function router (req, res) {
  switch (req.url) {
    case '/git/user':
      return parsePost(req)
               .then((params) => gitUserRepoMeta(params.name))
               .then(makeRepoArchiveUrls)
               .then(downloadRepos);
      break;
    case '/git/account':
      return 'analyze for a whole git account';
      break;
    default:
      return 'not found!';
      break;
  }
}

function gitUserRepoMeta (name) {
  return new Promise((accept, reject) => {
    var request = require('request');
    var options = {
      url: 'https://api.github.com/users/rdgd/repos',
      headers: {
        'User-Agent': 'twly'
      }
    };
    request(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        accept(JSON.parse(body)); // Show the HTML for the Google homepage.
      }
    });
  });
}

function makeRepoArchiveUrls (repoMeta) {
  return new Map(repoMeta.map((m) => [ m.name, `https://github.com/${m.full_name}/archive/${m.default_branch}.zip` ]));
}

function downloadRepos (repoNameUrlMap) {
  let promises = [];
  repoNameUrlMap.forEach((v, k) => {
    var options = {
      url: v,
      headers: {
        'User-Agent': 'twly'
      }
    };
    request(options, function (error, response, body) {
      if (error) { throw error; }
    })
    .pipe(unzip.Extract({ path: `./tmp/${k}` }))
    //.pipe(fs.createWriteStream(`./tmp/${k}.zip`))
    .on('finish', () => {
      console.log('hey!');
    });
  });
}

function parsePost (req) {
  return new Promise((accept, reject) => {
    var body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      accept(qs.parse(body));
    });
  })
}


http.createServer((req, res) => {
  if (req.method === 'POST') {
    router(req)
      .then((params) => {
        res.write(JSON.stringify(params));
        res.end();
      })
  } else {
    res.write('meh');
    res.end();
  }
}).listen(8080);
