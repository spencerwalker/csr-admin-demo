angular.module('orderCloud.adminApprovals', [])
    .config(AdminApprovalsConfig)
    .factory('AdminApprovalRulesService', AdminApprovalRulesService)
    .controller('AdminApprovalsCtrl', AdminApprovalsController)
    .controller('EditApprovalRuleCtrl', EditApprovalRuleController)
;

function AdminApprovalsConfig($stateProvider) {
    $stateProvider
        .state('base.adminApprovals', {
            url: '/approvals',
            templateUrl:'adminApprovals/templates/adminApprovals.tpl.html',
            controller: 'AdminApprovalsCtrl',
            controllerAs: 'adminApprovals',
            data: {pageTitle: 'Approval Rules', loadingMessage: 'Loading All Approval Rules'},
            resolve: {
                FinanceHolidayLaunchRules: function($q, Underscore, OrderCloudSDK, buyerid) {
                    var queue = [];
                    var dfd = $q.defer();
                    var opts = { page: 1, pageSize: 100, filters: {ApprovingGroupID: 'Approval-Finance*|Approval-HolidayLaunch'}};
                    OrderCloudSDK.ApprovalRules.List(buyerid, opts)
                        .then(function(rules){
                           angular.forEach(rules.Items, function(rule){
                              queue.push(OrderCloudSDK.UserGroups.Get(buyerid, rule.ApprovingGroupID)
                                  .then(function(group){
                                      rule.ApprovingGroup = group;
                                      OrderCloudSDK.UserGroups.ListUserAssignments(buyerid, group.ID)
                                          .then(function(members){
                                              rule.ApprovingGroup.Members = members.Items;
                                          });
                                  })
                              );
                           });
                            $q.all(queue)
                                .then(function(){
                                    dfd.resolve(Underscore.uniq(rules.Items, 'ApprovingGroupID'));
                                });
                        });
                    return dfd.promise;
                },
                CustomizedMarketingRules: function($q, OrderCloudSDK, buyerid) {
                    var queue = [];
                    var dfd = $q.defer();
                    var opts = { page: 1, pageSize: 100, filters: {ApprovingGroupID: 'Approval-CM-*'}};

                    OrderCloudSDK.ApprovalRules.List(buyerid, opts)
                        .then(function(rules){
                            angular.forEach(rules.Items, function(rule){
                                queue.push(OrderCloudSDK.UserGroups.Get(buyerid, rule.ApprovingGroupID)
                                    .then(function(group){
                                        rule.ApprovingGroup = group;
                                        OrderCloudSDK.UserGroups.ListUserAssignments(buyerid, group.ID)
                                            .then(function(members){
                                                rule.ApprovingGroup.Members = members.Items;
                                            });
                                    })
                                );
                            });
                            $q.all(queue)
                                .then(function(){
                                    dfd.resolve(rules.Items);
                                });
                        });
                    return dfd.promise;
                },
                CostCenterRules: function($q, OrderCloudSDK, buyerid) {
                    var queue = [];
                    var dfd = $q.defer();
                    var opts = { page: 1, pageSize: 100, filters:  {RuleExpression: 'order.xp.CostCenter*'}};
                    OrderCloudSDK.ApprovalRules.List(buyerid, opts)
                        .then(function(rules){
                            angular.forEach(rules.Items, function(rule){
                                queue.push(OrderCloudSDK.UserGroups.Get(buyerid, rule.ApprovingGroupID)
                                    .then(function(group){
                                        rule.ApprovingGroup = group;
                                        OrderCloudSDK.UserGroups.ListUserAssignments(buyerid, group.ID)
                                            .then(function(members){
                                                rule.ApprovingGroup.Members = members.Items;
                                            });
                                    })
                                );
                            });
                            $q.all(queue)
                                .then(function(){
                                    dfd.resolve(rules.Items);
                                });
                        });
                    return dfd.promise;
                }
            }
        })
    ;
}

