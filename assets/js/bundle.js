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
	  var nameInput = document.getElementById('name');
	  var submitBtn = document.getElementById('submit');
	  var radios = Array.from(document.querySelectorAll('[type="radio"]'));
	  var ws = new WebSocket('ws://localhost:8081/events');
	  ws.onmessage = routeWSMessage;
	
	  nameInput.addEventListener('blur', validateForm);
	  submitBtn.addEventListener('click', runAnalysis);
	  radios.forEach(function (r) {
	    r.addEventListener('change', function (e) {
	      var prevEl = e.target.parentElement.previousElementSibling;
	      var nextEl = e.target.parentElement.nextElementSibling;
	      prevEl && prevEl.type === 'fieldset' ? prevEl.classList.remove('selected') : nextEl.classList.remove('selected');
	      e.target.parentElement.classList.add('selected');
	    });
	  });
	}
	
	function validateForm() {
	  checkGitAccountExists();
	}
	
	function routeWSMessage(msg) {
	  var data = JSON.parse(msg.data);
	  console.log(data);
	  switch (data.title) {
	    case 'connected':
	      {
	        console.log('says its connected1!');
	        break;
	      }
	    case 'repos found':
	      {
	        console.log(data.payload);
	        break;
	      }
	    case 'repos downloaded':
	      {
	        break;
	      }
	    case 'analysis started':
	      {
	        break;
	      }
	    case 'repo analyzed':
	      {
	        break;
	      }
	    case 'all repos analyzed':
	      {
	        break;
	      }
	    default:
	      {
	        break;
	      }
	  }
	}
	
	function runAnalysis(e) {
	  var selected = document.querySelector('[name="accountType"][checked]');
	  var http = new XMLHttpRequest();
	  var url = selected.id === 'user' ? '/git/user' : '/git/org';
	  var name = document.getElementById('name');
	  var params = "name=" + name.value;
	  http.responseType = 'json';
	  http.open("POST", url, true);
	
	  // Send the proper header information along with the request
	  http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	
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
	  var name = nameInput.value;
	  var validationIcon = nameInput.parentElement.parentElement.querySelector('.validation-icon');
	  // GitHub requires all account names to be atleast 4 characters long
	  if (name.length < 4) {
	    return showInvalid(validationIcon);
	  };
	
	  var http = new XMLHttpRequest();
	  var url = 'https://api.github.com/users/' + name;
	
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
	
	function displayResults(results) {
	  var resultContainer = document.getElementById('results');
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
	
	    repoName.textContent = r.name;
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
	}

/***/ }
/******/ ]);
//# sourceMappingURL=bundle.js.map