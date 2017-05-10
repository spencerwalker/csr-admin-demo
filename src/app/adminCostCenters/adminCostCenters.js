angular.module('orderCloud.adminCostCenters', [])
    .config(AdminCostCentersConfig)
    .factory('AdminCostCentersService', AdminCostCentersService)
    .controller('AdminCostCentersListCtrl', AdminCostCentersListController)
    .controller('CostCenterModalCtrl', CostCenterModalController)
;

function AdminCostCentersConfig($stateProvider) {
    $stateProvider
        .state('base.adminCostCenters', {
            url: '/costcenters',
            data:{pageTitle: 'Administer Cost Centers', loadingMessage: 'Loading All Cost Centers'},
            templateUrl: 'adminCostCenters/templates/adminCostCenters.list.tpl.html',
            controller: 'AdminCostCentersListCtrl',
            controllerAs: 'adminCostCentersList',
            resolve: {
                CostCentersList: function(AdminCostCentersService) {
                    return AdminCostCentersService.List()
                        .catch(function(costcenters) {
                            return true;
                        });
                }
            }
        })
    ;
}

function AdminCostCentersService($q, Underscore, OrderCloudSDK, AvedaHierarchy, buyerid) {
    var service = {
        Get: _get,
        List: _list,
        Create: _create,
        Update: _update,
        Delete: _delete,
        GetAssignedRegions: _getAssignedRegions
    };

    function _get(id) {
        var deferred = $q.defer();
        OrderCloudSDK.CostCenters.Get(buyerid, id)
            .then(function(cc) {
                deferred.resolve(cc);
            })
            .catch(function() {
                deferred.reject('Cost Center Not Found.');
            });
        return deferred.promise;
    }

    function _list() {
        var deferred = $q.defer();
        var opts = {page: 1, pageSize: 100};
        OrderCloudSDK.CostCenters.List(buyerid, opts)
            .then(function(costCenters) {
                if (costCenters.Items && costCenters.Items.length) {
                    deferred.resolve(costCenters.Items);
                } else {
                    deferred.reject('No Cost Centers Found');
                }
            });
        return deferred.promise;
    }

    function _create(costCenter, parties, type) {
        var deferred = $q.defer();

        var cCntr = {
            ID: 'AvedaCostCenter-' + type + '-' + randomString(),
            Name: 'AvedaCostCenter-' + type + '-' + costCenter.Name,
            Description: costCenter.Description
        };
        OrderCloudSDK.CostCenters.Create(buyerid, cCntr)
            .then(function(cc) {
                createApprovalGroup(cc);
            });

        function createApprovalGroup(cc) {
            var group = {
                ID: cc.ID,
                Name: cc.Name,
                Description: 'Approval Group for ' + type + ' Cost Center ' + cc.Name,
                ReportingGroup: false,
                xp: {
                    ApprovalType: 'CostCenter'
                }
            };
            OrderCloudSDK.UserGroups.Create(buyerid, group)
                .then(function() {
                    createFinanceApprovalGroup(cc)
                });
        }
        function createFinanceApprovalGroup(cc) {
            OrderCloudSDK.UserGroups.Get(buyerid, 'Approval-Finance')
                .then(function(){
                    type == 'Internal' ? assignInternalCostCenter(cc) : assignExternalCostCenter(cc);
                })
                .catch(function(){
                    var financeGroup = {
                        ID: 'Approval-Finance',
                        Name: 'Approval-Finance',
                        Description: 'Finance Approval Group for Cost Center Orders',
                        ReportingGroup: false,
                        xp: {
                            ApprovalType: 'CostCenter'
                        }
                    };
                    OrderCloudSDK.UserGroups.Create(buyerid, financeGroup)
                        .then(function(){
                            type == 'Internal' ? assignInternalCostCenter(cc) : assignExternalCostCenter(cc);
                        })
                });
        }

        function assignInternalCostCenter(cc) {
            var assignmentQueue = [];
            angular.forEach(parties, function(group) {
                assignmentQueue.push((function() {
                    var assignDeferred = $q.defer();
                    OrderCloudSDK.CostCenters.SaveAssignment(buyerid, {
                        UserGroupID: group.ID,
                        CostCenterID: cc.ID
                    }).then(function() {
                        assignDeferred.resolve();
                    });
                    return assignDeferred.promise;
                })());
            });

            $q.all(assignmentQueue).then(function() {
                createApprovalRule(cc);
            });
        }

        function assignExternalCostCenter(cc) {
            var regionQueue = [];
            var salons = [];
            angular.forEach(Underscore.pluck(parties, 'ID'), function(region) {
                regionQueue.push(
                    AvedaHierarchy.GetSalonsByLevel('Region', region)
                );
            });

            $q.all(regionQueue).then(function(results) {
                angular.forEach(results, function(result) {
                    salons = salons.concat(result);
                });
                salons = Underscore.uniq(salons);
                assignToSalons();
            });

            function assignToSalons() {
                var assignQueue = [];
                angular.forEach(salons, function(salon) {
                    assignQueue.push(
                        OrderCloudSDK.CostCenters.SaveAssignment(buyerid,  {
                            UserGroupID: salon.ID,
                            CostCenterID: cc.ID
                        })
                    );
                });

                $q.all(assignQueue).then(function() {
                    createApprovalRule(cc);
                });
            }
        }

        function createApprovalRule(cc) {
            var approvalRule = {
                ID: cc.ID,
                ApprovingGroupID: cc.ID,
                RuleExpression: "order.xp.CostCenter = '" + cc.ID + "'",
                Scope: 'PerOrder',
                ScopeTimeUnit: null,
                ScopeTimeNumber: null,
                ScopeStartDate: null,
                ExpireAfterTimeUnit: null,
                ExpireAfterNumber: null,
                ApproveOnExpire: false
            };
            OrderCloudSDK.ApprovalRules.Create(buyerid, approvalRule)
                .then(function() {
                    createFinanceRule(cc);
                });
        }

        function createFinanceRule(cc) {
            var financeApprovalRule = {
                ID: 'Finance-' + cc.ID,
                ApprovingGroupID: 'Approval-Finance',
                RuleExpression: "order.approved('" + cc.ID + "')",
                Scope: 'PerOrder',
                ScopeTimeUnit: null,
                ScopeTimeNumber: null,
                ScopeStartDate: null,
                ExpireAfterTimeUnit: null,
                ExpireAfterNumber: null,
                ApproveOnExpire: false
            };
            OrderCloudSDK.ApprovalRules.Create(buyerid, financeApprovalRule)
                .then(function() {
                    deferred.resolve(cc);
                });
        }

        return deferred.promise;
    }

    function _update(costCenter, parties, type) {
        var deferred = $q.defer();

        costCenter.Name = 'AvedaCostCenter-' + type + '-' + costCenter.DisplayName;
        OrderCloudSDK.CostCenters.Update(buyerid, costCenter.ID, costCenter)
            .then(function(cc) {
                updateApprovalGroup(cc);
            });

        function updateApprovalGroup(cc) {
            OrderCloudSDK.UserGroups.Patch(buyerid, cc.ID, {Name: cc.Name})
                .then(function() {
                    type == 'Internal' ? updateInternalAssignments(cc) : updateExternalAssignments(cc);
                });
        }

        function updateInternalAssignments(cc) {
            var remove = Underscore.difference(Underscore.pluck(costCenter.OriginalAssignments, 'ID'), Underscore.pluck(parties, 'ID'));
            var add = Underscore.difference(Underscore.pluck(parties, 'ID'), Underscore.pluck(costCenter.OriginalAssignments, 'ID'));

            var queue = [];
            angular.forEach(remove, function(id) {
                queue.push(OrderCloudSDK.CostCenters.DeleteAssignment(buyerid, cc.ID, null, id));
            });
            angular.forEach(add, function(id) {
                var assignment = {
                    BuyerID: buyerid,
                    UserGroupID: id,
                    CostCenterID: cc.ID
                };
                queue.push(OrderCloudSDK.CostCenters.SaveAssignment(buyerid, assignment));
            });

            $q.all(queue).then(function() {
                deferred.resolve();
            });
        }

        function updateExternalAssignments(cc) {
            var removeRegions = Underscore.difference(Underscore.pluck(costCenter.OriginalAssignments, 'ID'), Underscore.pluck(parties, 'ID'));
            var addRegions = Underscore.difference(Underscore.pluck(parties, 'ID'), Underscore.pluck(costCenter.OriginalAssignments, 'ID'));
            var regionQueue = [];
            var salonsToUpdate = [];
            var updateQueue = [];
            angular.forEach(removeRegions, function(region) {
                regionQueue.push(
                    AvedaHierarchy.GetSalonsByLevel('Region', region)
              );
            });
            angular.forEach(addRegions, function(region) {
                regionQueue.push(
                    AvedaHierarchy.GetSalonsByLevel('Region', region)
              );
            });

            $q.all(regionQueue).then(function(results) {
                angular.forEach(results, function(result) {
                    salonsToUpdate = salonsToUpdate.concat(result);
                });
                salonsToUpdate = Underscore.uniq(salonsToUpdate);
                updateSalonAssignments();
            });

            function updateSalonAssignments() {
                angular.forEach(salonsToUpdate, function(s) {
                    if (s.xp && typeof(s.xp) == 'string') s.xp = JSON.parse(s.xp);
                    if (removeRegions.indexOf(s.xp.RegionID) > -1) updateQueue.push(OrderCloudSDK.CostCenters.DeleteAssignment(buyerid, cc.ID, null, s.ID));
                    if (addRegions.indexOf(s.xp.RegionID) > -1) updateQueue.push(OrderCloudSDK.CostCenters.SaveAssignment(buyerid, {UserGroupID: s.ID, CostCenterID: cc.ID}));
                });
                $q.all(updateQueue).then(function() {
                    deferred.resolve();
                })
            }
        }

        return deferred.promise;
    }

    function _delete(costCenter) {
        var deferred = $q.defer();

        deleteApprovalRule();

        function deleteApprovalRule() {
            OrderCloudSDK.ApprovalRules.Delete(buyerid, costCenter.ID)
                .then(function() {
                    deleteFinanceApprovalRule();
                })
                .catch(function() {
                    deleteFinanceApprovalRule();
                });
        }

        function deleteFinanceApprovalRule() {
            OrderCloudSDK.ApprovalRules.Delete(buyerid, 'Finance-' + costCenter.ID)
                .then(function() {
                    deleteCostCenter();
                })
                .catch(function() {
                    deleteCostCenter();
                });
        }

        function deleteCostCenter() {
            OrderCloudSDK.CostCenters.Delete(buyerid, costCenter.ID)
                .then(function() {
                    deleteApprovalGroup();
                })
                .catch(function() {
                    deleteApprovalGroup();
                });
        }

        function deleteApprovalGroup() {
            OrderCloudSDK.UserGroups.Delete(buyerid, costCenter.ID)
                .then(function() {
                    deleteFinanceApprovalGroup();
                })
                .catch(function() {
                    deleteFinanceApprovalGroup();
                });
        }

        function deleteFinanceApprovalGroup() {
            OrderCloudSDK.CostCenters.List(buyerid)
                .then(function(data) {
                    if(data.Items.length) {
                        deferred.resolve();
                    } else {
                        OrderCloudSDK.UserGroups.Delete(buyerid, 'Approval-Finance')
                            .then(function(){
                                deferred.resolve();
                            })
                            .catch(function() {
                                deferred.resolve();
                            });
                    }
                })
                .catch(function() {
                    deferred.resolve();
                });
        }

        return deferred.promise;
    }

    function _getAssignedRegions(costCenter) {
        var deferred = $q.defer();

        var regions = {
            Available: [],
            Assigned: []
        };

        AvedaHierarchy.Get()
            .then(function(hierarchy) {
                var regionQueue = [];
                angular.forEach(hierarchy.Regions, function(region) {
                    var opts = {search: 'SoldTo-', page: 1, pageSize: 1, searchOn: 'ID', sortBy: 'Name', filters:{'xp.RegionID': region.ID}};
                    regionQueue.push(
                        OrderCloudSDK.UserGroups.List(buyerid, opts)
                    );
                });

                $q.all(regionQueue).then(function(results) {
                    var salons = [];
                    angular.forEach(results, function(result) {
                        salons = salons.concat(result.Items);
                    });
                    checkAssignments(salons);
                });
            });

        function checkAssignments(salons) {
            var checkQueue = [];
            angular.forEach(salons, function(salon) {
                if (salon.xp && typeof(salon.xp) == 'string') salon.xp = JSON.parse(salon.xp);
                checkQueue.push((function() {
                    var d = $q.defer();
                    var opts =  {page: 1, pageSize: 1, costCenterID:costCenter.ID, userGroupID: salon.ID };
                    OrderCloudSDK.CostCenters.ListAssignments(buyerid, opts)
                        .then(function(data) {
                            if (data.Items.length) {
                                regions.Assigned.push({ID: salon.xp.RegionID, Name: salon.xp.RegionName});
                            } else {
                                regions.Available.push({ID: salon.xp.RegionID, Name: salon.xp.RegionName});
                            }
                            d.resolve();
                        });

                    return d.promise;
                })());
            });

            $q.all(checkQueue).then(function() {
                deferred.resolve(regions);
            });
        }

        return deferred.promise;
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

function AdminCostCentersListController($rootScope, $q, $state, $uibModal, CostCentersList, buyerid) {
    var vm = this;
    vm.costCenters = CostCentersList;

    vm.createNew = function(type) {
        var modalInstance = $uibModal.open({
            templateUrl: 'adminCostCenters/templates/adminCostCenters.createModal.tpl.html',
            controller: 'CostCenterModalCtrl',
            controllerAs: 'costCenterModal',
            size: 'category',
            resolve: {
                CostCenterType: function() {
                    return type;
                },
                CostCenterResolve: function() {
                    return {
                        ID: null,
                        Name: null,
                        Description: null
                    }
                },
                AssignmentParties: function($q, Underscore, AvedaHierarchy) {
                    var deferred = $q.defer();

                    if (type == 'Internal') {
                        //Customer Group 35s
                        AvedaHierarchy.GetSalonsByCustomerGroup('35')
                            .then(function(data) {
                                var result = {
                                    Available: data,
                                    Assigned: null
                                };
                                deferred.resolve(result);
                            });
                    }
                    else if (type == 'External') {
                        //Regions
                        AvedaHierarchy.Get()
                            .then(function(hierarchy) {
                                var regionList = [];
                                angular.forEach(hierarchy.Regions, function(value, key) {
                                    regionList.push({ID: value.ID, Name: value.Name});
                                });
                                deferred.resolve({
                                    Available: regionList,
                                    Assigned: null
                                });
                            });
                    }

                    return deferred.promise;
                }
            }
        });

        modalInstance.result.then(
            function() {
                $state.reload();
            })
    };

    vm.edit = function(scope) {
        var modalEditDefer = $q.defer();
        $rootScope.loading = {
            message: 'Loading Assignments',
            promise: modalEditDefer.promise
        };
        var modalInstance = $uibModal.open({
            templateUrl: 'adminCostCenters/templates/adminCostCenters.editModal.tpl.html',
            controller: 'CostCenterModalCtrl',
            controllerAs: 'costCenterModal',
            size: 'category',
            resolve: {
                CostCenterType: function() {
                    return scope.costCenter.ID.indexOf('-Internal-') > -1 ? 'Internal' : 'External';
                },
                CostCenterResolve: function() {
                    var editCostCenter = angular.copy(scope.costCenter);
                    editCostCenter.DisplayName = editCostCenter.Name.split('-')[2];
                    return editCostCenter;
                },
                AssignmentParties: function($q, Underscore, OrderCloudSDK, AvedaHierarchy, AdminCostCentersService) {
                    var deferred = $q.defer();
                    if (scope.costCenter.ID.indexOf('-Internal-') > -1) {
                        //Internal
                        AvedaHierarchy.GetSalonsByCustomerGroup('35')
                            .then(function(groups) {
                                var assignedGroupIDs = [],
                                    assignmentListQueue = [];
                                var opts = {costCenterID: scope.costCenter.ID, page: 1, pageSize: 100};
                                OrderCloudSDK.CostCenters.ListAssignments(buyerid, opts)
                                    .then(function(data) {
                                        assignedGroupIDs = assignedGroupIDs.concat(Underscore.pluck(data.Items, 'UserGroupID'));
                                        if (data.Meta.TotalPages > 1) {
                                            for (var i = 2; i <= data.Meta.TotalPages; i++) {
                                                opts.page= i;
                                                assignmentListQueue.push(OrderCloudSDK.CostCenters.ListAssignments(buyerid, opts));
                                            }
                                            $q.all(assignmentListQueue).then(function(results) {
                                                angular.forEach(results, function(r) {
                                                    assignedGroupIDs = assignedGroupIDs.concat(Underscore.pluck(r.Items, 'UserGroupID'))
                                                });
                                                deferred.resolve({
                                                    Available: Underscore.filter(groups, function(group) {
                                                        return assignedGroupIDs.indexOf(group.ID) == -1;
                                                    }),
                                                    Assigned: Underscore.filter(groups, function(group) {
                                                        return assignedGroupIDs.indexOf(group.ID) > -1;
                                                    })
                                                })
                                            })
                                        } else {
                                            deferred.resolve({
                                                Available: Underscore.filter(groups, function(group) {
                                                    return assignedGroupIDs.indexOf(group.ID) == -1;
                                                }),
                                                Assigned: Underscore.filter(groups, function(group) {
                                                    return assignedGroupIDs.indexOf(group.ID) > -1;
                                                })
                                            })
                                        }

                                    });
                            });
                    }
                    else {
                        //External
                        AdminCostCentersService.GetAssignedRegions(scope.costCenter)
                            .then(function(regions) {
                                deferred.resolve(regions);
                            });
                    }
                    return deferred.promise;
                }
            }
        });

        modalInstance.opened.then(function() {
            modalEditDefer.resolve();
        });
        modalInstance.result.then(function() {
            $state.reload();
        });
    };
}

function CostCenterModalController($uibModalInstance, Underscore, AdminCostCentersService, CostCenterType, CostCenterResolve, AssignmentParties) {
    var vm = this;
    vm.costCenter = CostCenterResolve;
    vm.costCenter.OriginalAssignments = angular.copy(AssignmentParties.Assigned);
    vm.costCenterType = CostCenterType;
    vm.availableParties = AssignmentParties.Available;
    vm.assignedParties = AssignmentParties.Assigned;

    vm.selectedAvailableParties = null;
    vm.selectedCostCenterParties = null;

    vm.addParties = function() {
        vm.assignedParties = Underscore.union(vm.assignedParties, vm.selectedAvailableParties);
        vm.availableParties = Underscore.difference(vm.availableParties, vm.selectedAvailableParties);
    };

    vm.removeParties = function() {
        vm.availableParties = Underscore.union(vm.availableParties, vm.selectedCostCenterParties);
        vm.assignedParties = Underscore.difference(vm.assignedParties, vm.selectedCostCenterParties);
    };

    vm.save = function(type) {
        AdminCostCentersService.Create(vm.costCenter, vm.assignedParties, type).then(function(cc) {
            $uibModalInstance.close();
        });
    };

    vm.update = function() {
        AdminCostCentersService.Update(vm.costCenter, vm.assignedParties, vm.costCenterType).then(function() {
            $uibModalInstance.close();
        });
    };

    vm.delete = function() {
        AdminCostCentersService.Delete(vm.costCenter).then(function() {
            $uibModalInstance.close();
        })
    };

    vm.cancel = function() {
        $uibModalInstance.dismiss();
    };
}