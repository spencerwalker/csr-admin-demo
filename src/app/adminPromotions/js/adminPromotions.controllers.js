angular.module('orderCloud')
    .controller('AdminPromotionsListCtrl', AdminPromotionsListController)
    .controller('AdminPromotionsCreateCtrl', AdminPromotionsCreateController)
    .controller('AdminPromotionsEditCtrl', AdminPromotionsEditController)
    .controller('PromotionAddProductCtrl', PromotionAddProductController)
    .controller('PromotionAssignmentsCtrl', PromotionAssignmentsController)
;

function AdminPromotionsListController(Promotions, AvedaCategoryService) {
    var vm = this;
    vm.promotions = Promotions;
    vm.toggleCollapse = function(scope) {
        scope.Collapsed = !scope.Collapsed;
    };
    vm.treeOptions = {
        dropped: function(event) {
            AvedaCategoryService.UpdateCategoryNode(event);
        }
    };
}

function AdminPromotionsCreateController($state, AdminPromotionsService) {
    var vm = this;

    vm.newPromotion = {
        ParentID: 'AvedaPromotionsRoot',
        Name: null,
        Description: null,
        Active: true,
        xp: {
            StartDate: null,
            EndDate:null,
            Promo: [],
            Files: [],
            Assignments: {
                AllUsers: true,
                Internal: true,
                External: true,
                Regions: [],
                SalonTypes: [],
                Plants: []
            }
        }
    };

    vm.selectedProducts = [];

    vm.addProduct = function() {
        AdminPromotionsService.AddProduct()
            .then(function(promoObj) {
                vm.selectedProducts.push(promoObj);
            });
    };

    vm.editPromotionAssignment = function() {
        AdminPromotionsService.EditAssignments(vm.newPromotion.xp.Assignments)
            .then(function(assignments) {
                if (assignments) vm.newPromotion.xp.Assignments = assignments;
            });
    };

    vm.removeProduct = function(index) {
        vm.selectedProducts.splice(index, 1);
    };

    vm.createPromotion = function() {
        AdminPromotionsService.Create(vm.newPromotion, vm.selectedProducts)
            .then(function() {
                $state.go('base.adminPromotions', {}, {reload:true});
            });
    };

    vm.startDatePickerStatus = false;
    vm.endDatePickerStatus = false;
    vm.openDatepicker = function($event, picker) {
        $event.preventDefault();
        $event.stopPropagation();
        vm[picker] = true;
    };

    vm.dateChange = function() {
        if (vm.newPromotion.xp.StartDate && !vm.newPromotion.xp.EndDate) {
            vm.minDate = vm.newPromotion.xp.StartDate;
            vm.maxDate = null;
        }
        else if (!vm.newPromotion.xp.StartDate && vm.newPromotion.xp.EndDate) {
            vm.minDate = null;
            vm.maxDate = vm.newPromotion.xp.EndDate;
        }
        else if (vm.newPromotion.xp.StartDate && vm.newPromotion.xp.EndDate) {
            vm.minDate = vm.newPromotion.xp.StartDate;
            vm.maxDate = vm.newPromotion.xp.EndDate;
        }
        else {
            vm.minDate = null;
            vm.maxDate = null;
        }
    };

}

function AdminPromotionsEditController($state, SelectedPromotion, AdminPromotionsService) {
    var vm = this;
    vm.promotion = SelectedPromotion;
    if(!vm.promotion.xp.Files){
        vm.promotion.xp.Files = [];
    }
    vm.promotionCopy = angular.copy(SelectedPromotion);

    vm.selectedProducts = [];
    angular.forEach(vm.promotionCopy.xp.Promo, function(product) {
        vm.selectedProducts.push(product);
    });

    vm.deletePromotion = function() {
        AdminPromotionsService.Delete(vm.promotion).then(function() {
            $state.go('base.adminPromotions', {}, {reload:true});
        });
    };

    vm.addProduct = function() {
        AdminPromotionsService.AddProduct()
            .then(function(promoObj) {
                vm.selectedProducts.push(promoObj);
            });
    };

    vm.editPromotionAssignment = function() {
        AdminPromotionsService.EditAssignments(vm.promotion.xp.Assignments)
            .then(function(assignments) {
                if (assignments) vm.promotion.xp.Assignments = assignments;
            });
    };

    vm.removeProduct = function(index) {
        vm.selectedProducts.splice(index, 1);
    };

    vm.updatePromotion = function() {
        AdminPromotionsService.Update(vm.promotion, vm.selectedProducts)
            .then(function() {
                $state.go('base.adminPromotions', {}, {reload:true});
            });
    };

    vm.startDatePickerStatus = false;
    vm.endDatePickerStatus = false;
    vm.openDatepicker = function($event, picker) {
        $event.preventDefault();
        $event.stopPropagation();
        vm[picker] = true;
    };

    vm.dateChange = function() {
        if (vm.promotion.xp.StartDate && !vm.promotion.xp.EndDate) {
            vm.minDate = vm.promotion.xp.StartDate;
            vm.maxDate = null;
        }
        else if (!vm.promotion.xp.StartDate && vm.promotion.xp.EndDate) {
            vm.minDate = null;
            vm.maxDate = vm.promotion.xp.EndDate;
        }
        else if (vm.promotion.xp.StartDate && vm.promotion.xp.EndDate) {
            vm.minDate = vm.promotion.xp.StartDate;
            vm.maxDate = vm.promotion.xp.EndDate;
        }
        else {
            vm.minDate = null;
            vm.maxDate = null;
        }
    };
    vm.dateChange();
}

