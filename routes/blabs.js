exports.BlabRepository = function() {
  this.blabs = [
    {id: 0, title: 'First blab', text: 'Text of first blab'}
  ];

  this.nextId = 1;
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
