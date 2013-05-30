var app = angular.module('app', ['ngResource']);

app.controller('BlabCtrl', function($scope, $resource) {
  $scope.name = "Tessa Lau";

  $scope.blabs = $resource('/blabs',
    {}, {findAll: {method:'GET', params: {}, isArray: true}});
});

