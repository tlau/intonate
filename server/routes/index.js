var blabs = require('./blabs');
var blabRepository = new blabs.BlabRepository();

/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Express', blabs: blabRepository.findAll() });
};
