var fs = require('fs');
var child_process = require('child_process');
var https = require('https');

var db = require('redis').createClient(null, null, {return_buffers: true});
db.on("error", function(err) {
  console.log("Redis error:" + err);
});

var OAUTH_TOKEN = "b888bac0968b87ba2b5a1f6e03c978ac";

/*---------------------
	:: Blab 
	-> controller
---------------------*/
var BlabController = {

  /** Override the /blab/create API function */
  create: function(req, res) {
    console.log('in create, starting');
    var _this = this;

    var blab = Blab.create({
      text : req.param('text') || '',
      createdBy : req.param('createdBy') || 'anonymous'
    }).done(function(err, blab) {
      console.log('in create.done');
      if (err) {
        console.log('create.done returning error');
        return console.log(err);
      }


      console.log('checking for req.files');
      if (req.files && req.files.audio && req.files.audio.name) {
        console.log('inside the req.files block');
        BlabController.saveAudio(blab, req.files.audio, function(err, amrdata) {
          if (err) {
            return res.send(err);
          }

          BlabController.convert(amrdata, function(err, wavdata) {
            if (err) {
              return res.send(err);
            }

            var wavKey = BlabController._getRandomKey();
            console.log('Setting wavkey to', wavKey);
            db.set(wavKey, wavdata, function(err) {
              if (err) return res.send(err);

              Blab.update({id: blab.id}, {wavKey: wavKey}, function(err, blab) {

                BlabController.transcribe(wavdata, function(err, msg) {
                  if (err) {
                    return res.send(err);
                  }

                  Blab.update({id: blab.id}, {transcription: msg}, function(err, blab) {
                    if (err) return console.log(err);
                  });
                });

                res.json(blab);
              });
            });
          });
        });
      } else {
        res.json(blab);
      }
    });
  },

  saveAudio: function(blab, audioFile, callback) {
    console.log('in saveAudio 2');
    
    fs.readFile(audioFile.path, function(err, data) {
      console.log('in readFile');
      if (audioFile.size != data.length) {
        console.log('HUH??  size is', audioFile.size, 'and length is', data.length);
      } else {
        console.log('Read', data.length, 'bytes of audio from local disk');
      }

      // Save it to the blab
      var key = BlabController._getRandomKey();
      db.set(key, data, function(err) {
        if (err) {
          return callback(err);
        }

        Blab.update({id: blab.id}, {audioKey: key, contentType: audioFile.type},
          function(err, blab) {
            if (err) return callback(err);

            callback(false, data);
        });

      });
    });
  },



  convert: function(amrdata, callback) {
    var amrtmp = __dirname + '/in.amr';
    var wavtmp = __dirname + '/out.wav';
    fs.writeFile(amrtmp, amrdata, function(err) {
      child_process.execFile('avconv', ['-y', '-i', amrtmp, wavtmp], {},
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
  },

  transcribe: function(data, callback) {
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
        
        callback(false, text);
      });
    });

    req.write(data);
    req.end();

    console.log('Sending', data.length, 'bytes to AT&T Speech API');
  },

  _getRandomKey: function() {
    return 'blab_' + Math.random() * 10000;
  },

  audio: function(req, res) {
    var id = req.param('id');   
    Blab.find(id).done(function(err, blab) {
      db.get(blab.audioKey, function(err, data) {
        if (err) return res.send(err);
        console.log('Sending bytes to client:', data.length);
        console.log('Sending content-type:', blab.contentType);
        res.writeHead(200, {
          'Content-type': blab.contentType,
          'Content-length': data.length
        });
        res.write(data);
        res.end();
      });
    });
  }
};
module.exports = BlabController;
