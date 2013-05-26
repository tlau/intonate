
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , blabs = require('./routes/blabs')
  , user = require('./routes/user')
  , http = require('http')
  , fs = require('fs')
  , path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}


// Set up the blab repository
var blabRepository = new blabs.BlabRepository();

app.get('/', routes.index);
app.get('/users', user.list);

app.get('/blabs', function(req, res) {
  res.json({blabs: blabRepository.findAll()});
});

app.post('/blabs', function(req, res) {
  var blab = req.body;
  var audioData = req.files.audio;
  fs.readFile(audioData.path, function(err, data) {
      blabRepository.new({
        title: blab.title || 'Untitled blab',
        text: blab.text || audioData.type,
        audio: data
      });
  });
  res.send(200);
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
