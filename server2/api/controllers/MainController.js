/*---------------------
  :: Main 
  -> controller
---------------------*/
var MainController = {

  // To trigger this action locally, visit: `http://localhost:port/main/index`
  index: function (req,res) {

    // This will render the view: /Users/tlau/src/intonate/server2/views/main/index.ejs
    res.view();

    //res.send('Hello world');

  }

};
module.exports = MainController;
