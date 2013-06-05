var INTONATE = INTONATE || {
  VERSION: 0.1
};

// A blab object to pass around
INTONATE.Blab = (function(){
  function Blab(params) {
    var params = params || {};
    this.text = params.transcription || params.text || undefined;
    this.audioObject = params.audioObject || undefined;
    this.id = params.id || undefined;
  };
  Blab.prototype = {
    save: function save(callback) {
      this.audioObject && this.audioObject.upload(function(data){
        this.id = data.id || this.id;
        this.text = data.text || this.text;
      });
    }
  };
  return Blab;
}());

INTONATE.InputWidget = (function($){
  var domNode; // Reference to widget root element

  var mode = "text"; // current input mode. Valid values: text, audio

  var audioObject;   // Currently-in-use media object

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
      audioObject.stop();
      blab.audioObject = audioObject;
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
      audioObject = new INTONATE.Audio();
      audioObject.record();
      console.log("Recording stated");
    } else {
      audioObject.stop();
      $('.text-input').show();
      $('.audio-meter').hide();
    }
  };
  return iw;
}(jQuery));

INTONATE.EntryWidget = (function($){
  // Constructor
  var ew = function(options) {
    var params = options || {};
    this.blab = params.blab || {};

    this.domNode = initializeDom.call(this);
    render.call(this);

    // Keep track of the current audio playback state
    //  disabled: no audio can be played
    //  idle: can play but no one asked to
    //  downloading: downloading file for playback
    //  ready: audio available locally for playback
    //  playing: in the middle of playback
    if(this.blab.audioObject && this.blab.audioObject.canPlay()) {
      this.playingState = "ready";
    } else if(this.blab.id || this.blab.audioObject) {
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
      this.blab.audioObject = new INTONATE.Audio({
        blabId: this.blab.id
      });
      this.blab.audioObject.download(function() {
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

      $(this.blab.audioObject).on('playbackFinished',function(ev){
        _this.playingState = 'ready';
        render.call(_this);
        $(_this).trigger('playbackFinished', _this);
      });
      this.blab.audioObject.play();
      $(_this).trigger('playbackStarted', _this);
    }
  };
  function stopPlayback() {
    if(this.playingState == 'playing') {
      this.blab.audioObject.stop();
      this.playingState = 'ready';
      render.call(this);
    }
  };
  return ew;
}(jQuery));
