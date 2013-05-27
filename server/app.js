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
// app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, '../android/assets/www')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// Set up our database
var db = redis.createClient(null, null, {return_buffers: true});
db.on("error", function(err) {
  console.log("Redis error:" + err);
});

// Set up the blab repository
var blabRepository = new blabs.BlabRepository();

// ----------------------------------------------------------------------

// Set up the web server routes
app.get('/', routes.index);
app.get('/users', user.list);

app.get('/blabs', function(req, res) {
  res.json({blabs: blabRepository.findAll()});
});

app.post('/blabs/new', function(req, res) {
  var blab = req.body;
  var audioData = req.files.audio;
  console.log('Received files: ');
  console.dir(req.files);

  var key = "blab_" + Math.random() * 100000;
  fs.readFile(audioData.path, function(err, data) {
    if (audioData.size != data.length) {
      console.log('HUH??  size is', audioData.size, 'and length is', data.length);
    } else {
      console.log('GOOD! length is', data.length);
    }
    // Save data to the redis store
    db.set(key, data, function() {
      var newblab = blabRepository.new({
        title: blab.title || audioData.name,
        text: blab.text || audioData.type,
        audioKey: key
      });
      res.json(newblab);
    });
  });
});

app.get('/blabs/:id', function(req, res) {
  var blabid = req.params.id;
  try {
    res.json(blabRepository.find(blabid));
  } catch (exception) {
    res.send(404);
  }
});

app.get('/blabs/:id/audio.m4a', function(req, res) {
  var blabid = req.params.id;
  try {
    var blab = blabRepository.find(blabid);
  } catch (exception) {
    res.send(404);
    return;
  }

  db.get(blab.audioKey, function(err, data) {
    console.log('Sending bytes to client:', data.length);
    res.writeHead(200, {
      'Content-type': 'audio/AMR'
    });
    res.write(data);
    res.end();
  });
});

app.get('/blabs/:id/pic.png', function(req, res) {
  var blabid = req.params.id;
  try {
    var blab = blabRepository.find(blabid);
  } catch (exception) {
    res.send(404);
    return;
  }

  db.get(blab.audioKey, function(err, data) {
    if (err) {
      console.log('Error fetching data from redis:', err);
      return;
    }

    fs.writeFile(__dirname + '/out.png', data, function(err) {
      if (err) {
        console.log('error writing png', err);
      } else {
        console.log('wrote', data.length, 'bytes to out.png');
      }
    });
      
    console.log('Sending bytes to client:', data.length);
    res.writeHead(200, {
      'Content-length': data.length,
      'Content-type': 'image/png'
    });
    res.write(data);
    res.end();
  });
});

app.post('/blabs/:id/remove', function(req, res) {
  var id = req.params.id;
  blabRepository.remove(id);
  res.send(200);
});

// Create the webserver
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
