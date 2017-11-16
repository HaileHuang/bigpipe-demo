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