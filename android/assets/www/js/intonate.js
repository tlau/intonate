var INTONATE = INTONATE || {
  VERSION: 0.1
};

// A blab object to pass around
INTONATE.Blab = (function(){
  function initialize(params) {
    var params = params || {};
    this.text = params.transcription || params.text || undefined;
    this.audioFileName = params.audioFileName || undefined;
    this.id = params.id || undefined;
  };
  return initialize;
}());

INTONATE.InputWidget = (function($){
  var domNode; // Reference to widget root element
  var net;     // INTONATE.Service object for network requests

  var mode = "text"; // current input mode. Valid values: text, audio

  var mediaObj;   // Currently-in-use media object

  // Pointers to specific widget DOM elements
  var textInput;  // Text input form element
  var audioInput;  // Audio input form element

  // Constructor. Takes a selector. Creates an Input
  // widget in the firt occurence of the selector
  var iw = function(inputOptions) {
    options = inputOptions || {};
    domNode = $(options.root);

    initializeDom();
    return domNode;
  };

  // Private methods
  function initializeDom() {
    $('#templates .wdg-intonate-input').clone().appendTo(domNode);
    $('.send',domNode).on('click', onSend);
    $('.audio',domNode).on('click', onAudio);
    textInput =  $('.text-input',domNode)[0];
    audioInput =  $('.audio-input',domNode)[0];
  };
  function clear() {
    textInput.value = '';
    setMode('text');
  };
  function onSend() {
    var blab = new INTONATE.Blab();
    if(mode == 'audio') {
      mediaObj.stopRecord();
      mediaObj.release();
      mediaObj = undefined;
      blab.audioFileName = 'file:///sdcard/intonate.amr';
      blab.text = "(audio translation in progress)";
    } else {
      blab.text = textInput.value;
    }
    domNode.trigger('submitted', blab);
    clear();
  };
  function onAudio() {
    setMode(mode=='audio'?'text':'audio');
  };
  // toggle between text and audio mode
  function setMode(newMode) {
    if(newMode == mode)
      return;
    mode = newMode;
    if(mode == 'audio') {
      $('.text-input').hide();
      $('.audio-meter').show();
      mediaObj = new Media("intonate.amr", mediaSuccess, mediaError);
      mediaObj.startRecord();
      console.log("Recording stated");
    } else {
      if( mediaObj) {
        nextStep = function() {};
        mediaObj.stopRecord();
        mediaObj.release();
        mediaObj = undefined;
      }
      $('.text-input').show();
      $('.audio-meter').hide();
    }
  };
  function mediaSuccess() {
    console.log("Media success");
  };
  function mediaError() {
    console.log("Media error");
  };
  return iw;
}(jQuery));

INTONATE.EntryWidget = (function($){

  // Constructor
  var ew = function(options) {
    var params = options || {};
    this.blab = params.blab || {};
    this.network = params.network;

    this.domNode = initializeDom.call(this);
    render.call(this);

    // Keep track of the current audio playback state
    //  disabled: no audio can be played
    //  idle: can play but no one asked to
    //  downloading: downloading file for playback
    //  ready: audio available locally for playback
    //  playing: in the middle of playback
    if(this.blab.audioFileName) {
      this.playingState = "ready";
    } else if(this.blab.id) {
      this.playingState = "idle";
    } else {
      this.playingState = "disabled";
    }
  };

  ew.prototype.getBlab = function getBlab() {
    return this.blab;
  };
  ew.prototype.update = function update(data) {
    this.blab.id = data.id || this.blab.id;
    this.blab.text = data.text || this.blab.text;
    render.call(this);
  };
  ew.prototype.play = startPlayback;

  // -------
  // Private
  // -------
  function render() {
    $('.text-entry',this.domNode).html(this.blab.text);
    $('.play',this.domNode).hide();
    $('.stop',this.domNode).hide();
    $('.download',this.domNode).hide();
    if(this.playingState == 'downloading') {
      $('.download',this.domNode).show();
    } else if(this.playingState == 'playing') {
      $('.stop',this.domNode).show();
    } else {
      $('.play',this.domNode).show();
    }
  };
  function initializeDom() {
    var _this = this;
    var domNode = $('#templates .wdg-intonate-entry').clone();
    $('.play',domNode).on('click',function() {
      startPlayback.call(_this);
    });
    $('.stop',domNode).on('click',function() {
      stopPlayback.call(_this);
    });
    return domNode;
  };
  function startPlayback() {
    var _this = this;
    // Ignore concurrent or invalid requests for playback
    if(this.playingState in { playing: true, downloading: true, disabled: true }) {
      console.log('Cancelling playback, playingState was: ' + this.playingState);
      return;

    // See if we need to start downloading
    } else if(this.playingState == 'idle') {
      this.network.getBlabAudio(this.blab.id, function(fileEntry) {
        // _this.blab.audioFileName = fileEntry.fullPath.split("/").reverse()[0];
        _this.blab.audioFileName = fileEntry.fullPath;
        _this.playingState = 'ready';
        startPlayback.call(_this);
      });
      // Updated buttons
      this.playingState = 'downloading';
      render.call(this);


    // If we're here it must mean we have the audio locally so, play
    } else {
      this.playingState = 'playing';
      render.call(this);

      this.mediaObj = new Media(this.blab.audioFileName,
             function success() {
               stopPlayback.call(_this, true);
               $(_this).trigger('playbackFinished', _this);
             },
             function error() {
               console.log("media playback error");
             },
             function status() {
               console.log("media playback status");
             });
      this.mediaObj.play();
      $(_this).trigger('playbackStarted', _this);
    }
  };
  function stopPlayback(skipStop) {
    if(this.playingState == 'playing') {
      if(!skipStop)
        this.mediaObj.stop();
      this.mediaObj.release();
      this.mediaObj = undefined;
      this.playingState = 'ready';
      render.call(this);
    }
  };
  return ew;
}(jQuery));

INTONATE.Service = (function($){
  var net = function(serviceUrl){
    this.baseUrl = serviceUrl;
  };
  function post(blab, success){
    var options = new FileUploadOptions();
    options.fileKey="audio";
    options.fileName="intonate.amr";
    options.mimeType="audio/AMR";
    options.params = {
      text: blab.text
    };
    var ft = new FileTransfer();
    ft.upload("file:///sdcard/intonate.amr", this.baseUrl + 'blabs/new',
              success,
              function() { console.log('error sending audio file'); },
              options);
  };
  function getBlabs() {
    return $.get(this.baseUrl+'blabs');
  };
  function getAudio(blabId, callback) {
    var fileName = 'downblab' + blabId;
    var ft = new FileTransfer();
    ft.download(this.baseUrl+'blabs/'+blabId+'/audio',
               'file:///sdcard/'+fileName,
               callback, function() {
                console.log("Error fetching audio");
               });
  };

  // Advertise public functions
  net.prototype.post = post;
  net.prototype.getBlabs = getBlabs;
  net.prototype.getBlabAudio = getAudio;

  return net;
}(jQuery));

// --------------------------------
// Mock objects for browser testing
// --------------------------------

/*
MockMedia = function() {};
MockMedia.prototype = {
  startRecord: function() {},
  stopRecord: function() {},
  release: function() {}
};
Media = window.Media || MockMedia;
FileUploadOptions = window.FileUploadOptions || function() {};
MockFileTransfer = function() {};
MockFileTransfer.prototype = {
  upload: function() {}
};
FileTransfer = window.FileTransfer || MockFileTransfer;
*/
