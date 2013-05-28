// jQuery main hook-up
function onDeviceReady() {
  main();
}


// Main application entry point
function main() {
  // Network communication object
  var serviceObject = new INTONATE.Service('http://10.200.201.26:3000/');

  // Create the Input widget
  var inputWidget = INTONATE.InputWidget({
    root: '#input'
  }).on('submitted',function(event, blab){
    var newEntry = new INTONATE.EntryWidget({
      blab: blab,
      network: serviceObject
    });
    appendWidget(newEntry);
    var jqxhr = serviceObject.post(blab, function(data) {
      newEntry.update(JSON.parse(data.response));
    });
  });

  // Load conversations from the server
  // Refresh every few seconds, but avoid
  // refreshing if we're currently playing
  // NOTE: Reloading is extremely dumb and simplified
  // It needs to be replaced by a more serious mechanism
  setInterval(function refresh() {
    if(!currentlyPlaying) {
      serviceObject.getBlabs().
        done(function(data){
          // Clear any pre-existing widgets
          $('#entries').empty();
          allWidgets = [];

          // Create blabs and widgets
          data.blabs.forEach(function(blab){
            var blab = new INTONATE.Blab(blab);
            var newEntry = new INTONATE.EntryWidget({
              blab: blab,
              network: serviceObject
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



