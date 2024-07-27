cliendId = null;
// Generate a random UUID and store it in local storage
chrome.storage.local.get(['clientId'], function(result) {
    if(!result.clientId){
        cliendId = crypto.randomUUID()
        chrome.storage.local.set({ clientId: cliendId }, function () {

        });
        checkConnection();
    } else {
        clientId = result.clientId;
    }
});

function sendMessageNotConnected(tabId){
    if(tabId)
        chrome.tabs.sendMessage(tabId, {text: 'notConnected'});
}

sendThroughSocket = function (message, tabId = null) {
    console.info("Sending: ",message);
    if(main_socket && main_socket.readyState === WebSocket.OPEN)
        main_socket.send(JSON.stringify(message));
    else {        
        sendMessageNotConnected(tabId);
    }

}

function fetchActions() {
    sendThroughSocket({ type: 'getActions' });
}

function executeApi(endpoint, data) {
    if(main_socket && main_socket.readyState === WebSocket.OPEN)
        main_socket.send(JSON.stringify({ type: 'executeApi', endpoint: endpoint, data: data }));
    else {
        sendMessageNotConnected();
    }
}


updateMenu = function(){
   
    chrome.storage.local.get(['actions'], function (result) {
        chrome.contextMenus.removeAll();
        if(result.actions){
            for(let action of result.actions){
                var contexts = []
                if(action.parameters.length === 0) contexts = ["all"]
                
                action.parameters.filter(param => param.field_type === 'STRING').length > 0 ? contexts.push('selection') : null;
                var imageFieldsCount = action.parameters.filter(param => param.field_type === 'IMAGE').length;
                if (imageFieldsCount) {
                    if (imageFieldsCount == 1) {
                        contexts = ['image'];
                    }
                    else {
                        //cannot handle it in browser, or maybe can, need imagination
                        contexts = [];
                    }
                } 
                if(contexts.length === 0) continue;
                chrome.contextMenus.create({
                    id: action.uuid,
                    title: action.name,
                    contexts: contexts
                });
            }
        }
    });
}

chrome.runtime.onInstalled.addListener(function() {
    updateMenu();
});

chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === 'local' && (changes.serverAddress || changes.cliendId)) {
        checkConnection();
    }
});

let main_socket = null;
let socket_address = null;

function closeSocket() {
    main_socket.close();
    main_socket = null;
    socket_address = null;
}

