angular.module('orderCloud.adminClaims', [])
    .config(AdminClaims)
    .factory('AdminClaimsService', AdminClaimsService)
    .controller('AdminClaimsCtrl', AdminClaimsController)
;

function AdminClaims($stateProvider) {
    $stateProvider
        .state('base.adminClaims', {
            url: '/claims/:claimType',
            templateUrl: 'adminClaims/templates/adminClaims.tpl.html',
            data: {pageTile: 'Claims', loadingMessage: 'Loading Claims Categories'},
            controller: 'AdminClaimsCtrl',
            controllerAs: 'adminClaims',
            resolve: {
                CategoryOptions: function($stateParams, AdminClaimsService) {
                    return AdminClaimsService.ListCategoryOptions($stateParams.claimType);
                },
                ClaimReasons: function($stateParams, AdminClaimsService) {
                    return AdminClaimsService.ListClaimReasons();
                }
            }
        })
    ;
}

function AdminClaimsService($q, AzureService) {
    var service = {
        ListCategoryOptions: _listCategoryOptions,
        AddCategoryOption: _addCategoryOption,
        TreeDrop: _treeDrop,
        SaveCategory: _saveCategory,
        DeleteCategory: _deleteCategory,
        SetDefaultOption: _setDefaultOption,
        ListClaimReasons: _listClaimReasons,
        SaveClaimReason: _saveClaimReason,
        DeleteClaimReason: _deleteClaimReason
    };

    function randomString() {
        var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var string_length = 15;
        var randomstring = '';
        for (var i = 0; i < string_length; i++) {
            var rnum = Math.floor(Math.random() * chars.length);
            randomstring += chars.substring(rnum, rnum + 1);
        }
        return randomstring;
    }

    function objCount(obj) {
        var count = 0;
        angular.forEach(obj, function(value, key) {
            count++;
        });
        return count;
    }

    function _listCategoryOptions(type) {
        var deferred = $q.defer();

        AzureService.ClaimCategoryOptions.List({Type: type})
            .then(function(data) {
                deferred.resolve(data.Data);
            })
            .catch(function(ex) {
                deferred.reject(ex);
            });

        return deferred.promise;
    }

    function _addCategoryOption(newCat, claimType) {
        var deferred = $q.defer();

        var category = {
            id: randomString(),
            Name: newCat.Name,
            Type: claimType
        };

        if (newCat.Parent && newCat.Parent.id) {
            AzureService.ClaimCategoryOptions.Get(newCat.Parent.id)
                .then(function(data) {
                    var parent = data.Data;
                    category.Level = 'SubCategory';
                    category.ListOrder = parent.SubCategories ? objCount(newCat.Parent.SubCategories) : 0;
                    category.ParentID = parent.id;
                    if (!parent.SubCategories) parent.SubCategories = {};
                    parent.SubCategories[category.id] = category;
                    AzureService.ClaimCategoryOptions.Update((parent.id || parent.ID), parent)
                        .then(function(data) {
                            deferred.resolve(data.Data);
                        })
                        .catch(function(ex) {
                            deferred.reject(ex);
                        });
                })
                .catch(function(ex) {
                    deferred.reject(ex);
                });
        }
        else {
            AzureService.ClaimCategoryOptions.Create(category)
                .then(function(data) {
                    deferred.resolve(data.Data);
                })
                .catch(function(ex) {
                    deferred.reject(ex);
                });
        }

        return deferred.promise;
    }

    function _treeDrop(event, categoryOptions) {
        var deferred = $q.defer();
        var nodeScope = event.source.nodeScope;
        var queue = [];
        var queueIndex = 0;
        if (nodeScope.$modelValue && nodeScope.$modelValue.Level == 'Category') {
            angular.forEach(categoryOptions, function(cat, ind) {
                queue.push((function() {
                    var d = $q.defer();
                    var index = ind;

                    cat.ListOrder = index;
                    AzureService.ClaimCategoryOptions.Update((cat.id || cat.ID), cat)
                        .then(function(data) {
                            d.resolve(data.Data);
                        });

                    return d.promise;
                })());
            });

            var queueLength = queue.length;
            function run(index) {
                queue[index].then(function() {
                    queueIndex++;
                    if (queueIndex < queueLength) {
                        run(queueIndex);
                    }
                    else {
                        deferred.resolve();
                    }
                });
            }
            run(queueIndex);
        }
        else {
            var movedDown = event.dest.index > event.source.index;
            var oldListOrder = event.source.index;
            var newListOrder = movedDown ? (event.dest.index - 1) : event.dest.index;
            if (oldListOrder != newListOrder) {
                angular.forEach(categoryOptions[nodeScope.$parentNodeScope.$modelValue.ListOrder].SubCategories, function(subCat, id) {
                    if (subCat.ListOrder == oldListOrder) {
                        queue.push((function() {
                            var d = $q.defer();

                            var parent = categoryOptions[nodeScope.$parentNodeScope.$modelValue.ListOrder];
                            parent.SubCategories[id].ListOrder = newListOrder;
                            AzureService.ClaimCategoryOptions.Update((parent.id || parent.ID), parent)
                                .then(function(data) {
                                    d.resolve(data.Data);
                                });

                            return d.promise;
                        })());
                    }
                    else if (oldListOrder > subCat.ListOrder &&  subCat.ListOrder >= newListOrder) {
                        queue.push((function() {
                            var d = $q.defer();

                            var parent = categoryOptions[nodeScope.$parentNodeScope.$modelValue.ListOrder];
                            parent.SubCategories[id].ListOrder++;
                            AzureService.ClaimCategoryOptions.Update((parent.id || parent.ID), parent)
                                .then(function(data) {
                                    d.resolve(data.Data);
                                });

                            return d.promise;
                        })());
                    }
                    else if ((newListOrder == subCat.ListOrder || subCat.ListOrder >= oldListOrder) && (movedDown && subCat.ListOrder <= newListOrder) && subCat.ListOrder != 0) {
                        queue.push((function() {
                            var d = $q.defer();

                            var parent = categoryOptions[nodeScope.$parentNodeScope.$modelValue.ListOrder];
                            parent.SubCategories[id].ListOrder--;
                            AzureService.ClaimCategoryOptions.Update((parent.id || parent.ID), parent)
                                .then(function(data) {
                                    d.resolve(data.Data);
                                });

                            return d.promise;
                        })());
                    }
                });

                var queueLength = queue.length;
                function run(index) {
                    queue[index].then(function() {
                        queueIndex++;
                        if (queueIndex < queueLength) {
                            run(queueIndex);
                        }
                        else {
                            deferred.resolve();
                        }
                    });
                }
                run(queueIndex);
            }
            else {
                deferred.resolve();
            }
        }
        return deferred.promise;
    }

    function _saveCategory(cat, claimType, categoryOptions) {
        var deferred = $q.defer();

        if (cat.Level == 'SubCategory') {
            angular.forEach(categoryOptions, function(category) {
                angular.forEach(category.SubCategories, function(subCat, subCatID) {
                    if (cat.ParentID == category.id && subCat.ListOrder == cat.ListOrder) {
                        cat.id = subCatID;
                    }
                });
            });
        }

        cat.Type = claimType;
        cat.Name = angular.copy(cat.NewName);
        if (cat.NewName) delete cat.NewName;
        if (cat.Level == 'SubCategory') {
            AzureService.ClaimCategoryOptions.Get(cat.ParentID)
                .then(function(data) {
                    var parent = data.Data;
                    parent.SubCategories[(cat.id || cat.ID)] = cat;
                    AzureService.ClaimCategoryOptions.Update((parent.id || parent.ID), parent)
                        .then(function(data) {
                            deferred.resolve(data.Data);
                        })
                        .catch(function(ex) {
                            deferred.reject(ex);
                        });
                });
        }
        else {
            AzureService.ClaimCategoryOptions.Update((cat.id || cat.ID), cat)
                .then(function(data) {
                    deferred.resolve(data.Data);
                })
                .catch(function(ex) {
                    deferred.reject(ex);
                });
        }

        return deferred.promise;
    }

    function objectLength(obj) {
        var count = 0;
        angular.forEach(obj, function(value, key) {
            if (key && value) {
                count++;
            }
        });
        return count;
    }

    function _deleteCategory(cat, categoryOptions) {
        var deferred = $q.defer();

        if (cat.Level == 'SubCategory') {
            angular.forEach(categoryOptions, function(category) {
                angular.forEach(category.SubCategories, function(subCat, subCatID) {
                    if (cat.ParentID == category.id && subCat.ListOrder == cat.ListOrder) {
                        cat.id = subCatID;
                    }
                });
            });

            AzureService.ClaimCategoryOptions.Get(cat.ParentID)
                .then(function(data) {
                    var parent = data.Data;
                    delete parent.SubCategories[(cat.id || cat.ID)];
                    if (!objectLength(parent.SubCategories)) {
                        delete parent.SubCategories;
                    }
                    AzureService.ClaimCategoryOptions.Update((parent.id || parent.ID), parent)
                        .then(function(data) {
                            deferred.resolve(data.Data);
                        })
                        .catch(function(ex) {
                            deferred.reject(ex);
                        })
                })
                .catch(function(ex) {
                    deferred.reject(ex);
                })
        }
        else {
            AzureService.ClaimCategoryOptions.Delete((cat.id || cat.ID))
                .then(function(data) {
                    deferred.resolve(data.Data);
                })
                .catch(function(ex) {
                    deferred.reject(ex);
                });
        }

        return deferred.promise;
    }

    function _setDefaultOption(cat, categoryOptions) {
        var deferred = $q.defer();

        var queue = [];
        var queueIndex = 0;
        if (cat.Level == 'Category') {
            angular.forEach(categoryOptions, function(category) {
                queue.push((function() {
                    var d = $q.defer();

                    category.DefaultOption = (category.id == cat.id && cat.DefaultOption);
                    AzureService.ClaimCategoryOptions.Update((category.id || category.ID), category)
                        .then(function(data) {
                            d.resolve(data.Data);
                        });

                    return d.promise;
                })());
            });
        }
        else {
            angular.forEach(categoryOptions, function(category) {
                if (category.$id == cat.ParentID) {
                    angular.forEach(category.SubCategories, function(subCat, id) {
                        queue.push((function() {
                            var d = $q.defer();

                            AzureService.ClaimCategoryOptions.Get(subCat.ParentID)
                                .then(function(data) {
                                    var parent = data.Data;
                                    parent.SubCategories[(subCat.id || subCat.ID)].DefaultOption = (subCat.Name == cat.Name && subCat.ListOrder == cat.ListOrder && cat.DefaultOption);
                                    AzureService.ClaimCategoryOptions.Update((parent.id || parent.ID), parent)
                                        .then(function(data) {
                                            d.resolve(data.Data);
                                        })
                                });

                            return d.promise;
                        })());
                    });
                }
            });
        }

        var queueLength = queue.length;
        function run(index) {
            queue[index].then(function() {
                queueIndex++;
                if (queueIndex < queueLength) {
                    run(queueIndex);
                }
                else {
                    deferred.resolve();
                }
            });
        }
        run(queueIndex);

        return deferred.promise;
    }
    function _listClaimReasons() {
        var deferred = $q.defer();

        AzureService.ClaimReasons.List()
            .then(function(data) {
                deferred.resolve(data.Data.ClaimReasons);
            })
            .catch(function(ex) {
                deferred.reject(ex);
            });

        return deferred.promise;
    }
    function _saveClaimReason(claimReasons, reason) {
        var deferred = $q.defer();
        claimReasons.push(reason);
        var ClaimReasons = {
            id: 'ClaimReasons',
            ClaimReasons: claimReasons
        };

        AzureService.ClaimReasons.Update(ClaimReasons)
            .then(function(data) {
                deferred.resolve(data.Data.ClaimReasons);
            })
            .catch(function(ex) {
                deferred.reject(ex);
            });

        return deferred.promise;
    }
    function _deleteClaimReason(claimReasons, reason) {
        var deferred = $q.defer();
        claimReasons.splice(claimReasons.indexOf(reason), 1);
        var ClaimReasons = {
            id: 'ClaimReasons',
            ClaimReasons: claimReasons
        };

        AzureService.ClaimReasons.Update(ClaimReasons)
            .then(function(data) {
                deferred.resolve(data.Data.ClaimReasons);
            })
            .catch(function(ex) {
                deferred.reject(ex);
            });

        return deferred.promise;
    }

    return service;
}

