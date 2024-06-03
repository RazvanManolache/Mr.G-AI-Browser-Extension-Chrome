

const count = 10;
const requestList = document.getElementById('requestList');
var searchText = "";
var searchStatus = "all";
var searchOrder = "desc";

document.getElementById('refresh').addEventListener('click', function () {
    requestList.innerHTML = '';
    renderRequestList(0, count);
});
function searchStarted() {
    searchText = document.getElementById('search').value;
    searchStatus = document.getElementById('status').value;
    searchOrder = document.getElementById('order').value;
    requestList.innerHTML = '';
    renderRequestList(0, count);
}

document.getElementById('search').addEventListener('input', searchStarted);
document.getElementById('status').addEventListener('change', searchStarted);
document.getElementById('order').addEventListener('change', searchStarted);



    // Function to render a single request item
    function renderRequestItem(request) {
        const item = document.createElement('div');
        item.classList.add('request-item');

        const timestamp = new Date(request.timestamp).toLocaleString();
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
        var details = ""
        for (var key in request.data) {
            details += `<p><strong>${key}</strong>: ${request.data[key]}</p>`;
        }
        var display = "none";
        if (searchText) {
            display = "block"
        }
        item.innerHTML = `
          <div class="result">
            
            <div class="title"><strong style="margin: 0 10px;">${request.action}</strong> <div class="status ${request.status}">${request.status}</div> <div class="timestamp">${timestamp}</div></div>
            <p>${results}</p>
            <a href="#" class="details-link">View generation data</a>
            <div class="details" style="display: ${display};">
                <div><strong><a href="${request.url}" target=”_blank”>${request.url}</a></strong></div>
                ${details}
                <div><button class='generateButton'>Generate again</button></div>
            </div>
        </div>
        `;

        const detailsLink = item.querySelector('.details-link');
        const generateButton = item.querySelector('.generateButton');
        detailsLink.addEventListener('click', function (event) {
            event.preventDefault();
            const details = item.querySelector('.details');
            details.style.display = details.style.display === 'none' ? 'block' : 'none';
        });
        generateButton.addEventListener('click', function (event) {
            event.preventDefault();
            let requestInfo = {
                type: 'executeApi',
                action: request.action,
                endpoint: request.endpoint,
                data: request.data,
                timestamp: new Date().toISOString(),
                url: request.url
            };
            //send message to background.js
            chrome.runtime.sendMessage(requestInfo);
            setTimeout(function () {
                requestList.innerHTML = ''; renderRequestList(0, count);
            }, 500);

        });

        return item;
    }

    // Function to render the request list
function renderRequestList(start, end) {
    //requestList.innerHTML = '';
    chrome.storage.local.get(['requestHistory'], function (result) {
        if (!result.requestHistory) return;
        var requests = result.requestHistory;
        if (searchOrder == "asc")
            requests.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        else
            requests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        if (searchStatus != "all")
            requests = requests.filter(request => request.status == searchStatus);
       
        if (searchText != "")
            // split searchtext by space and search for each word
            var words = searchText.split(" ");
        if (words) {
            words.forEach(function (word) {
                requests = requests.filter(request => JSON.stringify(request.data).includes(word));
            });
        }
            
            
        const slicedRequests = requests.slice(start, end);
        slicedRequests.forEach(request => {
            const item = renderRequestItem(request);
            requestList.appendChild(item);
        });
    });
}
        
    

    // Initial render
    renderRequestList(0, count);

    // Event listener for scrolling
window.addEventListener('scroll', function () {
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
        // Load next 5 items
        const currentLength = document.querySelectorAll('.request-item').length;
        renderRequestList(currentLength, currentLength + count);
    }
});