'use strict';

/* Controllers */

function refreshBlabs(cb) {
};

function AppCtrl($scope, $http, WebAudio) {
  $scope.name = 'Tessa';
  $scope.text = '';
  if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry)/)) {
    Audio = PhoneGapAudio;
  } else {
    Audio = WebAudio;
  }

  $scope.blabs = [{text: 'one'}, {text: 'two'}, {text: 'three'}];

  $http.get('/blabs').success(function(data, status, headers, config) {
    console.log('got blabs', data.blabs);
    $scope.blabs = data.blabs;
  });

  $scope.remove = function(blab) {
    console.log('In $scope.remove, param is', blab);
    $http.post('/blabs/' + blab.id + '/remove').success(function(data, status, headers, config) {
      console.log('blab removed');
      $http.get('/blabs').success(function(data, status, headers, config) {
        console.log('got blabs', data.blabs);
        $scope.blabs = data.blabs;
      });
    });

  };

  $scope.onSend = function() {
    //console.log('ignoring text:', $scope.text);
    console.log('stopping recording');
    $scope.audioObject && $scope.audioObject.stop();

    $scope.audioObject && $scope.audioObject.upload(function(data){
      console.log('Upload complete, data returned:', data);
    });

  };

  $scope.recordMode = false;

  $scope.onStartRecording = function() {
    $scope.recordMode = ! $scope.recordMode;
    if ($scope.recordMode) {
      $scope.audioObject = Audio;
      $scope.audioObject.record();
    }
  };

  /*
  socket.on('send:name', function (data) {
    //$scope.name = data.name;
  });
  */
}

/*
function MyCtrl1($scope, socket) {
  socket.on('send:time', function (data) {
    $scope.time = data.time;
  });
}
MyCtrl1.$inject = ['$scope', 'socket', '$http'];


function MyCtrl2() {
}
MyCtrl2.$inject = [];
*/