function PromotionAddProductController($uibModalInstance, OrderCloudSDK) {
    var vm = this;
    vm.promoObj = {
        Quantity: null,
        Free: false
    };

    vm.close = function() {
        $uibModalInstance.dismiss();
    };

    vm.productSearchSelect = function(item) {
        vm.SelectedProduct = angular.copy(item);
    };

    vm.searchProducts = function(searchTerm) {
        var opts = {search : searchTerm, page: 1, pageSize: 100};
        return OrderCloudSDK.Products.List(opts)
            .then(function(data) {
                return data.Items;
            });
    };

    vm.submit = function() {
        function closeAddPromoProductModal(promoProduct) {
            vm.promoObj.ID = promoProduct.ID;
            vm.promoObj.FullProduct = promoProduct;
            $uibModalInstance.close(vm.promoObj);
        }

        closeAddPromoProductModal(vm.SelectedProduct);
    }
}

function PromotionAssignmentsController($uibModalInstance, AssignmentsObj, Hierarchy) {
    var vm = this;
    vm.Assignments = AssignmentsObj;
    vm.regions = Hierarchy.Regions;
    vm.salonTypes = Hierarchy.SalonTypes;
    vm.plants = Hierarchy.Plants;

    vm.close = function() {
        $uibModalInstance.dismiss();
    };

    vm.save = function() {
        vm.Assignments.Regions = [];
        angular.forEach(vm.regions, function(region) {
            if (region.Selected) {
                vm.Assignments.Regions.push(region);
            }
        });
        vm.Assignments.SalonTypes = [];
        angular.forEach(vm.salonTypes, function(type) {
            if (type.Selected) {
                vm.Assignments.SalonTypes.push(type);
            }
        });
        vm.Assignments.Plants = [];
        angular.forEach(vm.plants, function(plant) {
            if (plant.Selected) {
                vm.Assignments.Plants.push(plant);
            }
        });
        $uibModalInstance.close(vm.Assignments);
    };

    vm.allUsersToggle = function(allUsers) {
        if (allUsers) {
            vm.Assignments.Internal = true;
            vm.Assignments.External = true;
            vm.Assignments.Regions = [];
            angular.forEach(vm.regions, function(region) {
                region.Selected = false;
            });
            vm.Assignments.SalonTypes = [];
            angular.forEach(vm.salonTypes, function(type) {
                type.Selected = false;
            });
            vm.Assignments.Plants = [];
            angular.forEach(vm.plants, function(plant) {
                plant.Selected = false;
            });
        }
    };
    vm.allUsersToggle(vm.Assignments.AllUsers);

    vm.internalUsersToggle = function(internalUsers) {
        if (internalUsers) {
            vm.Assignments.AllUsers = false;
            vm.Assignments.Internal = true;
            vm.Assignments.External = false;
            vm.Assignments.Regions = [];
            angular.forEach(vm.regions, function(region) {
                region.Selected = false;
            });
            vm.Assignments.SalonTypes = [];
            angular.forEach(vm.salonTypes, function(type) {
                type.Selected = false;
            });
            vm.Assignments.Plants = [];
            angular.forEach(vm.plants, function(plant) {
                plant.Selected = false;
            });
        }
    };

    function clearAllAssignments() {
        angular.forEach(vm.regions, function(r) {
            r.Selected = false;
        });
        angular.forEach(vm.salonTypes, function(t) {
            t.Selected = false;
        });
        angular.forEach(vm.plants, function(p) {
            p.Selected = false;
        });
    }
    clearAllAssignments();

    if (vm.Assignments.Regions) {
        angular.forEach(vm.regions, function(r) {
            angular.forEach(vm.Assignments.Regions, function(region) {
                if (region.ID == r.ID) {
                    r.Selected = true;
                }
            });
        });
    }
    if (vm.Assignments.SalonTypes) {
        angular.forEach(vm.salonTypes, function(t) {
            angular.forEach(vm.Assignments.SalonTypes, function(type) {
                if (type.Type == t.Type) {
                    t.Selected = true;
                }
            });
        });
    }
    if (vm.Assignments.Plants) {
        angular.forEach(vm.plants, function(p) {
            angular.forEach(vm.Assignments.Plants, function(plant) {
                if (plant.Plant == p.Plant) {
                    p.Selected = true;
                }
            });
        });
    }
}