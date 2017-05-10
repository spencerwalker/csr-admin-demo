angular.module('orderCloud.avedaUsers', [])
    .factory('AvedaUsersService', AvedaUsersService)
;

function AvedaUsersService($q, Underscore, OrderCloudSDK, buyerid) {
    var service = {
        GetUserDetails: _getUserDetails
    };

    function _getUserDetails(userID) {
        var deferred = $q.defer();

        OrderCloudSDK.Users.Get(buyerid, userID).then(listGroupAssignments);

        function listGroupAssignments(user) {
            var queue = [];
            user.Groups = [];
            var opts = { userID : user.ID, page: 1, pageSize: 100};
            OrderCloudSDK.UserGroups.ListUserAssignments(buyerid, opts).then(function(data) {
                user.Groups = user.Groups.concat(Underscore.filter(Underscore.pluck(data.Items, 'UserGroupID'), function(ID) {return ID.indexOf('SoldTo-') > -1}));
                for (var i = 2; i <= data.Meta.TotalPages; i++) {
                    opts.page = i;
                    queue.push(OrderCloudSDK.UserGroups.ListUserAssignments(buyerid, opts))
                }
                $q.all(queue).then(function(results) {
                    angular.forEach(results, function(r) {
                        user.Groups = user.Groups.concat(Underscore.filter(Underscore.pluck(r.Items, 'UserGroupID'), function(ID) {return ID.indexOf('SoldTo-') > -1}));
                    });
                    deferred.resolve(user);
                });
            });
        }

        return deferred.promise;
    }

    return service;
}
