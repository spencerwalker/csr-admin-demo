angular.module('orderCloud.adminInternalUsers', [])
    .config(AdminInternalUsersConfig)
    .factory('AdminInternalUsersService', AdminInternalUsersService)
    .factory('AdminCRUDInternalUsersService', AdminCRUDInternalUsersService)
    .controller('AdminInternalUsersCtrl', AdminInternalUsersController)
    .controller('AdminCreateInternalUsersCtrl', AdminCreateInternalUsersController)
    .controller('AdminEditInternalUserCtrl', AdminEditInternalUserController)
    .controller('AdminInternalUsersPermissionsCtrl', AdminInternalUsersPermissionsController)
    .controller('AdminInternalUsersAssignmentsCtrl', AdminInternalUsersAssignmentsController)
;

function AdminInternalUsersConfig($stateProvider) {
    $stateProvider
        .state('base.adminInternalUsers', {
            url: '/internal-users/:accessLevel',
            data:{pageTitle: 'Administer Internal Users', loadingMessage: 'Loading Users'},
            params: {accessLevel: 'CSR', clearCache: false},
            views: {
                '': {
                    template: '<article id="AdminInternalUsers" ui-view am-layout="vertical"></article>'
                },
                '@base.adminInternalUsers': {
                    templateUrl: 'adminInternalUsers/templates/adminInternalUsers.tpl.html',
                    controller: 'AdminInternalUsersCtrl',
                    controllerAs: 'adminInternalUsers'
                }
            },
            resolve: {
                UserList: function($stateParams, AdminInternalUsersService) {
                    return AdminInternalUsersService.ListUsersByType($stateParams.accessLevel, $stateParams.clearCache);
                }
            }
        })
        .state('base.adminInternalUsers.create', {
            url: '/create',
            templateUrl: 'adminInternalUsers/templates/adminInternalUsers.create.tpl.html',
            controller: 'AdminCreateInternalUsersCtrl',
            controllerAs: 'adminCreateInternalUsers',
            data: {loadingMessage: 'Loading Default Permissions'},
            resolve: {
                AccessLevelData: function($q, Underscore, $stateParams, AvedaHierarchy, AdminInternalUsersService) {
                    var deferred = $q.defer();
                    AvedaHierarchy.Get().then(function(hierarchy) {
                        switch($stateParams.accessLevel) {
                            case 'CSR':
                                deferred.resolve();
                                break;
                            case 'RegionVP':
                                deferred.resolve(hierarchy.Regions);
                                break;
                            case 'POD':
                                deferred.resolve(hierarchy.PODs);
                                break;
                            case 'SDP':
                                AdminInternalUsersService.ListUsersByType('SDP')
                                    .then(function(SDPs) {
                                        var result = Underscore.pick(hierarchy.SDPs, function(val, key, obj) {
                                            return Underscore.map(SDPs, function(sdp) {
                                                    return sdp.ID.replace('SDP-', '')
                                                }).indexOf(key) == -1
                                        });
                                        deferred.resolve(result);
                                    });
                                break;
                            case 'Custom':
                                deferred.resolve();
                                break;
                            default:
                                deferred.reject('User type unrecognized');
                        }
                    });

                    return deferred.promise;
                }
            }
        })
        .state('base.adminInternalUsers.edit', {
            url: '/edit/:id',
            templateUrl: 'adminInternalUsers/templates/adminInternalUsers.edit.tpl.html',
            controller: 'AdminEditInternalUserCtrl',
            controllerAs: 'adminEditInternalUser',
            data: {loadingMessage: 'Loading User Assignments & Permissions'},
            resolve: {
                SelectedUser: function($stateParams, AvedaUsersService) {
                    return AvedaUsersService.GetUserDetails($stateParams.id);
                },
                AccessLevelData: function($q, $stateParams, AvedaHierarchy) {
                    var deferred = $q.defer();
                    AvedaHierarchy.Get().then(function(hierarchy) {
                        switch($stateParams.accessLevel) {
                            case 'CSR':
                                deferred.resolve();
                                break;
                            case 'RegionVP':
                                deferred.resolve(hierarchy.Regions);
                                break;
                            case 'POD':
                                deferred.resolve(hierarchy.PODs);
                                break;
                            case 'Custom':
                            case 'SDP':
                                deferred.resolve();
                                break;
                            default:
                                return false;
                        }
                    });
                    return deferred.promise;
                }
            }
        })
    ;
}

