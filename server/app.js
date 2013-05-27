/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , blabs = require('./routes/blabs')
  , user = require('./routes/user')
  , http = require('http')
  , https = require('https')
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

var OAUTH_TOKEN = "b888bac0968b87ba2b5a1f6e03c978ac";


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

      // Fire off a transcription request
      transcribe(newblab, res, function() {
        console.log('Transcription finished');
      });

      // Return the result to the client
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

function transcribe(blab, res, callback) {
  db.get(blab.audioKey, function(err, data) {
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
        var text = serverResults.Recognition.NBest[0].ResultText;
        console.log('Recognized text:', text);

        blab.transcription = text;
        blabRepository.save();

        callback(false, text);
      });
    });

    req.write(data);
    req.end();

    console.log('Sending', data.length, 'bytes to AT&T Speech API');
  });
}

// ----------------------------------------------------------------------
// Create the webserver
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
