/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports) {

	'use strict';
	
	document.addEventListener('DOMContentLoaded', setHooks);
	
	function setHooks() {
	  var historyIcon = document.getElementById('history-icon');
	  var searchIcon = document.getElementById('search-icon');
	  var nameInput = document.getElementById('name');
	  var submitBtn = document.getElementById('submit');
	  var radios = Array.from(document.querySelectorAll('[type="radio"]'));
	  var ws = new WebSocket('ws://localhost:8081/events');
	  ws.onmessage = routeWSMessage;
	
	  historyIcon.addEventListener('click', showHistory);
	  searchIcon.addEventListener('click', showSearch);
	  nameInput.addEventListener('blur', validateForm);
	  submitBtn.addEventListener('click', runAnalysis);
	  radios.forEach(function (r) {
	    r.addEventListener('change', function (e) {
	      var prevEl = e.target.parentElement.previousElementSibling;
	      var nextEl = e.target.parentElement.nextElementSibling;
	      prevEl && prevEl.type === 'fieldset' ? prevEl.classList.remove('selected') : nextEl.classList.remove('selected');
	      e.target.parentElement.classList.add('selected');
	      e.currentTarget.name === 'accountType' && checkGitAccountExists();
	    });
	  });
	}
	
	function showHistory() {
	  var searchWrap = document.getElementById('search-wrap');
	  var historyWrap = document.getElementById('history-wrap');
	  historyWrap.classList.remove('hide');
	  searchWrap.classList.add('hide');
	  populateHistory();
	}
	
	function showSearch() {
	  var searchWrap = document.getElementById('search-wrap');
	  var historyWrap = document.getElementById('history-wrap');
	  historyWrap.classList.add('hide');
	  searchWrap.classList.remove('hide');
	}
	
	function populateHistory() {
	  var twly = localStorage.getItem('twly');
	  if (!twly) {
	    return false;
	  }
	  twly = JSON.parse(twly);
	  var historyWrap = document.getElementById('history-wrap');
	  var tbl = document.getElementById('history-table');
	  if (tbl) {
	    tbl.parentElement.removeChild(tbl);
	  }
	  tbl = document.createElement('table');
	  var headers = document.createElement('tr');
	  var nameHeader = document.createElement('th');
	  var timeHeader = document.createElement('th');
	
	  nameHeader.innerText = 'Name';
	  timeHeader.innerText = 'Timestamp';
	  tbl.id = 'history-table';
	  tbl.appendChild(headers);
	  headers.appendChild(nameHeader);
	  headers.appendChild(timeHeader);
	  headers.appendChild(document.createElement('th'));
	
	  var _loop = function _loop(h) {
	    var tr = document.createElement('tr');
	    var name = document.createElement('td');
	    var time = document.createElement('td');
	    var load = document.createElement('td');
	    var loadSpan = document.createElement('span');
	    load.classList.add('load');
	    loadSpan.innerHTML = '<a href="#">Load</a>';
	    loadSpan.addEventListener('click', function (e) {
	      displayResults(twly.history[h].results);
	    });
	
	    load.appendChild(loadSpan);
	
	    name.innerText = h;
	    var d = new Date(twly.history[h].timestamp);
	    time.innerText = d.toDateString() + ' ' + d.toTimeString();
	    tbl.appendChild(tr);
	    tr.appendChild(name);
	    tr.appendChild(time);
	    tr.appendChild(load);
	  };
	
	  for (var h in twly.history) {
	    _loop(h);
	  }
	
	  historyWrap.appendChild(tbl);
	}
	
	function validateForm() {
	  checkGitAccountExists();
	}
	
	function updateProgress(message) {
	  var pct = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;
	
	  var msg = document.getElementById('progress-message');
	  var percentIndicator = document.getElementById('pct');
	  msg.textContent = message;
	  percentIndicator.style.width = pct + '%';
	}
	
	function getPct() {
	  var currentPctEl = document.getElementById('pct');
	  var currentPct = parseInt(currentPctEl.style.width);
	  return currentPct + 33 / numRepos / 2;
	}
	
	var numRepos = 0;
	function routeWSMessage(msg) {
	  var data = JSON.parse(msg.data);
	
	  switch (data.title.toLowerCase()) {
	    case 'connected':
	      {
	        break;
	      }
	    case 'searching for repos':
	      {
	        numRepos = 0;
	        updateProgress(data.title);
	        break;
	      }
	    case 'repos found':
	      {
	        numRepos = data.payload.length;
	        updateProgress(data.payload.length + ' ' + data.title, 33);
	        console.log(data.payload);
	        break;
	      }
	    case 'downloading repos':
	      {
	        updateProgress(data.title, 33);
	        console.log(data.payload);
	        break;
	      }
	    case 'downloading repo':
	      {
	        updateProgress(data.title + ' ' + data.payload.name, getPct());
	        console.log(data.payload);
	        break;
	      }
	    case 'repo download success':
	      {
	        updateProgress(data.title + ' ' + data.payload.name, getPct());
	        console.log(data.payload);
	        break;
	      }
	    case 'error downloading repo':
	      {
	        updateProgress('repo download success ' + data.payload.name, getPct());
	        console.log(data.payload);
	        break;
	      }
	    case 'starting analysis':
	      {
	        updateProgress('' + data.title, 66);
	        break;
	      }
	    case 'analyzing repo':
	      {
	        updateProgress(data.title + ' ' + data.payload.name, getPct());
	        break;
	      }
	    case 'repo analyzed':
	      {
	        updateProgress(data.title + ' ' + data.payload.name, getPct());
	        break;
	      }
	    case 'all repos analyzed':
	      {
	        var progress = document.getElementById('progress');
	        updateProgress('' + data.title, 100);
	        progress.classList.add('hide');
	        break;
	      }
	    default:
	      {
	        break;
	      }
	  }
	}
	
	function runAnalysis(e) {
	  var progress = document.getElementById('progress');
	  var results = document.getElementById('results');
	  var selected = Array.from(document.querySelectorAll('[name="accountType"]')).filter(function (i) {
	    return i.checked;
	  })[0];
	  var http = new XMLHttpRequest();
	  var url = selected.id === 'user' ? '/analyze/user' : '/analyze/org';
	  var name = document.getElementById('name');
	  var params = "name=" + name.value;
	  http.responseType = 'json';
	  http.open("POST", url, true);
	
	  // Send the proper header information along with the request
	  http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	
	  progress.classList.remove('hide');
	
	  http.onreadystatechange = function (e) {
	    // Call a function when the state changes.
	    if (http.readyState == 4 && http.status == 200) {
	      storeResults(name.value, http.response);
	      displayResults(http.response);
	    }
	  };
	  http.send(params);
	};
	
	function storeResults(name, results) {
	  var obj = JSON.parse(localStorage.getItem('twly')) || {};
	  if (!obj.history) {
	    obj.history = {};
	  }
	  obj.history[name] = { timestamp: new Date(), results: results };
	
	  localStorage.setItem('twly', JSON.stringify(obj));
	}
	
	function checkGitAccountExists() {
	  var nameInput = document.getElementById('name');
	  var orgInput = document.getElementById('organization');
	  var isOrg = !!orgInput.checked;
	  var GITHUB_API_BASE = 'https://api.github.com';
	  var name = nameInput.value;
	  var validationIcon = nameInput.parentElement.parentElement.querySelector('.validation-icon');
	  // GitHub requires all account names to be atleast 4 characters long
	  // if (name.length < 4) { return showInvalid(validationIcon); };
	
	  var http = new XMLHttpRequest();
	  var url = isOrg ? GITHUB_API_BASE + '/orgs/' + name : GITHUB_API_BASE + '/users/' + name;
	
	  http.responseType = 'json';
	  http.open('GET', url, true);
	  showProgress(validationIcon);
	  http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	  http.onreadystatechange = function () {
	    //Call a function when the state changes.
	    if (http.readyState === 4) {
	      if (http.status === 200) {
	        showValidated(validationIcon);
	      } else if (http.status === 404) {
	        showInvalid(validationIcon);
	      }
	    }
	  };
	  http.send();
	}
	
	function showValidated(i) {
	  var nameInput = document.getElementById('name');
	  var submitBtn = document.getElementById('submit');
	  nameInput.parentElement.classList.add('valid');
	  nameInput.parentElement.classList.remove('invalid');
	  submitBtn.removeAttribute('disabled');
	}
	
	function showInvalid(i) {
	  var nameInput = document.getElementById('name');
	  var submitBtn = document.getElementById('submit');
	  nameInput.parentElement.classList.remove('valid');
	  nameInput.parentElement.classList.add('invalid');
	  submitBtn.setAttribute('disabled', '');
	}
	
	function showProgress(i) {
	  // i.classList = '';
	  // i.classList.add('show', 'validation-icon', 'fa', 'fa-spin', 'fa-circle-o-notch');
	}
	
	function displayNoRepoMessage() {
	  var resultContainer = document.getElementById('results');
	  var msg = document.createElement('h2');
	  msg.innerText = 'User has no repos!';
	  resultContainer.appendChild(msg);
	}
	
	function displayResults(results) {
	  if (results.length === 0) {
	    return displayNoRepoMessage();
	  }
	  var resultContainer = document.getElementById('results');
	  resultContainer.innerHTML = '';
	  results.forEach(function (r) {
	    var resultWrap = document.createElement('div');
	    var resultHeading = document.createElement('header');
	    var repoName = document.createElement('h1');
	    var summaryHeading = document.createElement('h3');
	    var expandIcon = document.createElement('i');
	    var detailsHeading = document.createElement('h3');
	    var messages = document.createElement('ul');
	    var summary = document.createElement('table');
	    var tableHeaders = document.createElement('tr');
	    var row = document.createElement('tr');
	    var resultWrapClass = r.pass ? 'pass' : 'fail';
	
	    resultWrap.classList.add(resultWrapClass, 'result-wrap');
	    expandIcon.classList.add('fa', 'fa-plus-square', 'expander');
	    messages.classList.add('collapsed');
	
	    repoName.textContent = r.prettyName;
	    resultHeading.appendChild(repoName);
	    summaryHeading.textContent = 'Summary';
	    detailsHeading.textContent = 'Details';
	
	    r.messages.forEach(function (m) {
	      var pre = document.createElement('pre');
	      pre.textContent = m;
	      messages.appendChild(document.createElement('li').appendChild(pre));
	    });
	    if (r.messages.length === 0) {
	      var nothing = document.createElement('li');
	      nothing.textContent = 'Perfect score. You rock! Way to remember your towel.';
	      messages.appendChild(nothing);
	    }
	    r.summary.Score = r.towelieScore + '%';
	    for (var k in r.summary) {
	      var tdh = document.createElement('th');
	      var td = document.createElement('td');
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
	
	    expandIcon.addEventListener('click', function (e) {
	      messages.classList.toggle('collapsed');
	      expandIcon.classList.toggle('fa-plus-square');
	      expandIcon.classList.toggle('fa-minus-square');
	    });
	  });
	
	  resultContainer.classList.remove('hide');
	}

/***/ }
/******/ ]);
//# sourceMappingURL=bundle.js.map