function AdminApprovalRulesService($q, Underscore, OrderCloudSDK, AdminInternalUsersService, buyerid) {
    var service = {
        GetEditApproval: _getEditApproval,
        UpdateApproval: _updateApproval
    };

    function _getEditApproval(rule) {
        var deferred = $q.defer();

        var result = {
            AvailableUsers: [],
            Approval: {}
        };

        var groupAssignmentPage = 1;
        var groupAssignmentUserIDs = [];
        if(rule.ID.indexOf('Finance-Aveda') == -1) {
            OrderCloudSDK.UserGroups.Get(buyerid, rule.ID)
                .then(function(group) {
                    result.Approval = group;
                    result.Approval.MemberUsers = [];
                    getUserAssignments(group);
                });
        } else {
            OrderCloudSDK.UserGroups.Get(buyerid, 'Approval-Finance')
                .then(function(group) {
                    result.Approval = group;
                    result.Approval.MemberUsers = [];
                    getUserAssignments(group);
                });
        }


        function getUserAssignments(group) {
            var opts = {userGroupID: group.ID, page: groupAssignmentPage, pageSize: 100};
            OrderCloudSDK.UserGroups.ListUserAssignments(buyerid, opts)
                .then(function(data) {
                    groupAssignmentUserIDs = groupAssignmentUserIDs.concat(Underscore.map(data.Items, function(assignment) { return assignment.UserID; }));
                    if (data.Meta.TotalPages > data.Meta.Page) {
                        groupAssignmentPage++;
                        getUserAssignments(groupAssignmentPage);
                    } else {
                        getApprovalMembers();
                    }
                });
        }

        function getApprovalMembers() {
            var approvalMemberQueue = [];

            angular.forEach(groupAssignmentUserIDs, function(id) {
                approvalMemberQueue.push((function() {
                    var d = $q.defer();

                    OrderCloudSDK.Users.Get(buyerid, id)
                        .then(function(user) {
                            result.Approval.MemberUsers.push(user);
                            d.resolve();
                        });

                    return d.promise;
                })());
            });

            $q.all(approvalMemberQueue).then(function() {
                getInternalUsers();
            });
        }

        function getInternalUsers() {
            AdminInternalUsersService.ListInternalUsers()
                .then(function(internalUsers) {
                    filterUsers(internalUsers);
                });
        }

        function filterUsers(internalUsers) {
            angular.forEach(internalUsers, function(user) {
                if (groupAssignmentUserIDs.indexOf(user.ID) == -1) {
                    result.AvailableUsers.push(user);
                }
            });

            deferred.resolve(result);
        }

        return deferred.promise;
    }

    function _updateApproval(approval, approvalUsers) {
        var deferred = $q.defer();

        updateApprovalUsers();

        function updateApprovalUsers() {
            var queue = [];

            var originalUserIDs = Underscore.map(approval.MemberUsers, function(u) { return u.ID });
            var currentUserIDs = Underscore.map(approvalUsers, function(u) { return u.ID });

            var usersToAdd = Underscore.difference(currentUserIDs, originalUserIDs);
            var usersToRemove = Underscore.difference(originalUserIDs, currentUserIDs);

            angular.forEach(usersToAdd, function(id) {
                queue.push((function() {
                    var d = $q.defer();

                    var assignment = {UserGroupID: approval.ApprovingGroup.ID, UserID: id};

                    OrderCloudSDK.UserGroups.SaveUserAssignment(buyerid, assignment)
                        .then(function() {
                            d.resolve();
                        });

                    return d.promise;
                })());
            });

            angular.forEach(usersToRemove, function(id) {
                queue.push((function() {
                    var d = $q.defer();

                    OrderCloudSDK.UserGroups.DeleteUserAssignment(buyerid, approval.ApprovingGroup.ID, id)
                        .then(function() {
                            d.resolve();
                        });

                    return d.promise;
                })());
            });

            $q.all(queue).then(function() {
                deferred.resolve();
            });
        }

        return deferred.promise;
    }

    return service;
}

function AdminApprovalsController($rootScope, $state, $uibModal, FinanceHolidayLaunchRules, CustomizedMarketingRules, CostCenterRules, CostCenterApprovalSetup) {
    var vm = this;
    vm.financeHolidayLaunchRules = FinanceHolidayLaunchRules;
    vm.customizedMarketingRules = CustomizedMarketingRules;
    vm.costCenterRules = CostCenterRules;

    vm.generateCMRules = function(){
        $rootScope.loading = {
            message: 'Updating Customized Marketing Approval Rules'
        };
        $rootScope.loading.promise = CostCenterApprovalSetup.GenerateNewCMRules()
            .then(function(){
                $state.reload();
            });
    };

    vm.editApproval = function(rule) {
        var modalInstance = $uibModal.open({
            templateUrl: 'adminApprovals/templates/adminApprovals.modal.tpl.html',
            controller: 'EditApprovalRuleCtrl',
            controllerAs: 'editApprovalModal',
            size: 'category',
            resolve: {
                Approval: function() {
                    return rule;
                },
                EditApproval: function(AdminApprovalRulesService) {
                    return AdminApprovalRulesService.GetEditApproval(rule);
                }
            }
        });

        modalInstance.result.then(
            function(success) {
                $rootScope.loading = {
                    message: 'Updating Approval Rule'
                };
                $rootScope.loading.promise = $state.reload();
            },
            function(dismiss) {
                console.log(dismiss)
            }
       )
    }
}

function EditApprovalRuleController($uibModalInstance, Underscore, AdminApprovalRulesService, Approval, EditApproval) {
    var vm = this;
    vm.approval = Approval;
    vm.approval.MemberUsers = EditApproval.Approval.MemberUsers;
    vm.availableUsers = EditApproval.AvailableUsers;
    vm.approvalUsers = angular.copy(EditApproval.Approval.MemberUsers);

    vm.submit = function() {
        AdminApprovalRulesService.UpdateApproval(vm.approval, vm.approvalUsers)
            .then(function(data) {
                $uibModalInstance.close('Success');
            })
            .catch(function(ex) {
                $uibModalInstance.dismiss(ex);
            });
    };

    vm.dismissModal = function() {
        $uibModalInstance.dismiss('Dismiss Result');
    };

    vm.selectedAvailableUsers = [];
    vm.addUsers = function() {
        vm.approvalUsers = Underscore.union(vm.approvalUsers, vm.selectedAvailableUsers);
        vm.availableUsers = Underscore.difference(vm.availableUsers, vm.selectedAvailableUsers);
        vm.selectedAvailableUsers = [];
    };

    vm.selectedApprovalUsers = [];
    vm.removeUsers = function() {
        vm.availableUsers = Underscore.union(vm.availableUsers, vm.selectedApprovalUsers);
        angular.forEach(vm.approvalUsers, function(user, index) {
            angular.forEach(vm.selectedApprovalUsers, function(u) {
                if (u.ID == user.ID) {
                    vm.approvalUsers.splice(index, 1);
                }
            });
        });
        vm.selectedApprovalUsers = [];
    };
}