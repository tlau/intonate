
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , blabs = require('./routes/blabs')
  , user = require('./routes/user')
  , http = require('http')
  , fs = require('fs')
  , redis = require('redis')
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

// Set up our database
var db = redis.createClient();
db.on("error", function(err) {
  console.log("Redis error:" + err);
});

// Set up the web server routes
app.get('/', routes.index);
app.get('/users', user.list);

app.get('/blabs', function(req, res) {
  res.json({blabs: blabRepository.findAll()});
});

app.post('/blabs', function(req, res) {
  var blab = req.body;
  var audioData = req.files.audio;

  var key = "blab_" + Math.random() * 100000;
  fs.readFile(audioData.path, function(err, data) {
    // Save data to the redis store
    db.set(key, data, function() {
      blabRepository.new({
        title: blab.title || 'Untitled blab',
        text: blab.text || audioData.type,
        audioKey: key
      });
    });
  });
  res.send(200);
});

app.get('/blabs/:id', function(req, res) {
  var blabid = req.params.id;
  try {
    res.json(blabRepository.find(blabid));
  } catch (exception) {
    res.send(404);
  }
});

// Create the webserver
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
