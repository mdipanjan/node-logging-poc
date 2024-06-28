const socket = io();
const logsTable = document.querySelector('#logs-table tbody');
const tableView = document.getElementById('logs-table');
const detailsView = document.getElementById('detailsView');

function initDate() {
    dayjs().format();
}
initDate();

function formatTimeAgo(timestamp) {
    const now = dayjs();
    const time = dayjs(timestamp);
    const diffInSeconds = now.diff(time, 'second');

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

function addLogEntry(log) {
    const row = document.createElement('tr');
    
    const verb = log.method || 'GET';
    const uri = log.url || log.message || '';
    const status = log.statusCode || (log.metadata && log.metadata.statusCode) || '';
    const timestamp = log.timestamp ? formatTimeAgo(log.timestamp) : '';
    const logId = log.id; // Now using the UUID assigned by the backend

    row.innerHTML = `
        <td><span class="verb">${verb}</span></td>
        <td>${uri}</td>
        <td><span class="status-${status}">${status}</span></td>
        <td><span class="time-ago">${timestamp}</span></td>
        <td><a href="#" onclick="showDetails('${logId}'); return false;">View Details</a></td>
    `;

    logsTable.insertBefore(row, logsTable.firstChild);
}


async function showDetails(logId) {
    try {
        
        const response = await fetch(`/telescope/api/entries/${logId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const logDetails = await response.json();
        tableView.classList.add('hidden');
        detailsView.classList.remove('hidden');

        if (!logDetails) {
            throw new Error('Log entry not found');
        }

        const detailsDiv = document.getElementById('logDetails');
        detailsDiv.innerHTML = `
            <div class="detail-row">
                <span class="detail-label">ID:</span>
                <span class="detail-value">${logDetails.id}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">${dayjs(logDetails.timestamp).format('MMMM Do YYYY, h:mm:ss A')} (${formatTimeAgo(logDetails.timestamp)})</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Method:</span>
                <span class="detail-value">${logDetails.method}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">URI:</span>
                <span class="detail-value">${logDetails.url}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value status-${logDetails.statusCode}">${logDetails.statusCode}</span>
            </div>
        `;
        console.log(logDetails.body)
        document.getElementById('headersContent').textContent = JSON.stringify(logDetails.headers || {}, null, 2);
        document.getElementById('payloadContent').textContent = logDetails.body;

    } catch (error) {
        console.error('Error fetching log details:', error);
        alert('Failed to fetch log details. Please check the console for more information.');
    }
}
function showListView() {
    tableView.classList.remove('hidden');
    detailsView.classList.add('hidden');
}

function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}


// Fetch initial logs
fetch('/telescope/api/entries')
    .then(response => response.json())
    .then(data => {
        console.log('Fetched entries:', data.entries.length);
        data.entries.forEach(addLogEntry);
    })
    .catch(error => console.error('Error fetching logs:', error));

// Handle real-time updates
socket.on('connect', () => {
    console.log('Connected to Telescope server');
});

socket.on('newEntry', (entry) => {
    console.log('Received new entry:', entry);
    addLogEntry(entry);
});

// Fallback for old event names (if still used by the server)
socket.on('logs', (logs) => {
    console.log('Received logs:', logs.length);
    logs.forEach(addLogEntry);
});

socket.on('newLog', (log) => {
    console.log('Received new log:', log);
    addLogEntry(log);
});