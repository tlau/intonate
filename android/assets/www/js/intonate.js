var INTONATE = INTONATE || {
  VERSION: 0.1
};

// A blab object to pass around
INTONATE.Blab = (function(){
  var blab;
  function initialize(params) {
    blab = params = params || {};
    blab.text = params.text || undefined;
    blab.audioFile = params.audioFile || undefined;
    blab.id = params.id || undefined;
    return blab;
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
    console.log('constructor');
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
    var blab = INTONATE.Blab();
    if(mode == 'audio') {
      mediaObj.stopRecord();
      mediaObj.release();
      mediaObj = undefined;
      blab.audioFile = 'file:///sdcard/intonate.amr';
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
    } else {
      if( mediaObj) {
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
  var domNode; // Reference to widget root element
  var net;     // Service object
  var blab;    // The Blab object represented by this widget

  // Initializer. Options:
  var ew = function(options) {
    var params = options || {};
    net = options.net;
    blab = options.blab || {};
    initializeDom();
    render();
    return domNode;
  };

  // -------
  // Private
  // -------
  function render() {
    domNode.html(blab.text);
  };
  function initializeDom() {
    domNode = $('#templates .wdg-intonate-entry').clone();
  };
  return ew;
}(jQuery));

INTONATE.Service = (function($){
  var baseUrl;
  var net = function(serviceUrl){
    baseUrl = serviceUrl;
  };
  function post(blab){
    var options = new FileUploadOptions();
    options.fileKey="audio";
    options.fileName="intonate.amr";
    options.mimeType="audio/AMR";
    options.params = {
      text: blab.text
    };
    var ft = new FileTransfer();
    ft.upload("file:///sdcard/intonate.amr", baseUrl + 'blabs/new',
              function() { console.log('success sending audio file'); },
              function() { console.log('error sending audio file'); },
              options);
    
    /*
    var theForm = new FormData();
    theForm.append('text',blab.name);
    theForm.append('audio',blab.audioFile);
    var jqxhr = $.ajax({
      url: baseUrl + 'blabs/new',
      type: 'POST',
      data: theForm,
      // jQuery: relax!
      cache: false,
      contentType: false,
      processData: false
    });
    jqxhr.
        done(function(){ console.log('send success'); }).
        fail(function(){ console.log('send error'); });
    return jqxhr;
    */
  };

  // Advertise public functions
  net.prototype.post = post;

  return net;
}(jQuery));
