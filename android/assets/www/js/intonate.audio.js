var INTONATE = INTONATE || {};

INTONATE.BASE_URL = 'http://10.200.201.26:3000/';

INTONATE.WebAudio = (function(Recorder){
  // Compatibility
  window.URL = window.URL || window.webkitURL;
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                              navigator.mozGetUserMedia || navigator.msGetUserMedia;

  // Try to get user media right away
  var localMediaStream;
  navigator.getUserMedia({audio: true}, function(lms) {
    localMediaStream = lms;
  }, getUserMediaError)

  function WebAudio() {
    this.audioContext = new AudioContext();
    this.recorder = new Recorder(this.audioContext.createMediaStreamSource(localMediaStream),
      { workerPath: 'js/vendor/recorderWorker.js' });
  };
  WebAudio.prototype = {
    record: function record() {
      this.recorder.record();
    },
    stop: function stop() {
      this.recorder.stop();
    },
    play: function play() {},
    download: function download() {},
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