function AdminInternalUsersService($q, OrderCloudSDK, buyerid) {
    var service = {
        ListUsersByType: _listUsersByType,
        ListInternalUsers: _listInternalUsers,
        ClearUserCache: _clearUserCache,
        CustomAssignmentList: _customAssignmentList
    };

    var userCache = {};

    function _listUsersByType(accessLevel, clearCache) {
        var deferred = $q.defer(),
            users = [],
            queue = [],
            prefix = accessLevel + '-';

        if (!userCache[accessLevel] || clearCache) {
            var opts = {page : 1, pageSize: 100, filters: {ID: prefix + '*'}}
            OrderCloudSDK.Users.List(buyerid, opts).then(function(data) {
                users = users.concat(data.Items);
                for (var i = 2; i <= data.Meta.TotalPages; i++) {
                    opts.page = i;
                    queue.push(OrderCloudSDK.Users.List(buyerid, opts));
                }
                $q.all(queue).then(function(results) {
                    angular.forEach(results, function(r) {
                        users = users.concat(r.Items);
                    });
                    userCache[accessLevel] = users;
                    deferred.resolve(users);
                });
            });
        }
        else {
            deferred.resolve(userCache[accessLevel]);
        }

        return deferred.promise;
    }

    function _listInternalUsers() {
        var deferred = $q.defer();
        var users = [];

        _listUsersByType('CSR').then(function(csrUsers) {
            users = users.concat(csrUsers);
            listRegionVPs();
        });

        function listRegionVPs() {
            _listUsersByType('RegionVP').then(function(regionVPUsers) {
                users = users.concat(regionVPUsers);
                listPODs();
            });
        }

        function listPODs() {
            _listUsersByType('POD').then(function(podUsers) {
                users = users.concat(podUsers);
                listSDPs();
            });
        }

        function listSDPs() {
            _listUsersByType('SDP').then(function(sdpUsers) {
                users = users.concat(sdpUsers);
                listCustom();
            });
        }

        function listCustom() {
            _listUsersByType('Custom').then(function(customUsers) {
                users = users.concat(customUsers);
                deferred.resolve(users);
            });
        }

        return deferred.promise;
    }

    function _clearUserCache(accessLevel) {
        delete userCache[accessLevel];
    }

    function _customAssignmentList(user) {
        var deferred = $q.defer();

        if (user.salonAssignments && user.salonAssignments.length) {
            user.salonAssignments = _.sortBy(user.salonAssignments, function(salon){return salon.ID});
            deferred.resolve(user.salonAssignments);
        }
        else if (user.Groups && user.Groups.length) {
            user.salonAssignments = [];
            var queue = [];
            angular.forEach(user.Groups, function (salonID) {
                queue.push(OrderCloudSDK.UserGroups.Get(buyerid, salonID));
            });
            var salonAssignments = [];
            $q.all(queue)
                .then(function(results){
                    angular.forEach(results, function(salon) {
                        salonAssignments.push(salon);
                    });
                    salonAssignments = _.sortBy(salonAssignments, function(salon){return salon.ID});
                    deferred.resolve(salonAssignments);
                });
        }
        else {
            deferred.resolve([]);
        }

        return deferred.promise;
    }

    return service;
}