function AdminClaimsController($stateParams, AdminClaimsService, CategoryOptions, ClaimReasons) {
    var vm = this;
    vm.claimType = $stateParams.claimType;
    vm.categoryOptions = CategoryOptions;
    vm.claimReasons = ClaimReasons || [];

    angular.forEach(vm.categoryOptions, function(category) {
        angular.forEach(category.SubCategories, function(subCat) {
            subCat.ParentID = category.id;
        });
    });

    vm.toggle = function(scope) {
        scope.toggle();
    };

    vm.newReason = function() {
        AdminClaimsService.SaveClaimReason(vm.claimReasons, vm.newClaimReason)
            .then(function() {
                refreshClaimReasons();
            });
    };
    vm.deleteReason = function(reason) {
        AdminClaimsService.DeleteClaimReason(vm.claimReasons, reason)
            .then(function() {
                refreshClaimReasons();
            });
    };
    function refreshClaimReasons() {
        AdminClaimsService.ListClaimReasons()
            .then(function(data) {
                vm.newClaimReason = null;
                vm.claimReasons = data;
            });
    }

    vm.newCategoryOption = {};
    vm.newCategoryOption.Parent = {Name: 'No Parent', id: null};
    vm.newCategory = function(newCat) {
        AdminClaimsService.AddCategoryOption(newCat, vm.claimType)
            .then(function() {
                vm.newCategoryOption = (newCat.Parent && newCat.Parent.$id) ? {Name: null, Parent: newCat.Parent} : {Name: null, Parent: null};
                refreshCategories();
            });
    };

    vm.editCategory = function(scope, cat) {
        cat.NewName = angular.copy(cat.Name);
        scope.Editing = !scope.Editing;
    };

    vm.saveCategory = function(scope, cat) {
        AdminClaimsService.SaveCategory(cat, vm.claimType, vm.categoryOptions)
            .then(function() {
                vm.editCategory(scope, cat);
            });
    };

    vm.deleteCategory = function(scope, cat) {
        AdminClaimsService.DeleteCategory(cat, vm.categoryOptions)
            .then(function() { refreshCategories() });
    };

    vm.setAsDefaultOption = function(scope, cat) {
        AdminClaimsService.SetDefaultOption(cat, vm.categoryOptions)
            .then(function() { refreshCategories() });
    };

    vm.treeOptions = {
        dragMove: function(event) {
            angular.element(event.elements.placeholder[0]).removeClass('invalid-placeholder');
            if (event.source.nodeScope.depth() == 2 && event.dest.nodesScope.depth() == 0) {
                angular.element(event.elements.placeholder[0]).addClass('invalid-placeholder');
            }
            else if (event.source.nodeScope.depth() == 1 && event.dest.nodesScope.depth() == 1) {
                angular.element(event.elements.placeholder[0]).addClass('invalid-placeholder');
            }
        },
        beforeDrop: function(event) {
            if (event.source.nodeScope.depth() == 2 && event.dest.nodesScope.depth() == 0) {
                event.source.nodeScope.$$apply = false;
            }
            else if (event.source.nodeScope.depth() == 1 && event.dest.nodesScope.depth() == 1) {
                event.source.nodeScope.$$apply = false;
            }
        },
        dropped: function(event) {
            AdminClaimsService.TreeDrop(event, vm.categoryOptions)
                .then(function() { refreshCategories() });
        }
    };

    function refreshCategories() {
        AdminClaimsService.ListCategoryOptions(vm.claimType)
            .then(function(data) {
                vm.categoryOptions = data;
            });
    }
}