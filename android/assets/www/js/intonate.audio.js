var INTONATE = INTONATE || {};

INTONATE.BASE_URL = 'http://10.200.201.26:3000/';

INTONATE.WebAudio = (function(Recorder){
  // Compatibility
  window.URL = window.URL || window.webkitURL;
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                              navigator.mozGetUserMedia || navigator.msGetUserMedia;

  // Try to get user media right away
  var localMediaStream, audioContext = navigator.getUserMedia && new AudioContext();
  navigator.getUserMedia && navigator.getUserMedia({audio: true}, function(lms) {
    localMediaStream = lms;
  }, getUserMediaError);

  function WebAudio(params) {
    params = params || {};
    this.blabId = params.blabId || 'new';
    this.decodedBuffer = undefined;
    this.bufferSource = undefined;
    this.recorder = undefined;
  };
  WebAudio.prototype = {
    canPlay: function canPlay() {
      return (this.decodedBuffer != undefined);
    },
    record: function record() {
      this.recorder = new Recorder(audioContext.createMediaStreamSource(localMediaStream),
      { workerPath: 'js/vendor/recorderWorker.js' });
      this.recorder.record();
    },
    stop: function stop() {
      this.recorder && this.recorder.stop();
      this.bufferSource && this.bufferSource.stop(0);
      this.playingTimer && clearTimeout(this.playingTimer);
      this.bufferSource = undefined;
    },
    play: function play() {
      var _this = this;
      this.bufferSource = audioContext.createBufferSource();
      this.bufferSource.buffer = this.decodedBuffer;
      this.bufferSource.connect(audioContext.destination);
      this.bufferSource.start(0);


      // This is the best I could find so far in terms of notifying
      // ourselves of when the stream is finished playing:
      // Set a timer and check whether audioContext.activeSourceCount is
      // zero. But beware: the first time you start playback it takes a little
      // while to get started (about a second) so make sure to offset the
      // checking for a little while first
      // What I'm going to do is to start checking at the expected duration
      // of the playback and then, when I get there, I will check if it is still
      // playing or not
      var duration =  this.decodedBuffer.duration * 1000;
      this.playingTimer = setTimeout(function() {
        notifyIfFinished(_this);
      }, duration);
    },
    download: function download(successCallback) {
      // I have to use native XHR2 instead of jQuery.ajax
      // because jQuery.ajax doesn't support ArrayBuffer yet
      var _this = this;
      var req = new XMLHttpRequest();
      req.open('GET', 'blabs/' + this.blabId + '/audio', true);
      req.responseType = 'arraybuffer';
      req.onload = function() {
        audioContext.decodeAudioData(req.response, function(buffer) {
          _this.decodedBuffer = buffer;
          successCallback();
        }, function(e) { console.log('Error decoding audio buffer: ' + e); });
      };
      req.send();
    },
    upload: function upload(successCallback) {
      this.recorder.exportWAV(function(blob) {
        var formData = new FormData();
        formData.append('audio', blob);
        $.ajax({
          url: 'blabs/new',
          type: 'POST',
          data: formData,
          cache: false,
          contentType: false,
          processData: false
        }).done(successCallback);
      });
    }
  };
  // Factory method from network
  WebAudio.getBlabs = function() {
    // TODO: Parse the response and return an array of Blabs
    // to the caller instead
    return $.get('blabs');
  };

  function notifyIfFinished(audioObject) {
    if(audioContext.activeSourceCount == 0) {
      // It finished! Trigger event
      $(audioObject).trigger('playbackFinished');
    } else {
      // Try again in half a second
      audioObject.playingTimer = setTimeout(function() {
        notifyIfFinished(audioObject);
      }, 500);
    }
  };
  function getUserMediaError(e) {
    console.log('error getting local media: ' + e);
  };
  return WebAudio;
}(Recorder));

INTONATE.PhoneGapAudio = (function(){
  baseUrl = INTONATE.BASE_URL || '/';
  function PhoneGapAudio(params) {
    params = params || {};
    this.blabId = params.blabId || 'new';
    this.fileName = makeFileName(this.blabId);
  }
  PhoneGapAudio.prototype = {
    canPlay: function canPlay() {
      return true;
    },
    record: function record() {
      this._recordMedia = new Media(this.fileName.split('/').reverse()[0], mediaSuccess, mediaError);
      this._recordMedia.startRecord();
    },
    stop: function stop() {
      this._media = this._recordMedia || this._playMedia;
      this._recordMedia && this._recordMedia.stopRecord();
      this._playMedia && this._playMedia.stop();
      this._media && this._media.release();
      this._recordMedia = this._stopMedia = undefined;
    },
    play: function play() {
      _this = this;
      this._playMedia = new Media(this.fileName, function() {
        // TODO: This is the only place where we're using
        // trigger and finishedPlaying. I should use a callback
        // and inline finishedPlaying instead. Cleanup
        finishedPlaying.call(_this);
        $(_this).trigger('playbackFinished');
      }, mediaError);
      this._playMedia.play();
    },
    upload: function upload(successCallback) {
      var ft = new FileTransfer();
      var options = new FileUploadOptions();
      options.fileKey="audio";
      options.fileName=this.fileName.split('/').reverse()[0];
      options.mimeType="audio/AMR";
      ft.upload(this.fileName, baseUrl + 'blabs/new',
              function(data) {
                successCallback(JSON.parse(data.response));
              },
              function() { console.log('error sending audio file'); },
              options);
    },
    download: function download(successCallback) {
      var ft = new FileTransfer();
      ft.download(baseUrl+'blabs/'+this.blabId+'/audio',
               this.fileName,
               successCallback, function() {
                console.log("Error fetching audio");
               });
    }
  };

  // Factory method from network
  PhoneGapAudio.getBlabs = function() {
    // TODO: Parse the response and return an array of Blabs
    // to the caller instead
    return $.get(baseUrl+'blabs');
  };

  // Private methods
  function finishedPlaying() {
    this._playMedia.release();
    this._playMedia = undefined;
  };
  function makeFileName(blabId) {
    return 'file:///sdcard/intonate-' + blabId + '.amr';
  };
  function mediaSuccess() {
    console.log('Media success');
  };
  function mediaError() {
    console.log('Media error');
  };
  return PhoneGapAudio;
}());