function AdminCRUDInternalUsersService($rootScope, $q, Underscore, OrderCloudSDK, AvedaHierarchy, AdminInternalUsersService, buyerid) {
    var service = {
        CreateNewUser: _createNewUser,
        UpdateUser: _updateUser,
        DeleteUser: _deleteUser
    };

    function gatherSalonsToAssign(u, original) {
        var deferGather = $q.defer(),
            queue = [],
            salons = [];

        switch (u.AccessLevel) {
            case 'RegionVP':
                angular.forEach((original ? u.xp.Regions : u.Regions), function(r) {
                    queue.push(AvedaHierarchy.GetSalonsByLevel('Region', r.ID))
                });
                break;
            case 'POD':
                angular.forEach((original ? u.xp.PODs : u.PODs), function(p) {
                    queue.push(AvedaHierarchy.GetSalonsByLevel('POD', p.ID))
                });
                break;
            case 'SDP':
                queue.push(AvedaHierarchy.GetSalonsByLevel('SalesPerson', u.ID.split('-')[1]));
                break;
            case 'Custom':
                if(u.Groups && u.Groups.length) {
                    angular.forEach(u.Groups, function(g) {
                        queue.push(OrderCloudSDK.UserGroups.Get(buyerid, g))
                    });
                } else {
                    break;
                }

        }

        $q.all(queue).then(function(results) {
            angular.forEach(results, function(salonList) {
                salons = salons.concat(salonList);
            });
            if (u.customerGroupAssignments && u.customerGroupAssignments.length) salons = salons.concat(u.customerGroupAssignments);

            deferGather.resolve(salons);
        });
        return deferGather.promise;
    }

    function _createNewUser(user) {
        var deferred = $q.defer();
        $rootScope.loading = {
            promise: deferred.promise,
            message: 'Creating new user'
        };

        user.ID = user.AccessLevel + '-' + (user.AccessLevel != 'SDP' ? randomString() : user.SDPChoice.ID);

        if (user.AccessLevel == 'SDP') {
            user.FirstName = user.SDPChoice.Name.split(' ')[0];
            user.LastName = user.SDPChoice.Name.split(' ')[1];
        }

        user.xp = {
            AccessLevel: user.AccessLevel,
            Permissions: user.PermissionsList,
            InitialLogon: true
        };

        user.TermsAccepted = new Date();

        OrderCloudSDK.Users.Create(buyerid, user)
            .then(setUserPassword)
            .catch(function(ex) {
                var msg = ex.response.body.Errors[0].Message.indexOf('does not meet the requirements') > -1 ? 'Your password does not meet the requirements set for length or complexity.  It must be changed to meet the minimum requirements before continuing.' : ex.response.body.Errors[0].Message;
                deferred.reject(msg);
            });

        function setUserPassword(u) {
            var patch = {"Password": user.Password};
            OrderCloudSDK.Users.Patch(buyerid, u.ID, patch)
                .then(function(patchResponse) {
                    if (user.AccessLevel == 'CSR') {
                        AdminInternalUsersService.ClearUserCache(user.AccessLevel);
                        deferred.resolve(u);
                    } else {
                        assignToSalons(u);
                    }
                });
        }

        function assignToSalons(u) {
            var queue = [];
            gatherSalonsToAssign(user)
                .then(function(salons) {
                    var userPatch = {
                        xp: {
                            SalonCount: salons.length,
                            SalonTypes:[],
                            Plants:[],
                            Regions: [],
                            PODs:[],
                            CustomSoldToIDs: []
                        }
                    };
                    angular.forEach(salons, function(salon) {
                        var assignment = {
                            userGroupID: salon.ID,
                            userID: u.ID,
                            buyerID: buyerid
                        };
                        ((salon.xp.RegionID && salon.xp.RegionName) && Underscore.pluck(userPatch.xp.Regions, 'ID').indexOf(salon.xp.RegionID) == -1) ? userPatch.xp.Regions.push({ID:salon.xp.RegionID, Name:salon.xp.RegionName}) : angular.noop();
                        ((salon.xp.PODID && salon.xp.PODName) && Underscore.pluck(userPatch.xp.PODs, 'ID').indexOf(salon.xp.PODID) == -1) ? userPatch.xp.PODs.push({ID:salon.xp.PODID, Name:salon.xp.PODName}) : angular.noop();
                        (salon.xp.Classification && userPatch.xp.SalonTypes.indexOf(salon.xp.Classification) == -1) ? userPatch.xp.SalonTypes.push(salon.xp.Classification) : angular.noop();
                        (salon.xp.DeliveryPlant && userPatch.xp.Plants.indexOf(salon.xp.DeliveryPlant) == -1) ? userPatch.xp.Plants.push(salon.xp.DeliveryPlant) :angular.noop();
                        //TRACK CUSTOM SOLD TOS IN ID ARRAY
                        (salon.xp.CustomerGroup == '35' || salon.xp.CustomerGroup == '16' || salon.xp.CustomerGroup == '19') ? userPatch.xp.CustomSoldToIDs.push(salon.ID) : angular.noop();
                        (user.AccessLevel == 'Custom') ? userPatch.xp.CustomSoldToIDs.push(salon.ID) : angular.noop();

                        queue.push(OrderCloudSDK.UserGroups.SaveUserAssignment(buyerid, assignment));
                    });
                    queue.push(OrderCloudSDK.Users.Patch(buyerid, u.ID, userPatch));
                    $q.all(queue).then(function() {
                        AdminInternalUsersService.ClearUserCache(user.AccessLevel);
                        deferred.resolve(u);
                    })
                });
        }

        return deferred.promise;
    }

    function _updateUser(user) {
        var deferred = $q.defer();

        if (!user.ID) user.ID = user.AccessLevel + '-' + (user.AccessLevel != 'SDP' ? randomString() : user.SDPChoice.ID);

        if (user.AccessLevel == 'SDP') {
            user.FirstName = user.SDPChoice.Name.split(' ')[0];
            user.LastName = user.SDPChoice.Name.split(' ')[1];
        }

        user.xp.Permissions = user.PermissionsList;

        OrderCloudSDK.Users.Update(buyerid, user.ID, user)
            .then(function(u){
                if (user.AccessLevel == 'CSR' || user.AccessLevel == 'SDP') {
                    AdminInternalUsersService.ClearUserCache(user.AccessLevel);
                    deferred.resolve(u);
                } else {
                    assignToSalons(u);
                }
            })
            .catch(function(ex) {
                var msg = ex.data.Errors[0].Message.indexOf('does not meet the requirements') > -1 ? 'Your password does not meet the requirements set for length or complexity.  It must be changed to meet the minimum requirements before continuing.' : ex.data.Errors[0].Message;
                deferred.reject(msg);
            });

        function assignToSalons(u) {
            var queue = [];
            gatherSalonsToAssign(user, true)
                .then(function(originalSalons) {
                    gatherSalonsToAssign(user)
                        .then(function(salons) {
                            console.log('original', originalSalons);
                            console.log('updated', salons);

                            var originalSalonIDs = _.pluck(originalSalons, 'ID'); //From POD/Region assignment; not custom
                            var newSalonIDs = _.pluck(salons, 'ID'); //From POD/Region assignment; not custom

                            var unassignedToBe = _.difference(newSalonIDs, originalSalonIDs);
                            var assignedNotToBe = _.difference(originalSalonIDs, newSalonIDs);

                            /* Leave Custom Assignments (not based on the user's Region/POD) alone */

                            var userPatch = {
                                xp: {
                                    SalonCount: salons.length,
                                    SalonTypes: [],
                                    Plants:[],
                                    Regions: [],
                                    PODs: [],
                                    CustomSoldToIDs: []
                                }
                            };
                            angular.forEach(salons, function(salon) {
                                ((salon.xp.RegionID && salon.xp.RegionName) && Underscore.pluck(userPatch.xp.Regions, 'ID').indexOf(salon.xp.RegionID) == -1) ? userPatch.xp.Regions.push({ID:salon.xp.RegionID, Name:salon.xp.RegionName}) : angular.noop();
                                ((salon.xp.PODID && salon.xp.PODName) && Underscore.pluck(userPatch.xp.PODs, 'ID').indexOf(salon.xp.PODID) == -1) ? userPatch.xp.PODs.push({ID:salon.xp.PODID, Name:salon.xp.PODName}) : angular.noop();
                                (salon.xp.Classification && userPatch.xp.SalonTypes.indexOf(salon.xp.Classification) == -1) ? userPatch.xp.SalonTypes.push(salon.xp.Classification) : angular.noop();
                                (salon.xp.DeliveryPlant && userPatch.xp.Plants.indexOf(salon.xp.DeliveryPlant) == -1) ? userPatch.xp.Plants.push(salon.xp.DeliveryPlant) :angular.noop();
                                //TRACK CUSTOM SOLD TOS IN ID ARRAY
                                (salon.xp.CustomerGroup == '35' || salon.xp.CustomerGroup == '16' || salon.xp.CustomerGroup == '19') ? userPatch.xp.CustomSoldToIDs.push(salon.ID) : angular.noop();
                            });

                            queue.push(OrderCloudSDK.Users.Patch(buyerid, u.ID, userPatch));

                            angular.forEach(unassignedToBe, function(salonID) {
                                var assignment = {
                                    UserGroupID: salonID,
                                    UserID: u.ID,
                                    BuyerID: buyerid
                                };
                                queue.push(OrderCloudSDK.UserGroups.SaveUserAssignment(buyerid, assignment));
                            });

                            angular.forEach(assignedNotToBe, function(salonID) {
                                queue.push(OrderCloudSDK.UserGroups.DeleteUserAssignment(buyerid, salonID, u.ID));
                            });

                            $q.all(queue).then(function() {
                                deferred.resolve(u)
                            })
                        });
                });

        }

        return deferred.promise;
    }

    function _deleteUser(user) {
        AdminInternalUsersService.ClearUserCache(user.AccessLevel);

        return OrderCloudSDK.Users.Delete(buyerid, user.ID);
    }

    function randomString() {
        var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var string_length = 8;
        var randomstring = '';
        for (var i = 0; i < string_length; i++) {
            var rnum = Math.floor(Math.random() * chars.length);
            randomstring += chars.substring(rnum, rnum + 1);
        }

        return randomstring;
    }

    return service;
}

