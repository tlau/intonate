var INTONATE = INTONATE || {
  VERSION: 0.1
};

INTONATE.InputWidget = (function($){
  var domNode; // Reference to widget root element
  var net;     // INTONATE.Service object for network requests

  var mode = "text"; // current input mode. Valid values: text, audio

  // Pointers to specific widget DOM elements
  var textInput;  // Text input box

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
  };
  function clear() {
    textInput.value = '';
  };
  function onSend() {
    var theText = textInput.value;
    domNode.trigger('submitted', theText);
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
      $('.audio-input').show();
    } else {
      $('.text-input').show();
      $('.audio-input').hide();
    }
  };
  return iw;
}(jQuery));

INTONATE.EntryWidget = (function($){
  var domNode; // Reference to widget root element

  // Initializer. Options:
  var ew = function(options) {
    var params = options || {};
    initializeDom();
    return domNode;
  };

  // -------
  // Private
  // -------
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
  function sendText(theText){
    $.post(baseUrl + 'text', theText).
      done(function(){ console.log('send success'); }).
      fail(function(){ console.log('send error'); });
  };
  function sendAudio(theAudio){
    console.log('send audio not implemented!');
  };

  // Advertise public functions
  net.prototype.sendText = sendText;
  net.prototype.sendAudio = sendAudio;

  return net;
}(jQuery));
