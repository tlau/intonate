exports.BlabRepository = function() {
  this.blabs = [
    {title: 'First blab', text: 'Text of first blab'}
  ];
}

/** Return all blabs */
exports.BlabRepository.prototype.findAll = function() {
  return this.blabs;
}

/** Save a new blab */
exports.BlabRepository.prototype.new = function(blab) {
  this.blabs.push(blab);
}
