// Main application entry point
function main() {
  // Configure the correct type of abstraction for this environment:
  var isPhoneGap = navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/);
  INTONATE.Audio = isPhoneGap ? INTONATE.PhoneGapAudio : INTONATE.WebAudio;

  // Hook-up configuration of server URL for PhoneGap devices
  if(!isPhoneGap) {
  	$('#server-url').hide();
  } else {
    /*
    $('#server-url-form').on('submit',function(ev){
      console.log('preventing');
      // ev.preventDefault();
    }); */
    $('#server-url').on('change',function(ev){
      window.localStorage && window.localStorage.setItem('server-url',$('#server-url').val());
      INTONATE.BASE_URL = $('#server-url').val();
    });
    $('#server-url').val(window.localStorage && window.localStorage.getItem('server-url'));
    INTONATE.BASE_URL = $('#server-url').val();
  }

  // Create the Input widget
  var inputWidget = INTONATE.InputWidget({
    root: '#input'
  }).on('submitted',function(event, blab){
    var newEntry = new INTONATE.EntryWidget({
      blab: blab
    });
    appendWidget(newEntry);
    blab.save(function() {
      newEntry.update();
    });
  });

  // Load conversations from the server
  // Refresh every few seconds, but avoid
  // refreshing if we're currently playing
  // NOTE: Reloading is extremely dumb and simplified
  // It needs to be replaced by a more serious mechanism
  setInterval(function refresh() {
    if(!currentlyPlaying) {
      INTONATE.Audio.getBlabs().
        done(function(data){
          // Clear any pre-existing widgets
          $('#entries').empty();
          allWidgets = [];

          // Create blabs and widgets
          data.blabs.forEach(function(blab){
            var blab = new INTONATE.Blab(blab);
            var newEntry = new INTONATE.EntryWidget({
              blab: blab
            });
            appendWidget(newEntry);
          });
        });
    }
  }, 3000);
};

var allWidgets = [];
var currentlyPlaying;
function appendWidget(newEntry) {
  $('#entries').prepend(newEntry.domNode);
  allWidgets.push(newEntry);
  $(newEntry).on('playbackFinished',function(event,entry) {
    currentlyPlaying = undefined;
    var i = allWidgets.indexOf(entry);
    if(allWidgets.length > i+1) {
      allWidgets[i+1].play();
    }
  });
  $(newEntry).on('playbackStarted',function(event,entry) {
    currentlyPlaying = entry;
  });
};



