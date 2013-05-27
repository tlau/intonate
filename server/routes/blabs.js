var redis = require('redis');
var db = redis.createClient(null, null, {return_buffers: true});

// ----------------------------------------------------------------------
// Blab interface

exports.BlabRepository = function() {
  this.blabs = [];
  this.nextId = 1;
  var _this = this;
  db.get('blabs_repository', function(err, data) {
    if (data) {
      console.log('Got blabs data:', data.toString());
      _this.blabs = JSON.parse(data); 
      console.log('We have', _this.blabs.length, 'blabs');
      var max = 0;
      for (var i=0; i<_this.blabs.length; i++) {
        if (_this.blabs[i].id > max) {
          max = _this.blabs[i].id;
        }
      }
      console.log('setting nextId to', max+1);
      _this.nextId = max + 1;
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
  return blab;
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

/** Remove blab by id */
exports.BlabRepository.prototype.remove = function(id) {
  var index = this._findIndex(id);
  console.log('Removing blab with id', id);
  this.blabs.splice(index, 1);
  db.set('blabs_repository', JSON.stringify(this.blabs));
  console.log('blabs is now', this.blabs);
}

/** Find index of id */
exports.BlabRepository.prototype._findIndex = function(id) {
  debugger;
  var index = null;
  for (var i=0; i<this.blabs.length; i++) {
    if (this.blabs[i].id == id) {
      return i;
    }
  }

  throw new Error('blab not found');
}