function updateUnseenResults() {
    chrome.storage.local.get(['requestHistory'], function (result) {
        let requestHistory = result.requestHistory || [];
        let unseenResults = requestHistory.filter(request => request.notSeen).length;
        chrome.action.setBadgeText({ text: unseenResults.toString() })
        chrome.storage.local.set({ unseenResults: unseenResults }, function () {

        });
    });
}
function makeSocket(address){
    let socket = null;
    if (!address) {
        closeSocket()
        return null;
    }
    if (main_socket) {
        if (address == socket_address) {
            return main_socket;
        }
        else {            
            closeSocket()
        }
        
    }
    try {
        socket_address = address; 
        console.warn('Socket connecting...');
        socket = new WebSocket(address);
    }
    catch(error){
        console.error('Socket connection error:', error);
        main_socket = null;
        setTimeout(function() {
            makeSocket(address);
        }, 5000);
        return null;
    }
    if (socket) {
        socket.onopen = function (event) {
            console.warn("Connected to server");
            fetchActions(socket);
            // get the 'requestHistory' item from local storage
            chrome.storage.local.get(['requestHistory', 'unseenResults'], function (result) {
                let requestHistory = result.requestHistory || [];
                // filter the requests that do not have results
                let pendingRequests = requestHistory.filter(request => !request.status != 'finished');
                var uuids = pendingRequests.map(request => request.uuid);
                socket.send(JSON.stringify({ type: 'getStatus', uuid: uuids }));
                updateUnseenResults();
            });
        };
        socket.onmessage = function (event) {
            let message = JSON.parse(event.data);
            console.info("Receiving: ", message);
            if (message.type === 'actionDefinitions') {
                chrome.storage.local.set({ actions: message.data.actions }, function () {
                    updateMenu();
                });

            }
            else if (message.type === 'apiUpdated') {
                updateActions();
            }
            else if (message.type === 'resultPushed' && message.data.uuid) {

                chrome.storage.local.get(['requestHistory'], function (result) {
                    var uuid = message.data.batch_request_uuid
                    let requestHistory = result.requestHistory || [];
                    let request = requestHistory.find(request => request.batch_request_uuids && request.batch_request_uuids.includes(uuid));

                    if (request) {
                        if (!request.result) {
                            request.result = {};
                        }
                        request.result[uuid] = message.data.outputs;
                        var notFound = false;
                        request.batch_request_uuids.forEach(ruuid => {
                            if (!request.result[ruuid]) {
                                notFound = true;
                            }
                        })
                        if (!notFound) {
                            request.status = 'finished';
                            console.log("Request finished: ", request);
                        }
                        request.notSeen = true;
                        chrome.storage.local.set({ requestHistory: requestHistory }, function () {
                            updateUnseenResults();
                        });

                    }
                });
            }
            else if (message.type === 'executionFinished' && message.data) {
                chrome.storage.local.get(['requestHistory'], function (result) {
                    let requestHistory = result.requestHistory || [];
                    let request = requestHistory.find(request => request.batch_request_uuids && request.batch_request_uuids.includes(message.data.batch_request_uuid));
                    if (request) {
                        sendThroughSocket({ type: 'getResult', uuid: message.data.batch_request_uuid });
                    }
                });
            }
            else if (message.type === 'executeApiQueued' && message.data.requestId) {
                // get the 'requestHistory' item from local storage
                chrome.storage.local.get('requestHistory', function (result) {
                    let requestHistory = result.requestHistory || [];
                    let request = requestHistory.find(request => request.requestId === message.data.requestId);
                    if (request) {
                        request.batch_request_uuid = message.data.result.batch_request_uuid;
                        request.status = 'queued';
                        chrome.storage.local.set({ requestHistory: requestHistory }, function () {

                        });
                    }
                });
            }

            else if (message.type === 'getStatusResponse' && message.uuid && message.status === 'unknown') {
                // find the request with the same UUID
                let request = requestHistory.find(request => request.data.uuid === message.uuid);
                if (request) {
                    // set the 'result' property of the request to 'failed'
                    request.result = 'failed';
                    // set the 'requestHistory' item in local storage to the updated 'requestHistory' array
                    chrome.storage.local.set({ requestHistory: requestHistory }, function () {
                        console.log('Request history is updated to ' + JSON.stringify(requestHistory));
                    });
                }
            }
            else {
                //console.log(message);
            }

        };
        socket.onclose = function () {
            console.warn('Socket close');
            //setTimeout(function () {
            //    makeSocket(address);
            //}, 5000);
        };
        socket.onerror = function (error) {
            console.error('Error:', error);
            setTimeout(function () {
                makeSocket(address);
            }, 5000);
        };
        main_socket = socket;
    }

    return socket;
}

// This function is called when the alarm fires or the extension icon is clicked
function updateActions() {
    chrome.storage.local.get('serverAddress', function(result) {
        if (result.serverAddress) {
            fetchActions();
        }
    });
}

// This script runs when the extension starts

checkConnection = function () {
    chrome.storage.local.get(['serverAddress', 'clientId'], function (result) {
        if (result.serverAddress && result.clientId) {
            var address = "ws://" + result.serverAddress + ":8188/mrg_ws?clientId=" + result.clientId;
            makeSocket(address);
        }
    });
}
checkConnection();

// chrome.browserAction.onClicked.addListener(function(tab) {
//     chrome.tabs.create({url: 'results.html'});
// });

// Create an alarm that fires every hour
//chrome.alarms.create('updateActions', {periodInMinutes: 60});
//chrome.alarms.onAlarm.addListener(function(alarm) {
//    if (alarm.name === 'updateActions') {
//        updateActions();
//    }
//});

// Add an event listener for when the extension icon is clicked
chrome.action.onClicked.addListener(function(tab) {
    updateActions();
});

chrome.contextMenus.onClicked.addListener( function(info, tab) {
    // This event listener is called when one of the context menu items is clicked
    chrome.storage.local.get(['serverAddress', 'actions'], async function(result) {
        if (result.actions) {
            // find the clicked action in the list of actions
            let action = result.actions.find(action => action.uuid === info.menuItemId);
            if (action) {
                chrome.tabs.sendMessage(tab.id, {text: 'createForm', action:action });
            }
        }
    });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type == "executeApi"){
        requestId = crypto.randomUUID();
        chrome.storage.local.get('requestHistory', function (result) {
            let requestHistory = result.requestHistory || [];
            request.requestId = requestId;
            request.status = 'requested'
            requestHistory.push(request);
            chrome.storage.local.set({ requestHistory: requestHistory }, function () {
            });
        });
       
        sendThroughSocket({ type: 'executeApi', api: request.endpoint, requestId:requestId, params: request.data });
    }
      
});