const unzip = require('unzip');
const request = require('request');
const GITHUB_API_BASE = 'https://api.github.com';
const exec = require('child_process').exec;

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
    return new Map(repoMeta.filter((m) => m.fork === false).map((m) => [ m.name, m.clone_url ]));
  }

  function downloadRepos (repoNameUrlMap, userId, accountName, analyzeTogether = false) {
    let promises = [];
    let tmpFolder = `./tmp/${userId}/${accountName}`;
    repoNameUrlMap.forEach((url, name) => {
      let p = new Promise((resolve, reject) => {
        exec(`git clone ${url} ${tmpFolder}/${name}`, (err) => {
          if (err) {
            console.log(err);
            resolve([]);
          } else {
            sendWsMessage(userId, 'Repo download success', { name });
            resolve([name, `${tmpFolder}/${name}`]);
          }
        })
      });
      promises.push(p);
    }); 
    
    return analyzeTogether ? [['all repos', tmpFolder]] : Promise.all(promises);
  }

  return { gitAccountRepoMeta, makeRepoArchiveUrls, downloadRepos };
};