// jQuery main hook-up
function onDeviceReady() {
  main();
}

// Main application entry point
function main() {
  console.log('app starting');
  // Network communication object
  var serviceObject = new INTONATE.Service('http://10.200.201.26/');

  // Input widget
  var inputWidget = INTONATE.InputWidget({
    root: '#input'
  }).on('submitted',function(event, params){
    console.log('submitted: ' + params);
    var newEntry = INTONATE.EntryWidget(params);
    $('#entries').append(newEntry);
  });
};
