const unzip = require('unzip');
const request = require('request');
const GITHUB_API_BASE = 'https://api.github.com';

module.exports = (sendWsMessage) => {
  function gitAccountRepoMeta (name, type = 'users') {
    return new Promise((accept, reject) => {
      let options = {
        url: `${GITHUB_API_BASE}/${type}/${name}/repos`,
        headers: { 'User-Agent': 'twly' }
      };
      request(options, (error, response, body) => {
        (!error && response.statusCode === 200 && accept(JSON.parse(body))) || reject(error);
      });
    });
  }

  function makeRepoArchiveUrls (repoMeta) {
    return new Map(repoMeta.filter((m) => m.fork === false).map((m) => [ m.name, { archiveUrl: `https://github.com/${m.full_name}/archive/${m.default_branch}.zip`, branch: m.default_branch }]));
  }

  function downloadRepos (repoNameUrlMap, userId, accountName, analyzeTogether = false) {
    let promises = [];
    let tmpFolder = `./tmp/${userId}/${accountName}`;

    repoNameUrlMap.forEach((v, k) => {
      let options = {
        url: v.archiveUrl,
        headers: { 'User-Agent': 'twly' }
      };
      let p = new Promise((resolve, reject) => {
        sendWsMessage(userId, 'Downloading repo', { name: k });
        request(options, function (error, response, body) {
          if (error) { throw error; }
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

    return analyzeTogether ? [['all repos', tmpFolder]] : Promise.all(promises);
  }

  return { gitAccountRepoMeta, makeRepoArchiveUrls, downloadRepos };
};