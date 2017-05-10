angular.module('orderCloud.adminAdminUsers', [])
    .config(AdminAdminUsersConfig)
    .factory('AdminUsersService', AdminUsersService)
    .controller('AdminAdminUsersCtrl', AdminAdminUsersController)
    .controller('AdminCreateAdminUserCtrl', AdminCreateAdminUserController)
    .controller('AdminEditAdminUserCtrl', AdminEditAdminUserController)
;

function AdminAdminUsersConfig($stateProvider) {
    $stateProvider
        .state('base.adminAdminUsers', {
            url: '/admin-users',
            data: {pageTitle: 'Administer Admin Users', loadingMessage: 'Loading Admin Users'},
            views: {
                '': {
                    template: '<article id="AdminAdminUsers" ui-view am-layout="vertical"></article>'
                },
                '@base.adminAdminUsers': {
                    templateUrl: 'adminAdminUsers/templates/adminAdminUsers.tpl.html',
                    controller: 'AdminAdminUsersCtrl',
                    controllerAs: 'adminAdminUsers',
                    resolve: {
                        UserList: function(AdminUsersService) {
                            return AdminUsersService.List();
                        }
                    }
                }
            }
        })
        .state( 'base.adminAdminUsers.create', {
            url: '/create',
            templateUrl: 'adminAdminUsers/templates/adminAdminUsers.create.tpl.html',
            controller: 'AdminCreateAdminUserCtrl',
            controllerAs: 'adminCreateAdminUsers'
        })
        .state( 'base.adminAdminUsers.edit', {
            url: '/edit/:id',
            templateUrl: 'adminAdminUsers/templates/adminAdminUsers.edit.tpl.html',
            controller: 'AdminEditAdminUserCtrl',
            controllerAs: 'adminEditAdminUser',
            resolve: {
                SelectedUser: function($stateParams, OrderCloudSDK) {
                    return OrderCloudSDK.AdminUsers.Get($stateParams.id);
                }
            }
        })
    ;
}
function AdminUsersService($q, OrderCloudSDK) {
    var service = {
        List: _list
    };

    function _list() {
        var deferred = $q.defer();
        var users = [];
        var opts = {page: 1, pageSize: 100};
        OrderCloudSDK.AdminUsers.List(opts)
            .then(function(data) {
                users = users.concat(data.Items);
                var queue = [];
                for (var i = 2; i <= data.Meta.TotalPages; i++) {
                    opts.page = i;
                    queue.push(OrderCloudSDK.AdminUsers.List(opts));
                }
                $q.all(queue).then(function(results) {
                    angular.forEach(results, function(r) {
                        users = users.concat(r.Items);
                    });
                    deferred.resolve(users);
                })
            });
        return deferred.promise;
    }

    return service;
}

function AdminAdminUsersController(UserList) {
    var vm = this;
    vm.userList = UserList;
}

function AdminCreateAdminUserController($state, toastr, OrderCloudSDK) {
    var vm = this;

    function clearUser() {
        vm.newUser = {
            ID: null,
            Username: null,
            FirstName: null,
            LastName: null,
            Email: null,
            Password: null,
            TermsAccepted: new Date().toJSON(),
            Active: true
        };
    }
    clearUser();

    vm.createNewUser = function() {
        OrderCloudSDK.AdminUsers.Create(vm.newUser)
            .then(function(user) {
                $state.go('base.adminAdminUsers',{}, {reload:true});
            })
            .catch(function(ex) {
                var msg = ex.response.body.Errors[0].Message.indexOf('does not meet the requirements') > -1 ? 'Your password does not meet the requirements set for length or complexity.  It must be changed to meet the minimum requirements before continuing.' : ex.response.body.Errors[0].Message;
                toastr.error(msg, null);
            });
    };
}

function AdminEditAdminUserController($state, toastr, OrderCloudSDK, SelectedUser) {
    var vm = this;
    vm.selectedUser = SelectedUser;

    vm.updateUser = function() {
        OrderCloudSDK.AdminUsers.Update(SelectedUser.ID, vm.selectedUser)
            .then(function(user) {
                $state.go('base.adminAdminUsers', {}, {reload: true});
            })
            .catch(function(ex) {
                var msg = ex.data.Errors[0].Message.indexOf('does not meet the requirements') > -1 ? 'Your password does not meet the requirements set for length or complexity.  It must be changed to meet the minimum requirements before continuing.' : ex.data.Errors[0].Message;
                toastr.error(msg, null);
            });
    };

    vm.deleteUser = function() {
        OrderCloudSDK.AdminUsers.Delete(SelectedUser.ID)
            .then(function() {
                $state.go('base.adminAdminUsers', {}, {reload: true});
            })
            .catch(function(message) {
                toastr.error(message, null);
            });
    };
}