function AdminInternalUsersController($stateParams, UserList) {
    var vm = this;
    vm.accessLevel = $stateParams.accessLevel;
    vm.userList = UserList;
}

function AdminCreateInternalUsersController($state, $stateParams, $uibModal, toastr, AdminCRUDInternalUsersService, AvedaDefaultPermissionsService, AccessLevelData) {
    var vm = this;
    vm.accessLevel = $stateParams.accessLevel;
    vm.accessLevelData = AccessLevelData;

    vm.allPermissions = AvedaDefaultPermissionsService.AllPermissions();
    vm.accessLevelPermissions = AvedaDefaultPermissionsService[vm.accessLevel]();
    vm.permissionsMap = AvedaDefaultPermissionsService.PermissionMap();

    function clearUser(accessLevel) {
        vm.newUser = {
            ID: null,
            Username: null,
            FirstName: null,
            LastName: null,
            Email: null,
            Phone: null,
            Password: null,
            TermsAccepted: '0001-01-01T00:00:00',
            Active: true,
            AccessLevel: vm.accessLevel
        };
        switch(accessLevel) {
            case 'RegionVP':
                vm.newUser.Regions = [];
                break;
            case 'POD':
                vm.newUser.PODs = [];
                break;
            case 'SDP':
                vm.newUser.SDPChoice = null;
                break;
            default:
                break;
        }
        vm.newUser.PermissionsList = {};
        angular.forEach(vm.allPermissions, function(permission) {
            vm.newUser.PermissionsList[permission] = vm.accessLevelPermissions.AssignedByDefault.indexOf(permission) > -1;
        });
    }
    clearUser(vm.accessLevel);

    vm.createNewUser = function() {
        AdminCRUDInternalUsersService.CreateNewUser(vm.newUser)
            .then(function(u) {
                $state.go('base.adminInternalUsers',{accessLevel: vm.accessLevel}, {reload:true});
            })
            .catch(function(message) {
                toastr.error(message, null);
            });
    };

    vm.openPermissions = function() {
        var modelInstance = $uibModal.open({
            animation: false,
            templateUrl: 'adminInternalUsers/templates/userPermissions.modal.tpl.html',
            controller: 'AdminInternalUsersPermissionsCtrl',
            controllerAs: 'adminPermissions',
            size: 'permissions',
            resolve: {
                PermissionsList: function($q) {
                    var deferred = $q.defer();
                    deferred.resolve(vm.newUser.PermissionsList);
                    return deferred.promise;
                },
                PermissionsMap: function($q) {
                    var deferred = $q.defer();
                    deferred.resolve(vm.permissionsMap);
                    return deferred.promise;
                }
            }
        });

        modelInstance.result.then(function(result) {
            var changedCount = 0;
            angular.forEach(result, function(value, key) {
                if (value != vm.newUser.PermissionsList[key]) {
                    changedCount++;
                }
            });
            vm.newUser.PermissionsList = result;
            changedCount ? toastr.success(changedCount + ' Permission' + (changedCount > 1 ? 's Were ': ' Was ') + 'Changed.') : toastr.info('No Permissions Were Changed');
        }, function(reason) {
            if (reason == 'backdrop click') {
                toastr.info('No Permissions Were Changed')
            } else {
                toastr.info(reason);
            }
        });
    };
}

