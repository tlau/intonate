var redis = require('redis');
var db = redis.createClient();

// ----------------------------------------------------------------------
// Blab interface

exports.BlabRepository = function() {
  this.blabs = [];
  console.log('getting repository');
  var _this = this;
  db.get('blabs_repository', function(err, data) {
    console.log('Got repo, data is', data);
    if (data) {
      console.log('setting blabs');
      _this.blabs = JSON.parse(data); 
      console.log('We have', _this.blabs.length, 'blabs');
    }
  });
  this.nextId = 1;
}

/** Return all blabs */
exports.BlabRepository.prototype.findAll = function() {
  console.log('returning blabs:', this.blabs);
  console.log('We have', this.blabs.length, 'blabs');
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


