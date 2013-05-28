// jQuery main hook-up
function onDeviceReady() {
  main();
}

var allWidgets = [];

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
    $('#entries').prepend(newEntry.domNode);
    allWidgets.push(newEntry);
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
        $('#entries').prepend(newEntry.domNode);
        allWidgets.push(newEntry);
      });
    });
};
