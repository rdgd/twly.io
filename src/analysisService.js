const twly = require('twly');
const fs = require('fs-extra');

function cleanupTmp (userId, accountName) {
  return fs.emptyDir(`./tmp/${userId}`).then(() => fs.remove(`./tmp/${userId}`));
}

module.exports = (sendWsMessage, git) => {
  function analyze (userId, accountName, accountType, analyzeTogether = false) {
    sendWsMessage(userId, 'Searching for repos');
    return git.gitAccountRepoMeta(accountName, accountType)
    .then((meta) => {
      sendWsMessage(userId, 'repos found', meta);
      return meta;
    })
    .then(git.makeRepoArchiveUrls)
    .then((urls) => {
      sendWsMessage(userId, 'Downloading repos', urls);
      return git.downloadRepos(urls, userId, accountName, analyzeTogether);
    })
    .then((repoPaths) => { 
      sendWsMessage(userId, 'Starting analysis', repoPaths);
      return runTwly(repoPaths, userId, analyzeTogether);
    })
    .then((reports) => {
      sendWsMessage(userId, 'All repos analyzed', { reports: reports });
      return reports;
    })
    .then((reports) => { 
      return cleanupTmp(userId, accountName)
        .then(() => reports);
    });
  }

  function runTwly (paths, userId, analyzeTogether = false) {
    let reports = [];
    paths = new Map(paths);
    paths.forEach((v, k) => {
        let p = new Promise((resolve, reject) => {
        sendWsMessage(userId, 'Analyzing repo', { name: k });
        twly({
            minLines: 3,
            files: `${v}/**/*.*`,
            failureThreshold: 100,
            logLevel: 'FATAL'
        }).then((report) => {
            report.name = v;
            // let repoName = k.substring(k.indexOf(userId + '/') + (userId.length + 1));
            sendWsMessage(userId, 'Repo analyzed', { name: k, report: report });
            report.prettyName = k;
            resolve(report);
        }).catch((err) => {
            console.log(err);
        });
        });
        reports.push(p);
    });
    return Promise.all(reports);
  }
  return analyze;
}