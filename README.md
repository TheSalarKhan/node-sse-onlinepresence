# node-sse-onlinepresence
A Node microservice for providing online presence via SSE.


Very basic, needs security measures like auth tokens and stuff.

## Start
I've implemented it with no external modules, so just run
```
npm start
```

For development I've used nodemon, so you can do:
```
$ npm i
$ npm run dev
```

## Client side
I've only tested this with EventSource object in JS. The event source object will fire "message" events on every heartbeat
and in response the server will return a list of all the clientIds connected. When a clientId leaves on the next heartbeat it
isn't visible in the list.
```
source = new EventSource("http://127.0.0.1:9091/heartbeat/?&clientId=clientId1");
source.addEventListener("message", (ev)=>{ console.log(ev.data) });
```

## License
MIT.
