// jQuery main hook-up
function onDeviceReady() {
  main();
}


// Main application entry point
function main() {
  // Network communication object
  var serviceObject = new INTONATE.Service('http://10.200.201.26:3000/');

  // Input widget
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

  // Pre-existing conversations
  serviceObject.getBlabs().
    done(function(data){
      data.blabs.forEach(function(blab){
        var blab = new INTONATE.Blab(blab);
        var newEntry = new INTONATE.EntryWidget({
          blab: blab,
          network: serviceObject
        });
        appendWidget(newEntry);
      });
    });
};

var allWidgets = [];
function appendWidget(newEntry) {
  $('#entries').prepend(newEntry.domNode);
  allWidgets.push(newEntry);
  $(newEntry).on('playbackFinished',function(event,entry) {
    var i = allWidgets.indexOf(entry);
    if(allWidgets.length > i+1) {
      allWidgets[i+1].play();
    }
  });
};



