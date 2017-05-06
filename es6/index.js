document.addEventListener('DOMContentLoaded', setHooks);

function setHooks () {
  let historyIcon = document.getElementById('history-icon');
  let searchIcon = document.getElementById('search-icon');
  let nameInput = document.getElementById('name');
  let submitBtn = document.getElementById('submit');
  let slider = document.getElementById('score');
  let radios = Array.from(document.querySelectorAll('[type="radio"]'));
  let ws = new WebSocket('ws://local.ss.twly.io/events');
  ws.onmessage = routeWSMessage;

  slider.addEventListener('change', function (e) {
    console.log(e.currentTarget.value);
  })
  historyIcon.addEventListener('click', showHistory);
  searchIcon.addEventListener('click', showSearch);
  nameInput.addEventListener('blur', validateForm);
  submitBtn.addEventListener('click', runAnalysis);
  radios.forEach((r) => {
    r.addEventListener('change', (e) => {
      let prevEl = e.target.parentElement.previousElementSibling;
      let nextEl = e.target.parentElement.nextElementSibling;
      (prevEl && prevEl.type === 'fieldset') ? prevEl.classList.remove('selected') : nextEl.classList.remove('selected');
      e.target.parentElement.classList.add('selected');
      e.currentTarget.name === 'accountType' && checkGitAccountExists();
    });
  });
}

function showHistory () {
  let searchWrap = document.getElementById('search-wrap');
  let historyWrap = document.getElementById('history-wrap');
  historyWrap.classList.remove('hide');
  searchWrap.classList.add('hide');
  populateHistory();
}

function showSearch () {
  let searchWrap = document.getElementById('search-wrap');
  let historyWrap = document.getElementById('history-wrap');
  historyWrap.classList.add('hide');
  searchWrap.classList.remove('hide');
}

function populateHistory () {
  let twly = localStorage.getItem('twly');
  if (!twly) { return false; }
  twly = JSON.parse(twly);
  let historyWrap = document.getElementById('history-wrap');
  let tbl = document.getElementById('history-table');
  if (tbl) {
    tbl.parentElement.removeChild(tbl);
  }
  tbl = document.createElement('table');
  let headers = document.createElement('tr');
  let nameHeader = document.createElement('th');
  let timeHeader = document.createElement('th');

  nameHeader.innerText = 'Name';
  timeHeader.innerText = 'Timestamp';
  tbl.id = 'history-table';
  tbl.appendChild(headers);
  headers.appendChild(nameHeader);
  headers.appendChild(timeHeader);
  headers.appendChild(document.createElement('th'));

  // It's an object, not an array. An array of objects with a name property would solve this issue.
  // twly.history.sort((a, b) => {
  //   let d1 = new Date(a.timestamp);
  //   let d2 = new Date(b.timestamp);
  //   if (d1 < d2) {
  //     return -1;
  //   } else if (d2 < d1) {
  //     return 1;
  //   } else {
  //     return 0;
  //   }
  // });
  for (let h in twly.history) {
    let tr = document.createElement('tr');
    let name = document.createElement('td');
    let time = document.createElement('td');
    let load = document.createElement('td');
    let loadSpan = document.createElement('span');
    load.classList.add('load');
    loadSpan.innerHTML = '<a href="#">Load</a>';
    loadSpan.addEventListener('click', (e) => {
      displayResults(twly.history[h].results);
    });

    load.appendChild(loadSpan);

    name.innerText = h;
    let d = new Date(twly.history[h].timestamp);
    time.innerText = `${d.toDateString()} ${d.toTimeString()}`;
    tbl.appendChild(tr);
    tr.appendChild(name);
    tr.appendChild(time);
    tr.appendChild(load);
  }

  historyWrap.appendChild(tbl);
}

function validateForm () {
  checkGitAccountExists();
}

function updateProgress (message, pct = 1) {
  var msg = document.getElementById('progress-message');
  var percentIndicator = document.getElementById('pct');
  msg.textContent = message;
  percentIndicator.style.width = `${pct}%`;
}

