# Bigpipe-Demo

## What's bigpipe

**BigPipe** is a fundamental redesign of the dynamic web page serving system. The general idea is to decompose web pages into small chunks called pagelets, and pipeline them through several execution stages inside web servers and browsers.

## Key Tech

<img src="https://user-images.githubusercontent.com/10556018/32899516-2a7c4958-cb26-11e7-92e0-3f858ea7aab5.png" width="400" height="400">

HTTP 1.1 Transfer-Encoding: chunked

> Data is sent in a series of chunks. The [`Content-Length`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Length) header is omitted in this case and at the beginning of each chunk you need to add the length of the current chunk in hexadecimal format, followed by '`\r\n`' and then the chunk itself, followed by another '`\r\n`'. The terminating chunk is a regular chunk, with the exception that its length is zero. It is followed by the trailer, which consists of a (possibly empty) sequence of entity header fields.

HTTP 1.1 Connection: keep-alive

> Indicates that the client would like to keep the connection open. Having a persistent connection is the default on HTTP/1.1 requests. The list of headers are the name of the header to be removed by the first non-transparent proxy or cache in-between: these headers define the connection between the emitter and the first entity, not the destination node

## Express bigpipe Implement

```javascript
'use strict'

const sleep = ms => new Promise(r => setTimeout(r, ms))

var express = require('express')
var app = express()
var fs = require('fs');
app.use(express.static('.'))

app.get('/', function (req, res) {
  var layoutHtml = fs.readFileSync(__dirname + "/layout.html").toString();
  res.write(layoutHtml);
  
  var promises = []
  promises.push(sleep(1000).then(() => {
    res.write(`<script>renderFlushCon("#A","moduleA<br /> send time:${dateFormat(new Date())}<br /> send timestamp:${Date.now()}");</script>`);
  }))
  promises.push(sleep(2000).then(() => {
    res.write(`<script>renderFlushCon("#B","moduleB<br /> send time:${dateFormat(new Date())}<br /> send timestamp:${Date.now()}");</script>`);
  }))
  promises.push(sleep(3000).then(() => {
    res.write(`<script>renderFlushCon("#C","moduleC<br /> send time:${dateFormat(new Date())}<br /> send timestamp:${Date.now()}");</script>`);
  }))
  
  Promise.all(promises).then(() => {
    // close body and html tags
    res.write('</body></html>');
    // finish the response
    res.end();
  })
})

app.listen(4000)

function dateFormat(date) {
  return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}
```

#### Key code

```
res.write('xxxx');
res.write('xxxx');
res.write('xxxx');
res.end('xxxx');
```

#### Why not use res.send?

because res.send contain res.write() and res.end()

#### HTML Layout

without body and html close tags

```html
<!DOCTYPE html>
<html>
<head>
  <!-- css and js tags -->
    <link rel="stylesheet" href="index.css" />
    <script>
    function dateFormat(date) {
      return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    }
    function renderFlushCon(selector, html) {
        html += '<br /> receive time: ';
        html += dateFormat(new Date());
        html += '<br /> receive timestamp: ';
        html += Date.now();
        document.querySelector(selector).innerHTML = html;
    }
    </script>
</head>
<body class="bigpipe">
    <div class="bigpipe-header">Bigpipe Demo</div>
    <div class="bigpipe-body">
        <div id="A">Loading...</div>
        <div id="B">Loading...</div>
        <div id="C">Loading...</div>
    </div>
    
```

## Installation

```
git clone git@github.com:HaileHuang/bigpipe-demo.git
cd bigpipe-demo
npm install
node index.js
```

### Open in browser

open <http://127.0.0.1:4000/> 

wait 3 seconds, then you'll see

![image](https://user-images.githubusercontent.com/10556018/32899792-e0c96ae2-cb26-11e7-9089-f1202974cb3a.png)



## Reference

> https://code.facebook.com/posts/162127837314007/bigpipe-pipelining-web-pages-for-high-performance/
