var redis = require('redis');
var db = redis.createClient(null, null, {return_buffers: true});

// ----------------------------------------------------------------------
// Blab interface

exports.BlabRepository = function() {
  this.blabs = [];
  this.nextId = 1;
  var _this = this;
  db.get('blabs_repository', function(err, data) {
    console.log('Got blabs data:', data);
    if (data) {
      _this.blabs = JSON.parse(data); 
      console.log('We have', _this.blabs.length, 'blabs');
      _this.nextId = _this.blabs.length + 1;
    }
  });
}

/** Return all blabs */
exports.BlabRepository.prototype.findAll = function() {
  return this.blabs;
}

/** Save a new blab */
exports.BlabRepository.prototype.new = function(blab) {
  blab.id = this.nextId;
  this.blabs.push(blab);
  this.nextId++;

  db.set('blabs_repository', JSON.stringify(this.blabs));
}

/** Look up a blab by id */
exports.BlabRepository.prototype.find = function(id) {
  var blab = this.blabs.filter(function(item) {
    return item.id == id;
  })[0];
  if (null == blab) {
    throw new Error("blab not found");
  }
  return blab;
}


