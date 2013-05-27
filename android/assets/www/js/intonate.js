var INTONATE = INTONATE || {
  VERSION: 0.1
};

// A blab object to pass around
INTONATE.Blab = (function(){
  function initialize(params) {
    params = params || {};
    this.text = params.text || undefined;
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
    this.domNode = initializeDom();
    render.call(this);
  };

  ew.prototype.getBlab = function getBlab() {
    return this.blab;
  };
  ew.prototype.update = function update(data) {
    blab.id = data.id || blab.id;
    blab.text = data.text || blab.text;
    render.call(this);
  };

  // -------
  // Private
  // -------
  function render() {
    this.domNode.html(this.blab.text);
  };
  function initializeDom() {
    return $('#templates .wdg-intonate-entry').clone();
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

  // Advertise public functions
  net.prototype.post = post;
  net.prototype.getBlabs = getBlabs;

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
