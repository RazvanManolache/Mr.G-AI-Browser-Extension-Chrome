const logoutLink = document.getElementById('logoutLink');
const confirmLogout = document.getElementById('confirmLogout');
const localServerDiv = document.getElementById('localServerDiv');
const configForm = document.getElementById('configForm');

const resultsDiv = document.getElementById('resultsDiv');
const resultsList = document.getElementById('resultsList');
const noResults = document.getElementById('noResults');

const yesLogout = document.getElementById('yesLogout');
const noLogout = document.getElementById('noLogout');

const notConnected = document.getElementById('notConnected');


const serverAddress = document.getElementById('serverAddress');
const submitServerAdress = document.getElementById('submitServerAdress');
const serverNotAccessible = document.getElementById('serverNotAccessible');

const seeMoreLink = document.getElementById('seeMoreLink');
const seeMore = document.getElementById('seeMore');


function hideAll() {

    logoutLink.style.display = 'none';
    localServerDiv.style.display = 'none';
    confirmLogout.style.display = 'none';

    resultsDiv.style.display = 'none';
    notConnected.style.display = 'none';
    seeMore.style.display = 'none';
}


function changeState(state) {
    hideAll();
    switch (state) {
        case 'results':

            resultsDiv.style.display = 'block';
            logoutLink.style.display = 'block';
            renderRequestList();
            break;
        case 'notConnected':
            notConnected.style.display = 'block';
            break;
        case 'seeMore':
            seeMore.style.display = 'block';
            break;
        case 'configure':
            localServerDiv.style.display = 'block';
            break;
        case 'confirmLogout':
            confirmLogout.style.display = 'block';
            break;
    }
}

function renderRequestList() {
    resultsList.style.display = 'none';
    noResults.style.display = 'none';
    chrome.storage.local.get(['requestHistory'], function (result) {
        if (!result.requestHistory) {
            noResults.style.display = 'block';
            return;
        }
        var requests = result.requestHistory;

        requests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        resultsList.style.display = 'block';
        seeMore.style.display = 'block';
        resultsList.innerHTML = '';

        for (let i = 0; i < 2; i++) {
            if(i>= requests.length) break;
            let request = requests[i];
            let item = document.createElement('div');
            item.classList.add('result');
            const timestamp = new Date(request.timestamp).toLocaleString();
            let results = request.results;
            let details = "";
            for (var key in request.data) {
                details += `<p><strong>${key}</strong>: ${request.data[key]}</p>`;
            }
            results = ""
            for (var key in request.result) {
                res = request.result[key];
                res.forEach(function (res2) {
                    if (res2.type == 'images')
                        results += '<img src="data:image/png;base64, ' + res2.contents + '" />'
                    else
                        console.error("Unknown type: " + res2.type);
                })
            }
            item.innerHTML = `
            <div class="title"><strong style="margin: 0 10px;">${request.action}</strong> <div class="status ${request.status}">${request.status}</div> <div class="timestamp">${timestamp}</div></div>
            <p>${results}</p>
            
        `;


           

            resultsList.appendChild(item);
        }
        // create also a div that contains how many are in total
        seeMoreLink.textContent = 'Full list (' + requests.length + ')';


    });
}

logoutLink.addEventListener('click', function () {
    changeState('confirmLogout');
});

yesLogout.addEventListener('click', function () {
    chrome.storage.local.remove('serverAddress', function() {
        changeState('configure');
    });
});

noLogout.addEventListener('click', function () {
    changeState('results');
});

seeMoreLink.addEventListener('click', function () {
    chrome.tabs.create({ 'url': chrome.runtime.getURL('allresults.html') }, function (tab) {
    });
});
    configForm.addEventListener('submit', function (event) {
        event.preventDefault();
        let serverAddress = document.getElementById('serverAddress').value;
        chrome.storage.local.set({ serverAddress: serverAddress }, function () {
            checkConfiguration();
            //chrome.runtime.sendMessage({action: 'fetchActions'}, function(response) {
            //    console.log('Actions fetched');
            //});
        });
    });





serverAddress.addEventListener('input', function () {
    submitServerAdress.disabled = true;
    serverNotAccessible.style.display = 'collapse';
    var serverAddressValue = serverAddress.value;
    if (!ValidateIPaddress(serverAddressValue)) {
        serverAddress.setCustomValidity('Invalid server address');
    } else {
        serverAddress.setCustomValidity('');
        testServerConnection();
    }
});



    function testServerConnection() {
        serverNotAccessible.style.display = 'collapse';
        var value = serverAddress.value;
        fetch("http://" + value + ':8188/test')
            .then(response => {
                if (response.ok) {
                    submitServerAdress.disabled = false;
                } else {
                    serverNotAccessible.style.display = 'block';
                    submitServerAdress.disabled = true;
                }
            })
            .catch(error => {
                serverNotAccessible.style.display = 'block';
                submitServerAdress.disabled = true;
            });
    }


function ValidateIPaddress(ipaddress) {
    if (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ipaddress)) {
        return true
    }    
    return false
}

function checkConfiguration() {
    chrome.storage.local.get(["serverAddress"], function (result) {
        if (result.serverAddress) {
            changeState('results');
        } else {
            changeState('configure');
        }
    });
}

hideAll();
checkConfiguration();