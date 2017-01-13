document.addEventListener('DOMContentLoaded', setHooks);

function setHooks () { 
  let nameInput = document.getElementById('name');
  let submitBtn = document.getElementById('submit');
  let radios = Array.from(document.querySelectorAll('[type="radio"]'));
  let ws = new WebSocket('ws://localhost:8081/events');
  ws.onmessage = routeWSMessage;

  nameInput.addEventListener('blur', validateForm);
  submitBtn.addEventListener('click', runAnalysis);
  radios.forEach((r) => {
    r.addEventListener('change', (e) => {
      let prevEl = e.target.parentElement.previousElementSibling;
      let nextEl = e.target.parentElement.nextElementSibling;
      (prevEl && prevEl.type === 'fieldset') ? prevEl.classList.remove('selected') : nextEl.classList.remove('selected');
      e.target.parentElement.classList.add('selected');
    });
  });
}

function validateForm () {
  checkGitAccountExists();
}

function routeWSMessage (msg) {
  let data = JSON.parse(msg.data);
  console.log(data);
  switch (data.title) {
    case 'connected': {
      console.log('says its connected1!');
      break;
    }
    case 'repos found': {
      console.log(data.payload);
      break;
    }
    case 'repos downloaded': {
      break;
    }
    case 'analysis started': {
      break;
    }
    case 'repo analyzed': {
      break;
    }
    case 'all repos analyzed': {
      break;
    }
    default: {
      break;
    }
  }
}

function runAnalysis (e) {
  let selected = document.querySelector('[name="accountType"][checked]');
  let http = new XMLHttpRequest();
  let url = selected.id === 'user' ? '/git/user' : '/git/org';
  let name = document.getElementById('name');
  let params = "name=" + name.value;
  http.responseType = 'json';
  http.open("POST", url, true);

  // Send the proper header information along with the request
  http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

  http.onreadystatechange = (e) => { // Call a function when the state changes.
    if( http.readyState == 4 && http.status == 200) {
      storeResults(name.value, http.response);
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
  let name = nameInput.value;
  var validationIcon = nameInput.parentElement.parentElement.querySelector('.validation-icon');
  // GitHub requires all account names to be atleast 4 characters long
  if (name.length < 4) { return showInvalid(validationIcon); };

  var http = new XMLHttpRequest();
  var url = 'https://api.github.com/users/' + name;
  
  http.responseType = 'json';
  http.open('GET', url, true);
  showProgress(validationIcon);
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

function showProgress (i) {
 // i.classList = '';
 // i.classList.add('show', 'validation-icon', 'fa', 'fa-spin', 'fa-circle-o-notch');
}

function displayResults (results) {
  let resultContainer = document.getElementById('results');
  results.forEach((r) => {
    let resultWrap = document.createElement('div');
    let resultHeading = document.createElement('header');
    let repoName = document.createElement('h1');
    let summaryHeading = document.createElement('h3');
    let expandIcon = document.createElement('i');
    let detailsHeading = document.createElement('h3');
    let messages = document.createElement('ul');
    let summary = document.createElement('table');
    let tableHeaders = document.createElement('tr');
    let row = document.createElement('tr');
    let resultWrapClass = r.pass ? 'pass' : 'fail';

    resultWrap.classList.add(resultWrapClass, 'result-wrap');
    expandIcon.classList.add('fa', 'fa-plus-square', 'expander');
    messages.classList.add('collapsed');

    repoName.textContent = r.name;
    resultHeading.appendChild(repoName);
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
}