function AdminEditInternalUserController($rootScope, $state, $stateParams, $uibModal, toastr, Underscore, AdminCRUDInternalUsersService, AvedaDefaultPermissionsService, AccessLevelData, SelectedUser) {
    var vm = this;
    vm.accessLevel = $stateParams.accessLevel;
    vm.accessLevelData = AccessLevelData;

    vm.user = SelectedUser;

    vm.allPermissions = AvedaDefaultPermissionsService.AllPermissions();
    vm.accessLevelPermissions = AvedaDefaultPermissionsService[vm.accessLevel]();
    vm.permissionsMap = AvedaDefaultPermissionsService.PermissionMap();

    vm.user.PermissionsList = {};
    angular.forEach(vm.allPermissions, function(permission) {
        vm.user.PermissionsList[permission] = vm.user.xp.Permissions[permission];
    });

    vm.user.AccessLevel = vm.accessLevel;
    switch(vm.accessLevel) {
        case 'RegionVP':
            vm.user.Regions = vm.user.xp.Regions;
            vm.user.CanEditAssignments = true;
            break;
        case 'POD':
            vm.user.PODs = vm.user.xp.PODs;
            vm.user.CanEditAssignments = true;
            break;
        case 'SDP':
            vm.user.SDPChoice = {ID: vm.user.ID.replace('SDP-', ''), Name: (vm.user.FirstName + ' ' + vm.user.LastName)};
            vm.user.CanEditAssignments = true;
            break;
        case 'Custom':
            vm.user.CanEditAssignments = true;
            break;
        default:
            break;
    }

    vm.updateUser = function() {
        $rootScope.loading = {
            message: 'Updating User'
        };
        $rootScope.loading.promise = AdminCRUDInternalUsersService.UpdateUser(vm.user)
            .then(function(u) {
                $state.go('base.adminInternalUsers', {accessLevel: vm.accessLevel, clearCache: true}, {reload: true});
            })
            .catch(function(message) {
                vm.errorMessage = message;
            })
        ;
    };

    vm.deleteUser = function() {
        AdminCRUDInternalUsersService.DeleteUser(vm.user).then(function() {
            $state.go('base.adminInternalUsers', {}, {reload: true});
        });
    };

    vm.openPermissions = function() {
        var modelInstance = $uibModal.open({
            animation: false,
            templateUrl: 'adminInternalUsers/templates/userPermissions.modal.tpl.html',
            controller: 'AdminInternalUsersPermissionsCtrl',
            controllerAs: 'adminPermissions',
            size: 'permissions',
            resolve: {
                PermissionsList: function($q) {
                    var deferred = $q.defer();
                    deferred.resolve(vm.user.PermissionsList);
                    return deferred.promise;
                },
                PermissionsMap: function($q) {
                    var deferred = $q.defer();
                    deferred.resolve(vm.permissionsMap);
                    return deferred.promise;
                }
            }
        });

        modelInstance.result.then(function(result) {
            var changedCount = 0;
            angular.forEach(result, function(value, key) {
                if (value != vm.user.PermissionsList[key]) {
                    changedCount++;
                }
            });
            vm.user.PermissionsList = result;
            if (changedCount) {
                toastr.success(changedCount + ' Permission' + (changedCount > 1 ? 's Were ': ' Was ') + 'Changed.');
            } else {
                toastr.info('No Permissions Were Changed');
            }
        }, function(reason) {
            if (reason == 'backdrop click') {
                toastr.info('No Permissions Were Changed')
            } else {
                toastr.info(reason);
            }
        });
    };

    vm.editCustomAssignments = function() {
        var assignmentsModalInstance = $uibModal.open({
            animation: false,
            templateUrl: 'adminInternalUsers/templates/userAssignments.modal.tpl.html',
            controller: 'AdminInternalUsersAssignmentsCtrl',
            controllerAs: 'assignmentsModal',
            size: 'category',
            resolve: {
                AccessLevel: function() {
                    return vm.accessLevel;
                },
                CurrentUser: function() {
                    return vm.user;
                }

            }
        });

        assignmentsModalInstance.result.then(
            function(assignments) {
                //AVEDA-17365 -- Users are exiting the modal by both clicking Done and outside the modal
                //Custom assignments are already created on the fly, so we don't really need this data
                /*vm.user.salonAssignments = assignments.salons;
                vm.user.Groups = [];
                angular.forEach(assignments.salons, function(salon){
                    vm.user.Groups.push(salon.ID);
                });*/
            }
        );
    }
}