function getPct () {
  let currentPctEl = document.getElementById('pct');
  let currentPct = parseInt(currentPctEl.style.width);
  return (currentPct + ((33 / numRepos) / 2));
}

let numRepos = 0;
function routeWSMessage (msg) {
  let data = JSON.parse(msg.data);

  switch (data.title.toLowerCase()) {
    case 'connected': {
      break;
    }
    case 'searching for repos': {
      numRepos = 0;
      updateProgress(data.title);
      break;
    }
    case 'repos found': {
      numRepos = data.payload.length;
      updateProgress(`${data.payload.length} ${data.title}`, 33);
      console.log(data.payload);
      break;
    }
    case 'downloading repos': {
      updateProgress(data.title, 33);
      console.log(data.payload);
      break;
    }
    case 'downloading repo': {
      updateProgress(`${data.title} ${data.payload.name}`, getPct());
      console.log(data.payload);
      break;
    }
    case 'repo download success': {
      updateProgress(`${data.title} ${data.payload.name}`, getPct());
      console.log(data.payload);
      break;
    }
    case 'error downloading repo': {
      updateProgress(`repo download success ${data.payload.name}`, getPct());
      console.log(data.payload);
      break;
    }
    case 'starting analysis': {
      updateProgress(`${data.title}`, 66);
      break;
    }  
    case 'analyzing repo': {
      updateProgress(`${data.title} ${data.payload.name}`, getPct());
      break;
    }
    case 'repo analyzed': {
      updateProgress(`${data.title} ${data.payload.name}`, getPct());
      break;
    }
    case 'all repos analyzed': {
      let progress = document.getElementById('progress');
      updateProgress(`${data.title}`, 100);
      progress.classList.add('hide');
      break;
    }
    default: {
      break;
    }
  }
}

function runAnalysis (e) {
  let progress = document.getElementById('progress');
  let results = document.getElementById('results');
  let submitBtn = document.getElementById('submit');
  let analysisType = Array.from(document.querySelectorAll('[name="analysisType"]')).filter((i) => i.checked)[0].value;
  let selected = Array.from(document.querySelectorAll('[name="accountType"]')).filter((i) => i.checked)[0];
  let http = new XMLHttpRequest();
  let url = selected.id === 'user' ? '/analyze/user' : '/analyze/org';
  let name = document.getElementById('name');
  let params = `name=${name.value}&analysisType=${analysisType}`;
  http.responseType = 'json';
  http.open("POST", url, true);
  submitBtn.setAttribute('disabled', '');
  // Send the proper header information along with the request
  http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

  progress.classList.remove('hide');

  http.onreadystatechange = (e) => { // Call a function when the state changes.
    if( http.readyState == 4 && http.status == 200) {
      storeResults(name.value, http.response);
      submitBtn.removeAttribute('disabled');
      displayResults(http.response);
    }
  }
  http.send(params);
};

function storeResults (name, results) {
  let obj = JSON.parse(localStorage.getItem('twly')) || {};
  if (!obj.history) { obj.history = {}; }
  obj.history[name] = { timestamp: new Date(), results: results };

  localStorage.setItem('twly', JSON.stringify(obj));
}

function checkGitAccountExists () {
  let nameInput = document.getElementById('name');
  let orgInput = document.getElementById('organization');
  let isOrg = !!orgInput.checked;
  const GITHUB_API_BASE = 'https://api.github.com';
  let name = nameInput.value;
  let validationIcon = nameInput.parentElement.parentElement.querySelector('.validation-icon');
  // GitHub requires all account names to be atleast 4 characters long
  // if (name.length < 4) { return showInvalid(validationIcon); };

  var http = new XMLHttpRequest();
  var url = isOrg ? `${GITHUB_API_BASE}/orgs/${name}` : `${GITHUB_API_BASE}/users/${name}`;
  
  http.responseType = 'json';
  http.open('GET', url, true);

  http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
  http.onreadystatechange = function () { //Call a function when the state changes.
    if(http.readyState === 4) {
      if (http.status === 200) {
        showValidated(validationIcon);
      } else if (http.status === 404) {
        showInvalid(validationIcon);
      }
    }
  }
  http.send();
}

