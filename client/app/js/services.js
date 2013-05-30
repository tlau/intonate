'use strict';

/* Services */


// Demonstrate how to register services
// In this case it is a simple value service.
angular.module('myApp.services', ['ngResource']).
  factory('Blab', function($resource) {
    return $resource("http://localhost\\:3001/blab/:blab", {}, {
      query: {method: 'GET', params:{blab:''}, isArray: true}
      });
    }).
  value('version', '0.1');