function AdminInternalUsersPermissionsController($uibModalInstance, PermissionsList, PermissionsMap) {
    var vm = this;
    vm.permissionsList = angular.copy(PermissionsList);
    vm.permissionsMap = PermissionsMap;
    vm.close = function() {
        $uibModalInstance.close(vm.permissionsList);
    };
    vm.cancel = function(){
        $uibModalInstance.dismiss('No Permissions Were Changed');
    }
}

function AdminInternalUsersAssignmentsController($rootScope, $timeout, $filter, $uibModalInstance, toastr, Underscore, OrderCloudSDK, AdminInternalUsersService, CurrentUser, AccessLevel, buyerid) {
    var vm = this;
    vm.accessLevel = AccessLevel;
    vm.currentUser = CurrentUser;
    vm.currentSalonGroupPage = 1;

    vm.salonAssignmentsLoading = true;
    $rootScope.loading = {
        message: 'Loading salon assignments'
    };
    $rootScope.loading.promise = AdminInternalUsersService.CustomAssignmentList(CurrentUser)
        .then(function(data) {
            vm.selectedSalonGroups = data;
            vm.salonAssignmentsLoading = false;
        });

    var searching;
    vm.searchCustomerGroup = function(searchTerm) {
        if (!searchTerm || searchTerm.length < 2) return;
        if (searching) $timeout.cancel(searching);
        searching = $timeout((function() {
            var opts = {search:searchTerm, page: 1, pageSize: 25, filters: {ID: 'SoldTo-*'}};
            return OrderCloudSDK.UserGroups.List(buyerid, opts)
                .then(function(data) {
                    data.Items = Underscore.filter(data.Items, function(item) {
                        return Underscore.pluck(vm.selectedSalonGroups, 'ID').indexOf(item.ID) === -1;
                    });
                    return $filter('xpStringToJSON')(data.Items);
                })
        }), 300);
        return searching;
    };

    vm.selectSalon = function(group) {
        OrderCloudSDK.UserGroups.SaveUserAssignment(buyerid, {UserGroupID: group.ID, UserID: vm.currentUser.ID})
            .then(function(){
                var opts = {page: 1, pageSize: 1, userID:vm.currentUser.ID };
                OrderCloudSDK.UserGroups.ListUserAssignments(buyerid, opts)
                    .then(function(groups){
                        OrderCloudSDK.Users.Patch(buyerid, vm.currentUser.ID, {'xp.SalonCount': groups.Meta.TotalCount})
                            .then(function(){
                                toastr.success(group.ID + ' has been assigned');
                                vm.searchTerm = null;
                                vm.selectedSalonGroups = Underscore.sortBy(vm.selectedSalonGroups, function(salon){return salon.ID});
                                vm.selectedSalonGroups.unshift(group);
                            });
                    });
            });
    };

    vm.removeSalon = function(salon){
        OrderCloudSDK.UserGroups.DeleteUserAssignment(buyerid, salon.ID, vm.currentUser.ID)
            .then(function(){
                var opts = {userID: vm.currentUser.ID };
                OrderCloudSDK.UserGroups.ListUserAssignments(buyerid, opts)
                    .then(function(groups){
                        OrderCloudSDK.Users.Patch(buyerid, vm.currentUser.ID, {'xp.SalonCount': groups.Meta.TotalCount})
                            .then(function(){
                                vm.selectedSalonGroups = Underscore.without(vm.selectedSalonGroups, salon);
                                var totalPages = Math.ceil(vm.selectedSalonGroups.length / 10);
                                vm.currentSalonGroupPage = totalPages < vm.currentSalonGroupPage ? totalPages : vm.currentSalonGroupPage;
                                toastr.success(salon.ID + ' has been unassigned');
                            });
                    });
            });
    };

    vm.close = function() {
        var assignments = {};
        assignments.salons = vm.selectedSalonGroups;
        $uibModalInstance.close(assignments);
    };
}