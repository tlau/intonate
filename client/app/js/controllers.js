'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
  controller('BlabCtrl', ['$scope', 'Blab', function($scope, Blab) {
    $scope.name = "Blabber";
    $scope.blabs = Blab.query();
  }])
  .controller('MyCtrl2', [function() {

  }]);
