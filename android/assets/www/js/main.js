// jQuery main hook-up
function onDeviceReady() {
  main();
}

// Main application entry point
function main() {
  console.log('app starting. Form Data: ' + FormData);
  // Network communication object
  var serviceObject = new INTONATE.Service('http://10.200.201.26:3000/');

  // Input widget
  var inputWidget = INTONATE.InputWidget({
    root: '#input'
  }).on('submitted',function(event, blab){
    var jqxhr = serviceObject.post(blab);
    var newEntry = INTONATE.EntryWidget({
      blab: blab,
      net: jqxhr
    });
    $('#entries').prepend(newEntry);
  });
};