function showValidated (i) {
  let nameInput = document.getElementById('name');
  let submitBtn = document.getElementById('submit');
  nameInput.parentElement.classList.add('valid');
  nameInput.parentElement.classList.remove('invalid');
  submitBtn.removeAttribute('disabled');
}

function showInvalid (i) {
  let nameInput = document.getElementById('name');
  let submitBtn = document.getElementById('submit');
  nameInput.parentElement.classList.remove('valid');
  nameInput.parentElement.classList.add('invalid');
  submitBtn.setAttribute('disabled', '');
}

function displayNoRepoMessage () {
  let resultContainer = document.getElementById('results');
  let msg = document.createElement('h2');
  msg.innerText = 'User has no repos!';
  resultContainer.appendChild(msg);
  resultContainer.classList.remove('hide');
}

function displayResults (results) {
  let resultContainer = document.getElementById('results');
  resultContainer.innerHTML = '';
  let resultsHeader = document.createElement('h3');
  resultsHeader.innerText = 'Results';
  resultContainer.appendChild(resultsHeader);
  if (results.length === 0) {
    return displayNoRepoMessage();
  }
  results.forEach((r) => {
    let resultWrap = document.createElement('div');
    let resultHeading = document.createElement('header');
    let repoName = document.createElement('h1');
    let summaryHeading = document.createElement('h4');
    let expandIcon = document.createElement('i');
    let detailsHeading = document.createElement('h4');
    let messages = document.createElement('ul');
    let summary = document.createElement('table');
    let tableHeaders = document.createElement('tr');
    let row = document.createElement('tr');
    let resultWrapClass = r.pass ? 'pass' : 'fail';
    let icon = document.createElement('i');
    let iconClass = r.pass ? 'fa-check-circle' : 'fa-times-circle';
    icon.classList.add('fa');
    icon.classList.add(iconClass);
    summary.classList.add('results-table');

    resultWrap.classList.add(resultWrapClass, 'result-wrap');
    expandIcon.classList.add('fa', 'fa-plus-square', 'expander');
    messages.classList.add('collapsed');

    repoName.textContent = r.prettyName;
    resultHeading.appendChild(repoName);
    resultHeading.appendChild(icon);
    summaryHeading.textContent = 'Summary';
    detailsHeading.textContent = 'Details';

    r.messages.forEach((m) => {
      let pre = document.createElement('pre');
      pre.textContent = m;
      messages.appendChild(document.createElement('li').appendChild(pre));
    });
    if (r.messages.length === 0) {
      let nothing = document.createElement('li');
      nothing.textContent = 'Perfect score. You rock! Way to remember your towel.';
      messages.appendChild(nothing);
    }
    r.summary.Score = r.towelieScore + '%';
    for (let k in r.summary) {
      let tdh = document.createElement('th');
      let td = document.createElement('td');
      tdh.textContent = k;
      tableHeaders.appendChild(tdh);
      td.textContent = r.summary[k];
      row.appendChild(td);
    }
    summary.appendChild(tableHeaders);
    summary.appendChild(row);
    resultWrap.appendChild(resultHeading);
    detailsHeading.appendChild(expandIcon);
    resultWrap.appendChild(summaryHeading);
    resultWrap.appendChild(summary);
    resultWrap.appendChild(detailsHeading);
    resultWrap.appendChild(messages);
    resultContainer.appendChild(resultWrap);

    expandIcon.addEventListener('click', (e) => {
      messages.classList.toggle('collapsed');
      expandIcon.classList.toggle('fa-plus-square');
      expandIcon.classList.toggle('fa-minus-square');
    });
  });

  resultContainer.classList.remove('hide');
}
