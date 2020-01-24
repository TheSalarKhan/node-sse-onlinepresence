var http = require('http');
var url = require('url');

const PARAMS = {
    // TODO: Access-Contro from anywhere is wrong.
    // need to add a whitelist
    ACCESS_CONTROL_ALLOW_ORIGIN_HEADER: {
        'Access-Control-Allow-Origin': process.env.ALLOW_ORIGIN_HEADER_VALUE || "*",
    },
    // How many seconds between consecutive heartbeats.
    HEARTBEAT_INTERVAL_SECS: process.env.HEARTBEAT_INTERVAL_SECS || 3,
    // After how many seconds do we consider a connection dead.
    // twice of the heartbeat interval is a good number.
    HEARTBEAT_TIMEOUT_SECS: process.env.HEARTBEAT_INTERVAL_SECS || 6,
    // Howmany connections should wait in the server queue before new incoming
    // connections start getting a connection failed.
    CONNECTIONS_BACKLOG: process.env.CONNECTIONS_BACKLOG || 10000
};

console.log(PARAMS);

/**
 * This is our database. Its a key value pair of clientIds
 * against the UTC UNIX epoc of the last time they were seen:
 * {
 *  '5df23lkjalskjf': 528837492,
 *  'f54frk2239098a': 578839839
 * }
 */
const clients = {
};


const timer = {
    UTCTimeNow: 0,
    lastSweepTime: 0,
    // Update the time on everysecond, and sweep
    // timed out clients if its time.
    _tick: function() {
        this.UTCTimeNow = ((new Date().getTime() / 1000) | 0);
        if(this.lastSweepTime < (this.UTCTimeNow - PARAMS.HEARTBEAT_INTERVAL_SECS)) {
            this.lastSweepTime = this.UTCTimeNow;
            this._removeOldClients();
        }
    },
    _removeOldClients: function() {
        let entriesToDelete = [];
        for(const [ clientId, lastSeen ] of Object.entries(clients)) {
            if(lastSeen < (this.UTCTimeNow - PARAMS.HEARTBEAT_TIMEOUT_SECS)) {
                entriesToDelete.push(clientId);
            }
        }
        entriesToDelete.forEach(v => {
            delete clients[v];
        });
        console.log(clients);
    },
    start: function() {
        setInterval(this._tick.bind(this),1000);
    }
}
timer.start();

/**
 * Given a parse urlData object with query params. This function does some processing
 * and returns a response.
 * @param {*} urlData
 */
function constructResponse(urlData) {
    // Save the timestamp
    clients[urlData.clientId] = timer.UTCTimeNow;
    // Return the list of active users.
    return JSON.stringify(clients);
}

function processHeartbeat(req, res) {
    // Its not really important for us to check against headers.
    // But we're doing this just to make it a bit hard for the frontend
    // to use anything other than EventSource spec.
    if (req.headers.accept && req.headers.accept == 'text/event-stream') {
        // 1) Parse the url to get clientId.
        const urlData = url.parse(req.url, true).query;
        if(!urlData.clientId) {
            res.writeHead(400,PARAMS.ACCESS_CONTROL_ALLOW_ORIGIN_HEADER);
            res.end("'clientId' is required");
            return;
        }
        // 2) Do some basic SSE setup.
        res.writeHead(200, {
            ...PARAMS.ACCESS_CONTROL_ALLOW_ORIGIN_HEADER,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });
        res.write('\n');
        // 3) Calculate and construct response.
        const response = constructResponse(urlData);
        // 3) return response.
        res.end(`retry: ${PARAMS.HEARTBEAT_INTERVAL_SECS * 1000}\ndata: ${response}\n\n`);
    } else {
        res.writeHead(404);
        res.end();
    }
}



// Our online presence server only has one endpoint
// and that is the /heartbeat endpoint.
http.createServer(function(req, res) {
    if (/^\/heartbeat/.test(req.url)) {
        processHeartbeat(req, res);
    } else {
      res.writeHead(404);
      res.end();
    }
}).listen(process.env.PORT || 9091, PARAMS.CONNECTIONS_BACKLOG,()=>{
    console.log(`Online presence microservice up on ${process.env.PORT || 9091}`);
});