'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('myApp.services', []).
  value('version', '0.1').
  factory('socket', function ($rootScope) {
    var socket = io.connect();
    return {
      on: function (eventName, callback) {
        socket.on(eventName, function () {  
          var args = arguments;
          $rootScope.$apply(function () {
            callback.apply(socket, args);
          });
        });
      },
      emit: function (eventName, data, callback) {
        socket.emit(eventName, data, function () {
          var args = arguments;
          $rootScope.$apply(function () {
            if (callback) {
              callback.apply(socket, args);
            }
          });
        })
      }
    };
  }).
  factory('WebAudio', function($http) {
    // Compatibility
    console.log('Initializing WebAudio');
    window.URL = window.URL || window.webkitURL;
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia ||
                                navigator.mozGetUserMedia || navigator.msGetUserMedia;

    // Try to get user media right away
    var localMediaStream, audioContext = navigator.getUserMedia && new AudioContext();
    console.log('getting UserMedia');
    navigator.getUserMedia && navigator.getUserMedia({audio: true}, function(lms) {
      localMediaStream = lms;
    }, function(e) { console.log('Error getting user media:', e); });

    return {

      canPlay: function () {
        return (decodedBuffer != null);
      },
      record: function () {
        this.recorder = new Recorder(audioContext.createMediaStreamSource(localMediaStream),
        { workerPath: 'js/lib/recorder/recorderWorker.js' });
        this.recorder.record();
      },
      stop: function () {
        this.recorder && this.recorder.stop();
        this.bufferSource && this.bufferSource.stop(0);
        this.playingTimer && clearTimeout(this.playingTimer);
        this.bufferSource = undefined;
      },
      play: function () {
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
      download: function (blabId, successCallback) {
        // I have to use native XHR2 instead of jQuery.ajax
        // because jQuery.ajax doesn't support ArrayBuffer yet
        var _this = this;
        // TODO: make work with $http
        var req = new XMLHttpRequest();
        req.open('GET', 'blabs/' + blabId + '/audio', true);
        req.responseType = 'arraybuffer';
        req.onload = function() {
          audioContext.decodeAudioData(req.response, function(buffer) {
            _this.decodedBuffer = buffer;
            successCallback();
          }, function(e) { console.log('Error decoding audio buffer: ' + e); });
        };
        req.send();
      },
      upload: function (successCallback) {
        this.recorder.exportWAV(function(blob) {
          console.log('Got blob:', blob);
          var formData = new FormData();
          formData.append('audio', blob);
          console.log('FormData:', formData);
          $.ajax({
            // TODO make work with $http
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
  }).
  factory('PhoneGapAudio', function($http) {
    return {
      canPlay: function() {
        return true;
      },

      record: function() {
        var fileName = 'file:///sdcard/intonate-' + Math.floor(Math.random()*1e10) + '.amr';
        this._recordMedia = new Media(fileName.split('/').reverse()[0], function() {
          console.log('Media success')},
          function() { console.log('Media error'); });
        this._recordMedia.startRecord();
      },

      stop: function stop() {
        this._media = this._recordMedia || this._playMedia;
        this._recordMedia && this._recordMedia.stopRecord();
        this._playMedia && this._playMedia.stop();
        this._media && this._media.release();
        this._recordMedia = this._stopMedia = undefined;
      },

      play: function play(fileName) {
        _this = this;
        if (!fileName) {
          console.log('No filename specified for play');
          return;
        }
        this._playMedia = new Media(fileName, function() {
          // TODO: This is the only place where we're using
          // trigger and finishedPlaying. I should use a callback
          // and inline finishedPlaying instead. Cleanup
          _this._playMedia.release();
          _this._playMedia = undefined;
          $(_this).trigger('playbackFinished');
        }, mediaError);
        this._playMedia.play();
      },

      upload: function upload(fileName, successCallback) {
        var ft = new FileTransfer();
        var options = new FileUploadOptions();
        options.fileKey="audio";
        options.fileName=fileName.split('/').reverse()[0];
        options.mimeType="audio/AMR";
        ft.upload(fileName, INTONATE.BASE_URL + 'blabs/new',
                function(data) {
                  successCallback(JSON.parse(data.response));
                },
                function() { console.log('error sending audio file'); },
                options);
      },

      download: function download(blabId, fileName, successCallback) {
        var ft = new FileTransfer();
        ft.download(INTONATE.BASE_URL+'blabs/'+blabId+'/audio',
                 fileName,
                 successCallback, function() {
                  console.log("Error fetching audio");
                 });
      },
    }
  });
