
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , blabs = require('./routes/blabs')
  , socket = require('./routes/socket.js')
  , http = require('http')
  , https = require('https')
  , fs = require('fs')
  , redis = require('redis')
  , path = require('path')
  , child_process = require('child_process');

var app = module.exports = express();
var server = require('http').createServer(app);

// Hook Socket.io into Express
var io = require('socket.io').listen(server);

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/public'));
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// ----------------------------------------------------------------------
// Intonate server

// Set up our database
var db = redis.createClient(null, null, {return_buffers: true});
db.on("error", function(err) {
  console.log("Redis error:" + err);
});

// Set up the blab repository
var blabRepository = new blabs.BlabRepository();

var OAUTH_TOKEN = "b888bac0968b87ba2b5a1f6e03c978ac";


// ----------------------------------------------------------------------

// Routes

app.get('/', routes.index);
app.get('/partials/:name', routes.partials);


// Socket.io Communication

io.sockets.on('connection', socket);

app.get('/blabs', function(req, res) {
  res.json({blabs: blabRepository.findAll()});
});

app.post('/blabs/new', function(req, res) {
  var blab = req.body;
  console.log('In blabs/new, req.files:', req.files);
  if (req.files && req.files.audio && req.files.audio.name) {
    var audioData = req.files.audio;

    var key = "blab_" + Math.random() * 100000;
    fs.readFile(audioData.path, function(err, data) {
      if (audioData.size != data.length) {
        console.log('HUH??  size is', audioData.size, 'and length is', data.length);
      } else {
        console.log('GOOD! received', data.length, 'bytes of audio');
      }
      // Save data to the redis store
      db.set(key, data, function() {
        var newblab = blabRepository.new({
          filename: audioData.name,
          text: blab.text,
          contentType: audioData.type,
          length: data.length,
          audioKey: key
        });

        // Convert it to wav if necessary
        console.log('converting data from amr to wav');

        convert(data, function(err, wavdata) {
          if (err) {
            res.send(500, msg);
          }

          newblab.wavKey = "blab_" + Math.random() * 100000;
          console.log('Will stuff wav content into', newblab.wavKey);
          db.set(newblab.wavKey, wavdata, function() {
            // Fire off a transcription request
            console.log('Sending transcription request');
            transcribe(newblab, res, function(msg) {
              console.log('Transcription finished, result is', msg);
            });
          });
        });

        // Return the result to the client
        res.json(newblab);
      });
    });
  } else {
    var newblab = blabRepository.new({
      text: blab.text
    });
    res.json(newblab);
  }
});

app.get('/blabs/:id', function(req, res) {
  var blabid = req.params.id;
  try {
    res.json(blabRepository.find(blabid));
  } catch (exception) {
    res.send(404);
  }
});

app.get('/blabs/:id/audio', function(req, res) {
  var blabid = req.params.id;
  try {
    var blab = blabRepository.find(blabid);
  } catch (exception) {
    res.send(404);
    return;
  }

  var type = req.params.type;

  db.get(blab.audioKey, function(err, data) {
    console.log('Sending bytes to client:', data.length);
    console.log('Sending content-type:', blab.contentType);
    res.writeHead(200, {
      'Content-type': blab.contentType
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

app.get('/blabs/:id/transcribe', function(req, res) {
  var blabid = req.params.id;
  try {
    var blab = blabRepository.find(blabid);
  } catch (exception) {
    res.send(404);
    return;
  }

  transcribe(blab, res, function(err, msg) {
    if (err) {
      console.log('Server returned error', msg);
      res.send(500, "Server returned error: " + msg);
      return;
    }

    console.log('Server returned recognized text:', msg);

    res.send(msg);
  });
});

function convert(amrdata, callback) {
  var amrtmp = __dirname + '/in.amr';
  var wavtmp = __dirname + '/out.wav';
  fs.writeFile(amrtmp, amrdata, function(err) {
    child_process.execFile('avconv', ['-y', '-i', amrtmp, '-ac', '1', wavtmp], {},
      function(error, stdout, stderr) {
        if (error) {
          // Handle error execing avconv
          callback(true, error);
          return;
        }
        fs.readFile(wavtmp, function(err, data) {
          callback(false, data);
        });
    });
  });
}

function transcribe(blab, res, callback) {
  db.get(blab.wavKey, function(err, data) {
    if (err) {
      callback(true, "Unable to get audio from redis store");
    }
    console.log('Have binary data:', data);

    var options = {
      host: 'api.att.com',
      path: '/rest/2/SpeechToText',
      method: 'POST',
      headers: {
        Authorization: "Bearer " + OAUTH_TOKEN,
        Accept: "application/json",
        "X-SpeechContext": "Generic",
        "Content-Type": "audio/wav",
        "Content-Length": data.length
      }
    };

    var req = https.request(options, function(response) {
      response.on('data', function(chunk) {
        console.log('Body:', chunk.toString());

        if (response.statusCode != 200) {
          callback(true, "Error from AT&T server: " + chunk.toString());
          return;
        }

        // Here we have the results from the server
        var serverResults = JSON.parse(chunk);
        if (serverResults.Recognition.NBest) {
          var text = serverResults.Recognition.NBest[0].ResultText;
          console.log('Recognized text:', text);

          blab.transcription = text;
          blabRepository.save();

          callback(false, text);

        } else {
          callback(true, serverResults.Recognition.Status);
        }
      });
    });

    req.write(data);
    req.end();

    console.log('Sending', data.length, 'bytes to AT&T Speech API');
  });
}

// redirect all others to the index (HTML5 history)
// app.get('*', routes.index);

// Start server

server.listen(3000, function(){
  console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});
