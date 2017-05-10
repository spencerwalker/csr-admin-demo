angular.module('orderCloud')
    .factory('Underscore', UnderscoreService)
;

function UnderscoreService($window) {
    return $window._;
}