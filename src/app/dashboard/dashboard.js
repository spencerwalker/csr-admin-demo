/*** Most of this functionality is/was used for mocking data and troubleshooting issues ***/
/*** This functionality is hidden. It can be accessed by clicking OrderCloud on the Dashboard ***/

angular.module('orderCloud.dashboard', [])
	.config(DashboardConfig)
	.controller('DashboardCtrl', DashboardController)
	.factory('Hierarchy', HierarchyService)
	.factory('MockProduct', MockProductService)
	.factory('MockAdmin', MockAdmin)
	.factory('CostCenterApprovalSetup', CostCenterApprovalSetup)
	.factory('PromotionCleanup', PromotionCleanup)
;

function DashboardConfig($stateProvider) {
	$stateProvider.state('base.dashboard', {
		url: '/dashboard',
		templateUrl: 'dashboard/templates/dashboard.tpl.html',
		controller: 'DashboardCtrl',
		controllerAs: 'dashboard',
		data: {pageTitle: 'Dashboard'}
	});
}

function DashboardController($q, $firebaseObject, OrderCloudSDK, Hierarchy, AvedaHierarchy, CostCenterApprovalSetup, MockProduct, MockAdmin, PromotionCleanup, firebaseurl, catalogid, buyerid) {
	var vm = this;
	vm.dropdown = false;

	vm.showSetup = false;

	vm.showSetupToggle = function() {
		vm.showSetup = !vm.showSetup;
	};

	vm.soldTos = Hierarchy.SoldTos();
	vm.UserFields = Hierarchy.UserFields();
	vm.products = MockProduct.Products();
	vm.prices = MockProduct.Prices();

	var categoryRootIDs = [
		'AvedaCatalogRoot',
		'AvedaPromotionsRoot',
		'AvedaMarketingRoot',
		'AvedaClientDislikeRoot',
		'AvedaHolidayRoot',
		'AvedaLaunchRoot',
		'AvedaLongTermBackOrderRoot'
	];

	vm.deleteClaims = function() {
		var ref = new Firebase(firebaseurl + '/Claims/');
		ref.on('value', function(data) {
			angular.forEach(data.val(), function(value, key) {
				if (key.indexOf('SoldTo') > -1) {
					var r = new Firebase(firebaseurl + '/Claims/' + key);
					var c = $firebaseObject(r);
					c.$remove();
				}
			});
		});
	};

	vm.createCategoryRoots = function() {
		angular.forEach(categoryRootIDs, function(rootID) {
			OrderCloudSDK.Categories.Create(catalogid, {
				ID:rootID,
				Name:rootID,
				Description:rootID,
				Active: true
			}).then(function() {
				OrderCloudSDK.Categories.SaveAssignment( catalogid, {
					BuyerID: buyerid,
					CategoryID: rootID
				})
			})
		})
	};

	vm.getSalonsByRegionID = function() {
		AvedaHierarchy.GetSalonsByLevel('Region', '0000021055')
			.then(function(salons) {
				console.log('Count:' + salons.length);
				console.log(salons);
			});
	};

	vm.deleteCategoryRoots = function() {
		angular.forEach(categoryRootIDs, function(rootID) {
			OrderCloudSDK.Categories.Delete(catalogid, rootID)
				.then(function() {
					console.log(rootID + ' was deleted');
				});
		});
	};

	vm.createCustomerGroups = function() {
		var group1 = {
			ID: 'CustomerGrp1-101',
			Name: 'CustomerGrp1-101',
			Description: ''
		};
		var group2 = {
			ID: 'CustomerGrp1-107',
			Name: 'CustomerGrp1-107',
			Description: ''
		};

		OrderCloudSDK.UserGroups.Create(buyerid, group1);
		OrderCloudSDK.UserGroups.Create(buyerid, group2);
	};

	vm.listProducts = function() {
		OrderCloudSDK.Products.List()
			.then(function(list) {
				vm.ProductList = list;
			});
	};

	vm.deleteProducts = function() {
		OrderCloudSDK.Categories.Delete("Aveda", "Aveda");
		angular.forEach(vm.products, function(product) {
			OrderCloudSDK.Products.Delete(product.ID);
		});
		angular.forEach(vm.prices, function(ps) {
			OrderCloudSDK.PriceSchedules.Delete(ps.ID);
		});
	};

	vm.createProducts = function() {
		var cat = {
			ID: 'Aveda',
			Name: 'All Aveda Products',
			Description: 'All Aveda Products',
			ListOrder: 1,
			Active: true,
			ParentID: null
		};

		OrderCloudSDK.Categories.Create(catalogid, cat).then(_createProducts);

		function _createProducts() {
			angular.forEach(vm.products, function (product) {
				OrderCloudSDK.Products.Create(product);
			});
		}
	};

	vm.assignProducts = function() {
		angular.forEach(vm.products, function(product) {
			var assignment = [
				{
					ProductID: product.ID,
					PriceScheduleID: product.ID + '-101',
					UserID: null,
					UserGroupID: 'CustomerGrp1-101',
					BuyerID: buyerid
				},
				{
					ProductID: product.ID,
					PriceScheduleID: product.ID + '-107',
					UserID: null,
					UserGroupID: 'CustomerGrp1-107',
					BuyerID: OrderCloud.BuyerID.Get()
				}
			];
			angular.forEach(assignment, function(a) {
				OrderCloudSDK.Products.SaveAssignment(a);
			});
		});
	};
	vm.createPrices = function() {
		angular.forEach(vm.prices, function(ps) {
			OrderCloudSDK.PriceSchedules.Create(ps);
		});
	};
	vm.setupAdmin = function() {
		MockAdmin.Create();
	};
	vm.teardownAdmin = function() {
		MockAdmin.Delete();
	};

	vm.createAndAssignPriceSchedules = function() {
		MockProduct.CreatePriceSchedulesAndAssignProducts();
	};

	vm.creatingCostCenterApprovals = null;
	vm.createPredefinedCostCenterApprovals = function() {
		vm.creatingCostCenterApprovals = 'Working...';
		CostCenterApprovalSetup.Create()
			.then(function() {
				vm.creatingCostCenterApprovals = 'Done!';
			});
	};

	vm.deletingApprovals = null;
	vm.deleteAllApprovals = function() {
		vm.deletingApprovals = 'Working...';
		CostCenterApprovalSetup.DeleteApprovalRules()
				.then(function() {
					CostCenterApprovalSetup.DeleteApprovalRuleStuff()
							.then(function() {
								vm.deletingApprovals = 'Done!';
							});
				});
	};

	function randomOrderNumber() {
		var chars = '0123456789';
		var string_length = 12;
		var randomstring = '';
		for (var i = 0; i < string_length; i++) {
			var rnum = Math.floor(Math.random() * chars.length);
			randomstring += chars.substring(rnum,rnum + 1);
		}

		return randomstring;
	}

	vm.submitting = false;
	vm.submitOrder = function() {
		vm.submitting = true;
		var newOrderID = randomOrderNumber();

		OrderCloudSDK.Orders.Get('outgoing', vm.submitOrderID)
			.then(function(order) {
				order.xp.OrderStatus = 'Submitted';
				OrderCloudSDK.Orders.Patch('outgoing', order.ID, {ID: newOrderID, xp: order.xp})
					.then(function() {
						OrderCloudSDK.Orders.Submit('outgoing', newOrderID)
							.then(function() {
								vm.submitting = false;
								vm.submitOrderID = null;
							});
					});
			});
	};
	
	vm.deleteOrder = function() {
		OrderCloudSDK.Orders.Delete('outgoing', vm.deleteOrderID);
	};

	vm.createMarkdownSpecs = function() {
		var freeSpec = {
			ID: 'FreeProductSpec',
			Name: 'FreeProductSpec',
			Required: false
		};
		OrderCloudSDK.Specs.Create(freeSpec)
			.then(function() {
				var twentyFivePercentOffSpec = {
					ID: 'TwentyFivePercentOffProductSpec',
					Name: 'TwentyFivePercentOffProductSpec',
					Required: false
				};
				OrderCloudSDK.Specs.Create(twentyFivePercentOffSpec)
					.then(function() {
						var freeTrueOption = {
							ID: 'FreeProductSpec-True',
							Value: 'true',
							PriceMarkupType: 'Percentage',
							PriceMarkup: -100
						};
						var freeFalseOption = {
							ID: 'FreeProductSpec-False',
							Value: 'false',
							PriceMarkupType: 'Percentage',
							PriceMarkup: 0
						};
						OrderCloudSDK.Specs.CreateOption('FreeProductSpec', freeTrueOption);
						OrderCloudSDK.Specs.CreateOption('FreeProductSpec', freeFalseOption);

						var twentyFiveTrueOption = {
							ID: 'TwentyFivePercentOffProductSpec-True',
							Value: 'true',
							PriceMarkupType: 'Percentage',
							PriceMarkup: -25
						};
						var twentyFiveFalseOption = {
							ID: 'TwentyFivePercentOffProductSpec-False',
							Value: 'false',
							PriceMarkupType: 'Percentage',
							PriceMarkup: 0
						};
						OrderCloudSDK.Specs.CreateOption('TwentyFivePercentOffProductSpec', twentyFiveTrueOption);
						OrderCloudSDK.Specs.CreateOption('TwentyFivePercentOffProductSpec', twentyFiveFalseOption);
						console.log('specs created');
					});
			});
	};

	vm.assignMarkdownSpecs = function() {
		var productsQueue = [];
		var specsQueue = [];
		var products = [];
		function gatherProducts() {
			var opts = { page : 1, pageSize : 100};
			OrderCloudSDK.Products.List(opts).then(function(data) {
				products = products.concat(data.Items);
				for (var i = 2; i <= data.Meta.TotalPages; i++) {
					opts = i;
					productsQueue.push(OrderCloudSDK.Products.List(opts));
				}
				$q.all(productsQueue).then(function(results) {
					angular.forEach(results, function(r) {
						products = products.concat(r.Items);
					});
					angular.forEach(products, function(p) {
						specsQueue.push((function() {
							var d = $q.defer();
							OrderCloudSDK.Specs.SaveProductAssignment({ProductID: p.ID, SpecID: 'FreeProductSpec'})
								.then(function() {
									OrderCloudSDK.Specs.SaveProductAssignment({ProductID: p.ID, SpecID: 'TwentyFivePercentOffProductSpec'})
										.then(function() {
											d.resolve();
										});
								});

							return d.promise;
						})());
					});

					$q.all(specsQueue).then(function() {
						console.log('Specs have been assigned to all products');
					});
				});
			});
		}
		gatherProducts();
	};

	vm.cleanupPromoXP = function() {
		vm.promoCleanupComplete = false;
		PromotionCleanup.RemoveProductFromXP()
			.then(function() {
				vm.promoCleanupComplete = true;
			});
	};
}

function CostCenterApprovalSetup($q, Underscore, OrderCloudSDK, AvedaHierarchy, buyerid) {
	var service = {
		Create: _create,
        GenerateNewCMRules: _generateNewCMRules,
		DeleteApprovalRuleStuff: _deleteApprovalRuleStuff,
		DeleteApprovalRules: _deleteApprovalRules
	};

	function _create() {
        createFinanceReplenishmentGroup();
		var deferred = $q.defer();
		function createFinanceReplenishmentGroup() {
			var financeGroup = {
				ID: 'Approval-Finance-Replenishment',
				Name: 'Approval-Finance-Replenishment',
				Description: 'Approval Group for Finance Replenishment',
				ReportingGroup: false,
				xp: {
					ApprovalType: 'FinanceHolidayLaunch'
				}
			};
			OrderCloud.UserGroups.Create(financeGroup)
				.then(function() {
                    createFinanceApprovalRule()
				});
		}

		function createFinanceApprovalRule() {
			var financeApprovalRule = {
				ID: 'Approval-Finance-Replenishment',
                ApprovingGroupID: 'Approval-Finance-Replenishment',
                RuleExpression: "order.xp.Four51OrderType = 'Replenishment'",
                Scope: 'PerOrder',
                ScopeTimeUnit: null,
                ScopeTimeNumber: null,
                ScopeStartDate: null,
                ExpireAfterTimeUnit: null,
                ExpireAfterNumber: null,
                ApproveOnExpire: false
			};
			OrderCloud.ApprovalRules.Create(financeApprovalRule)
				.then(function() {
                    createHolidayLaunchGroup();
				});
		}

		function createHolidayLaunchGroup() {
			var holidayLaunchGroup = {
				ID: 'Approval-HolidayLaunch',
				Name: 'Approval-HolidayLaunch',
				Description: 'Approval Group for Holiday and Launch Orders',
				ReportingGroup: false,
				xp: {
					ApprovalType: 'FinanceHolidayLaunch'
				}
			};
			OrderCloud.UserGroups.Create(holidayLaunchGroup)
				.then(function() {
                    createHolidayLaunchApprovalRule();
				});
		}

		function createHolidayLaunchApprovalRule() {
			var holidayLaunchApprovalRule = {
                ID: 'Approval-HolidayLaunch',
                ApprovingGroupID: 'Approval-HolidayLaunch',
                RuleExpression: "order.xp.Four51OrderType = 'Launch' or order.xp.Four51OrderType = 'Holiday'",
                Scope: 'PerOrder',
                ScopeTimeUnit: null,
                ScopeTimeNumber: null,
                ScopeStartDate: null,
                ExpireAfterTimeUnit: null,
                ExpireAfterNumber: null,
                ApproveOnExpire: false
        	};
			OrderCloud.ApprovalRules.Create(holidayLaunchApprovalRule)
				.then(function() {
					getRegions();
				});
		}

		function getRegions() {
			AvedaHierarchy.Get()
				.then(function(hierarchyReference) {
					buildRegionCMCostCenterApprovals(hierarchyReference);
				});
		}

		function buildRegionCMCostCenterApprovals(hierarchyReference) {
			var regionList = [];
			angular.forEach(hierarchyReference.Regions, function(value, key) {
				regionList.push({ID: value.ID, Name: value.Name});
			});
			var regionLength = regionList.length;
			var regionIndex = 0;

			function run(index) {
                createGroup();
				function createGroup() {
					var group = {
						ID: 'Approval-CM-' + regionList[index].ID,
						Name: 'Approval-CM-' + regionList[index].ID + ' - ' + regionList[index].Name,
						Description: 'Approval Group for Customized Marketing Order from Region' + regionList[index].ID + ' - ' + regionList[index].Name,
						ReportingGroup: false,
						xp: {
							ApprovalType: 'CustomizedMarketing'
						}
					};
					OrderCloud.UserGroups.Create(group)
						.then(function() {
                            createCMApprovalRule();
						});
				}

				function createCMApprovalRule() {
					var approvalRule = {
						ID: 'Approval-CM-' + regionList[index].ID,
                        ApprovingGroupID: 'Approval-CM-' + regionList[index].ID,
                        RuleExpression: "order.xp.Four51OrderType = 'CustomizedMarketing' and order.xp.Salon.RegionID = '" + regionList[index].ID +"'",
                        Scope: 'PerOrder',
                        ScopeTimeUnit: null,
                        ScopeTimeNumber: null,
                        ScopeStartDate: null,
                        ExpireAfterTimeUnit: null,
                        ExpireAfterNumber: null,
                        ApproveOnExpire: false

					};
					OrderCloud.ApprovalRules.Create(approvalRule)
						.then(function() {
							regionIndex++;
							if (regionIndex < regionLength) {
								run(regionIndex);
							}
							else {
								deferred.resolve();
							}
						});
				}
			}
			run(regionIndex);
		}

		return deferred.promise;
	}

    function _generateNewCMRules() {
        var deferred = $q.defer();
        getRegions();
        function getRegions() {
            AvedaHierarchy.Get()
                .then(function(hierarchyReference) {
                    buildRegionCMCostCenterApprovals(hierarchyReference);
                });
        }

        function buildRegionCMCostCenterApprovals(hierarchyReference) {
            var regionList = [];
            var existingRegions = [];
            var regionIndex = 0;
			OrderCloud.ApprovalRules.List(null, 1, 100, null, null, {ApprovingGroupID: 'Approval-CM-*'})
                .then(function(rules){
                    existingRegions = Underscore.pluck(rules.Items, "ID");
                    angular.forEach(hierarchyReference.Regions, function (region, key) {
                        if (existingRegions.indexOf('Approval-CM-' + key) === -1) {
                            regionList.push({ID: region.ID, Name: region.Name});
                        }
                    });
                    if(regionIndex < regionList.length) {
                        run(regionIndex);
                    }
                    else { 
                        deferred.resolve();
                    }
            });

            function run(index) {
                createGroup();
                function createGroup() {
                    var group = {
                        ID: 'Approval-CM-' + regionList[index].ID,
                        Name: 'Approval-CM-' + regionList[index].ID + ' - ' + regionList[index].Name,
                        Description: 'Approval Group for Customized Marketing Order from Region' + regionList[index].ID + ' - ' + regionList[index].Name,
                        ReportingGroup: false,
                        xp: {
                            ApprovalType: 'CustomizedMarketing'
                        }
                    };
					OrderCloud.UserGroups.Create(group)
                        .then(function() {
                            createCMApprovalRule();
                        });
                }

                function createCMApprovalRule() {
                    var approvalRule = {
                        ID: 'Approval-CM-' + regionList[index].ID,
                        ApprovingGroupID: 'Approval-CM-' + regionList[index].ID,
                        RuleExpression: "order.xp.Four51OrderType = 'CustomizedMarketing' and order.xp.Salon.RegionID = '" +  regionList[index].ID +"'",
                        Scope: 'PerOrder',
                        ScopeTimeUnit: null,
                        ScopeTimeNumber: null,
                        ScopeStartDate: null,
                        ExpireAfterTimeUnit: null,
                        ExpireAfterNumber: null,
                        ApproveOnExpire: false

                    };
					OrderCloud.ApprovalRules.Create(approvalRule)
                        .then(function() {
                            regionIndex++;
                            if (regionIndex < regionList.length) {
                                run(regionIndex);
                            }
                            else {
                                deferred.resolve();
                            }
                        });
                }
            }
        }

        return deferred.promise;
    }

	function _deleteApprovalRuleStuff() {
		var deferred = $q.defer();
		var groupQueue = [];
		var opts = { search: 'Approval', page : 1, pageSize: 100, filters: {ID: '!AvedaCostCenter-*', Name: '!Approval-Finance'} };
		OrderCloudSDK.UserGroups.List(buyerid, opts)
			.then(function(groups) {
				angular.forEach(groups.Items, function(group) {
					groupQueue.push(OrderCloudSDK.UserGroups.Delete(buyerid, group.ID));
				});
				$q.all(groupQueue);
			});

		return deferred.promise;
	}

	function _deleteApprovalRules() {
		var deferred = $q.defer();
		var opts = {page : 1, pageSize : 100, filters : {ApprovingGroupID: '!AvedaCostCenter-*', ID: '!Finance-AvedaCostCenter-*'} };
		OrderCloudSDK.ApprovalRules.List(buyerid, opts)
				.then(function(data) {
					var approvalQueue = [];
					angular.forEach(data.Items, function(ar) {
						approvalQueue.push(OrderCloudSDK.ApprovalRules.Delete(buyerid, ar.ID));
					});
					$q.all(approvalQueue).then(function() {
						deferred.resolve();
					});
				});

		return deferred.promise;
	}

	return service;
}

function MockAdmin(OrderCloudSDK, buyerid) {
	var service = {
		Create: _create,
		Delete: _delete
	};

	var groups = [
		{Name: 'Finance', Type: 'Finance'},
		{Name: 'Replenishment', Type: 'OrderType'},
		{Name: 'Launch', Type: 'OrderType'},
		{Name: 'Holiday', Type: 'OrderType'},
		{Name: 'CustomMarketing', Type: 'OrderType'},
		{Name: 'CostCenter-00001', Type: 'CostCenter'},
		{Name: 'CostCenter-00002', Type: 'CostCenter'},
		{Name: 'CostCenter-00003', Type: 'CostCenter'}
	];
	var userTypes = ['CSR', 'SDP', 'RegionVP', 'POD', 'Finance'];

	return service;

	function _delete() {
		angular.forEach(groups, function (group) {
			OrderCloudSDK.UserGroups.Delete(buyerid, group.Name);
			OrderCloudSDK.CostCenters.Delete(buyerid, group.Name);
			angular.forEach(userTypes, function(user) {
				OrderCloudSDK.Users.Delete(buyerid, group.Name + user);
			});
		});
	}
	function _create() {
		angular.forEach(groups, function(group) {
			OrderCloudSDK.UserGroups.Update(group.Name, {
				'ID': group.Name,
				'Name': 'Approver_' + group.Name,
				'Description': 'Approving group members',
				'ReportingGroup': false,
				'xp': {
					'ApprovalType': group.Type
				}
			})
			.then(function(group) {
				_costCenterCreate(group);
				_usersCreate(group);
			});
		});
	}

	function _costCenterCreate(group) {
		OrderCloud.CostCenters.Update(group.ID, {
			'ID': group.ID,
			'Name': group.ID,
			'Description': group.Name
		});
	}

	function _usersCreate(group) {
		angular.forEach(userTypes, function(i) {
			OrderCloud.Users.Update(i + '_' + group.ID, {
				'ID': i + '_' + group.ID,
				'Username': group.ID + i,
				'FirstName': group.ID,
				'LastName': i,
				'Email': 'tester' + i + '@estee.com',
				'Active': true,
				'xp': {
					'AccessLevel': i
				}
			});
		});
	}
}

function MockProductService($q, OrderCloud) {
	var service = {
		Products: _products,
		Prices: _prices,
		CreatePriceSchedulesAndAssignProducts: _createPriceSchedulesAndAssignProducts
	};
	return service;

	function _products() {
		return [
			{
				"ID": "A14G010000",
				"Description": "�",
				"Name": "Color Conserve Shampoo 250ml",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "100",
					"UPC": "018084807132",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "24" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "24" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "24" },
					"Subtotal1": "21.00"
				}
			},
			{
				"ID": "A14G01J000",
				"Description": "�",
				"Name": "Color Conserve Shampoo 250ml",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "100",
					"UPC": "018084807132",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "24" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "24" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "24" },
					"Subtotal1": "21.00"
				}
			},
			{
				"ID": "A14Y010000",
				"Description": "�",
				"Name": "Color Conserve Shampoo 1000ml",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "100",
					"UPC": "018084807361",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "12" },
					"Subtotal1": "63.00"
				}
			},
			{
				"ID": "A14Y01J000",
				"Description": "�",
				"Name": "Color Conserve Shampoo 1000ml",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "100",
					"UPC": "018084807361",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "12" },
					"Subtotal1": "63.00"
				}
			},
			{
				"ID": "A14H010000",
				"Description": "�",
				"Name": "Color Conserve� Conditioner 200ml",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "100",
					"UPC": "018084807149",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "24" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "24" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "24" },
					"Subtotal1": "21.00"
				}
			},
			{
				"ID": "A14H014000",
				"Description": "�",
				"Name": "Color Conserve� Conditioner 200ml",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "100",
					"UPC": "018084807149",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "24" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "24" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "24" },
					"Subtotal1": "21.00"
				}
			},
			{
				"ID": "A14H01J000",
				"Description": "�",
				"Name": "Color Conserve� Conditioner 200ml",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "100",
					"UPC": "018084807149",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "24" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "24" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "24" },
					"Subtotal1": "21.00"
				}
			},
			{
				"ID": "A151010000",
				"Description": "�",
				"Name": "Color Conserve� Conditioner 1000ml",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "100",
					"UPC": "018084807378",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "12" },
					"Subtotal1": "79.00"
				}
			},
			{
				"ID": "A151014000",
				"Description": "�",
				"Name": "Color Conserve� Conditioner 1000ml",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "100",
					"UPC": "018084807378",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "12" },
					"Subtotal1": "79.00"
				}
			},
			{
				"ID": "A15101J000",
				"Description": "�",
				"Name": "Color Conserve� Conditioner 1000ml",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "100",
					"UPC": "018084807378",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "12" },
					"Subtotal1": "79.00"
				}
			},
			{
				"ID": "AA50010000",
				"Description": "�",
				"Name": "Color Conserve� Daily Color Protect 100ml",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "100",
					"UPC": "018084905715",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "24" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "24" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "24" },
					"Subtotal1": "24.00"
				}
			},
			{
				"ID": "A3MF010000",
				"Description": "�",
				"Name": "Color Conserve� Strengthening 125ml",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "100",
					"UPC": "018084848517",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "24" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "24" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "24" },
					"Subtotal1": "26.00"
				}
			},
			{
				"ID": "A14Y500000",
				"Description": "�",
				"Name": "Color Conserve� Shampoo 1000ml BB",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "150",
					"UPC": "018084813898",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "12" },
					"Subtotal1": ""
				}
			},
			{
				"ID": "A14Y50J000",
				"Description": "�",
				"Name": "Color Conserve� Shampoo 1000ml BB",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "150",
					"UPC": "018084813898",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "12" },
					"Subtotal1": ""
				}
			},
			{
				"ID": "A151500000",
				"Description": "�",
				"Name": "Color Conserve� Conditioner 1000ml BB",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "150",
					"UPC": "018084813881",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "12" },
					"Subtotal1": ""
				}
			},
			{
				"ID": "A151504000",
				"Description": "�",
				"Name": "Color Conserve� Conditioner 1000ml BB",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "150",
					"UPC": "018084813881",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "12" },
					"Subtotal1": ""
				}
			},
			{
				"ID": "A15150J000",
				"Description": "�",
				"Name": "Color Conserve� Conditioner 1000ml BB",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "150",
					"UPC": "018084813881",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "12" },
					"Subtotal1": ""
				}
			},
			{
				"ID": "A2YE010000",
				"Description": "�",
				"Name": "Color Conserve� pHinish 1000ml BB",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "150",
					"UPC": "018084836002",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "12" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "12" },
					"Subtotal1": ""
				}
			},
			{
				"ID": "AA50500000",
				"Description": "�",
				"Name": "Color Conserve� Daily Color Protect 100ml BB",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "150",
					"UPC": "018084905739",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "24" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "24" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "24" },
					"Subtotal1": ""
				}
			},
			{
				"ID": "A38M010000",
				"Description": "�",
				"Name": "Color Conserve Conditioner 50ml",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "", "DistributionChannel": "", "Division": "", "MaterialGroup2": "100",
					"UPC": "018084841013",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "48" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "48" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "48" },
					"Subtotal1": ""
				}
			},
			{
				"ID": "AH8N010000",
				"Description": "�",
				"Name": "Color Conserve Daily Color Protect 25ml",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "", "DistributionChannel": "", "Division": "", "MaterialGroup2": "100",
					"UPC": "018084945568",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "24" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "24" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "24" },
					"Subtotal1": "8.00"
				}
			},
			{
				"ID": "A38L010000",
				"Description": "�",
				"Name": "Color Conserve Shampoo 50ml",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "", "DistributionChannel": "", "Division": "", "MaterialGroup2": "100",
					"UPC": "018084841006",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "48" },
					"Plant-1500": { "EA": "1", "Unit": "1", "Case": "48" },
					"Plant-1520": { "EA": "1", "Unit": "1", "Case": "48" },
					"Subtotal1": "9.00"
				}
			},
			{
				"ID": "AFHY400000",
				"Description": "�",
				"Name": "SI Naturally Straight 10ml (min/mult 48)",
				"QuantityMultiplier": 1, "ShipWeight": 0, "Active": true, "Type": "Static", "StdOrders": true, "ReplOrders": false, "InventoryEnabled": false, "InventoryNotificationPoint": null, "VariantLevelInventory": false, "ExceedInventory": false, "DisplayInventory": false,
				"XP": {
					"SalesOrganization": "1450", "DistributionChannel": "10", "Division": "21", "MaterialGroup2": "120",
					"UPC": "018084931738",
					"DChainSpecificStatus": "5",
					"Plant-1010": { "EA": "1", "Unit": "1", "Case": "960" },
					"Subtotal1": "8.00"
				}
			}
		];
	}

	function _prices() {
		return [
			{
				"ID": "A14G010000-101", "Name": "Color Conserve Shampoo 250ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 10.5 }]
			},
			{
				"ID": "A14G010000-107", "Name": "Color Conserve Shampoo 250ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 7.35 }]
			},
			{
				"ID": "A14G01J000-101", "Name": "Color Conserve Shampoo 250ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 10.5 }]
			},
			{
				"ID": "A14G01J000-107", "Name": "Color Conserve Shampoo 250ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 7.35 }]
			},
			{
				"ID": "A14Y010000-101", "Name": "Color Conserve Shampoo 1000ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 31.5 }]
			},
			{
				"ID": "A14Y010000-107", "Name": "Color Conserve Shampoo 1000ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 22.5 }]
			},
			{
				"ID": "A14Y01J000-101", "Name": "Color Conserve Shampoo 1000ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 31.5 }]
			},
			{
				"ID": "A14Y01J000-107", "Name": "Color Conserve Shampoo 1000ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 22.5 }]
			},
			{
				"ID": "A14H010000-101", "Name": "Color Conserve� Conditioner 200ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 10.5 }]
			},
			{
				"ID": "A14H014000-101", "Name": "Color Conserve� Conditioner 200ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 10.5 }]
			},
			{
				"ID": "A14H01J000-101", "Name": "Color Conserve� Conditioner 200ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 10.5 }]
			},
			{
				"ID": "A14H010000-107", "Name": "Color Conserve� Conditioner 200ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 7.35}]
			},
			{
				"ID": "A14H014000-107", "Name": "Color Conserve� Conditioner 200ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 7.35 }]
			},{
				"ID": "A14H01J000-107", "Name": "Color Conserve� Conditioner 200ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 7.35 }]
			},
			{
				"ID": "A151010000-101", "Name": "Color Conserve� Conditioner 1000ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 39.5 }]
			},
			{
				"ID": "A151014000-101", "Name": "Color Conserve� Conditioner 1000ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 39.5 }]
			},
			{
				"ID": "A15101J000-101", "Name": "Color Conserve� Conditioner 1000ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 39.5 }]
			},
			{
				"ID": "A151010000-107", "Name": "Color Conserve� Conditioner 1000ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 27.65 }]
			},
			{
				"ID": "A151014000-107", "Name": "Color Conserve� Conditioner 1000ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 27.65 }]
			},
			{
				"ID": "A15101J000-107", "Name": "Color Conserve� Conditioner 1000ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 27.65 }]
			},
			{
				"ID": "A3MF010000-101", "Name": "Color Conserve� Strengthening 125ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 13 }]
			},
			{
				"ID": "A3MF010000-107", "Name": "Color Conserve� Strengthening 125ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 9.1 }]
			},
			{
				"ID": "A14Y500000-101", "Name": "Color Conserve� Shampoo 1000ml BB", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 6.75 }]
			},
			{
				"ID": "A14Y50J000-101", "Name": "Color Conserve� Shampoo 1000ml BB", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 6.75 }]
			},
			{
				"ID": "A14Y500000-107", "Name": "Color Conserve� Shampoo 1000ml BB", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 6.75 }]
			},
			{
				"ID": "A14Y50J000-107", "Name": "Color Conserve� Shampoo 1000ml BB", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 6.75 }]
			},
			{
				"ID": "A151500000-101", "Name": "Color Conserve� Conditioner 1000ml BB", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 7.25 }]
			},
			{
				"ID": "A151504000-101", "Name": "Color Conserve� Conditioner 1000ml BB", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 7.25 }]
			},
			{
				"ID": "A15150J000-101", "Name": "Color Conserve� Conditioner 1000ml BB", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 7.25 }]
			},
			{
				"ID": "A151500000-107", "Name": "Color Conserve� Conditioner 1000ml BB", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 7.25 }]
			},
			{
				"ID": "A151504000-107", "Name": "Color Conserve� Conditioner 1000ml BB", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 7.25 }]
			},
			{
				"ID": "A15150J000-107", "Name": "Color Conserve� Conditioner 1000ml BB", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 7.25 }]
			},
			{
				"ID": "A2YE010000-101", "Name": "Color Conserve� pHinish 1000ml BB", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 7.25 }]
			},
			{
				"ID": "A2YE010000-107", "Name": "Color Conserve� pHinish 1000ml BB", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 5.07 }]
			},
			{
				"ID": "AA50500000-101", "Name": "Color Conserve� Daily Color Protect 100ml BB", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 5 }]
			},
			{
				"ID": "AA50500000-107", "Name": "Color Conserve� Daily Color Protect 100ml BB", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 5 }]
			},
			{
				"ID": "A38M010000-101", "Name": "Color Conserve Conditioner 50ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 4 }]
			},
			{
				"ID": "A38M010000-107", "Name": "Color Conserve Conditioner 50ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 2.8 }]
			},
			{
				"ID": "AH8N010000-101", "Name": "Color Conserve Daily Color Protect 25ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 4.5 }]
			},
			{
				"ID": "AH8N010000-107", "Name": "Color Conserve Daily Color Protect 25ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 3.15 }]
			},
			{
				"ID": "A38L010000-101", "Name": "Color Conserve Shampoo 50ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 4 }]
			},
			{
				"ID": "A38L010000-107", "Name": "Color Conserve Shampoo 50ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 2.8 }]
			},
			{
				"ID": "AFHY400000-101", "Name": "SI Naturally Straight 10ml (min/mult 48)", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": .34 }]
			},
			{
				"ID": "AFHY400000-107", "Name": "SI Naturally Straight 10ml (min/mult 48)", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": .34 }]
			},
			{
				"ID": "AA50010000-101", "Name": "Color Conserve� Daily Color Protect 100ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 12 }]
			},
			{
				"ID": "AA50010000-107", "Name": "Color Conserve� Daily Color Protect 100ml", "ApplyTax": false, "ApplyShipping": false, "MinQuantity": 1, "MaxQuantity": null, "UseCumulativeQuantity": false, "RestrictedQuantity": false, "OrderType": "Standard",
				"PriceBreaks": [{ "Quantity": 1, "Price": 8.4 }]
			}
	]};

	function _createPriceSchedulesAndAssignProducts() {
		var page = 1;
		var products = [];

		var priceScheduleQueue = [];
		var assignmentQueue = [];

		var randomPrices = [
			10.99,
			12.99,
			15.50,
			20.99,
			25.99
		];

		function gatherAllProducts() {
			OrderCloud.Products.List(null, page, 100)
				.then(function(data) {
					products = products.concat(data.Items);
					if (data.Meta.TotalPages > data.Meta.Page) {
						page++;
						gatherAllProducts();
					} else {
						buildPriceSchedules();
					}
				});
		}
		gatherAllProducts();

		function buildPriceSchedules() {
			angular.forEach(products, function(product) {
				priceScheduleQueue.push((function() {
					var d = $q.defer();

					var priceschedule101 = {
						"ID": product.ID + "-101",
						"Name": product.Name,
						"ApplyTax": false,
						"ApplyShipping": false,
						"MinQuantity": 1,
						"MaxQuantity": null,
						"UseCumulativeQuantity": false,
						"RestrictedQuantity": false,
						"OrderType": "Standard",
						"PriceBreaks": [{ "Quantity": 1, "Price": randomPrices[Math.floor(Math.random() * randomPrices.length)] }]
					};

					var priceschedule107 = {
						"ID": product.ID + "-107",
						"Name": product.Name,
						"ApplyTax": false,
						"ApplyShipping": false,
						"MinQuantity": 1,
						"MaxQuantity": null,
						"UseCumulativeQuantity": false,
						"RestrictedQuantity": false,
						"OrderType": "Standard",
						"PriceBreaks": [{ "Quantity": 1, "Price": randomPrices[Math.floor(Math.random() * randomPrices.length)] }]
					};

					OrderCloud.PriceSchedules.Create(priceschedule101).
						then(function() {
								OrderCloud.PriceSchedules.Create(priceschedule107)
								.then(function() {
									d.resolve();
								})
								.catch(function() {
									d.resolve();
								});
						})
						.catch(function() {
							d.resolve();
						});

					return d.promise;
				})());
			});

			$q.all(priceScheduleQueue).then(function() {
				assignProducts();
			});
		}

		function assignProducts() {
			angular.forEach(products, function(product) {
				assignmentQueue.push((function() {
					var d = $q.defer();

					var assignment101 = {
							"ProductID": product.ID,
							"StandardPriceScheduleID": product.ID + "-101",
							"ReplenishmentPriceScheduleID": null,
							"UserID": null,
							"UserGroupID": "CustomerGrp1-101",
							"BuyerID": OrderCloud.BuyerID.Get()
					};

					var assignment107 = {
						"ProductID": product.ID,
						"StandardPriceScheduleID": product.ID + "-107",
						"ReplenishmentPriceScheduleID": null,
						"UserID": null,
						"UserGroupID": "CustomerGrp1-107",
						"BuyerID": OrderCloud.BuyerID.Get()
					};

					OrderCloud.Products.SaveAssignment(assignment101).
						then(function() {
								OrderCloud.Products.SaveAssignment(assignment107)
								.then(function() {
									d.resolve();
								})
								.catch(function() {
									d.resolve();
								});
						})
						.catch(function() {
							d.resolve();
						});

					return d.promise;
				})());
			});

			$q.all(assignmentQueue).then(function() {
				alert('All price schedules have been created and assigned');
			});
		}

	}
}

function HierarchyService() {
	var service = {
		UserFields: _userFields,
		SoldTos: _soldTos
	};

	function _userFields() {
		var uf = [
			'AccessLevel',
			'Regions',
			'PODs'
		];

		return uf;
	}

	function _soldTos() {
		var soldTos = [
			{
				"SalesOrganization": 1450,
				"DistributionChannel": 10,
				"Division": 21,
				"CustomerNumber-Sold-To": 102615,
				"Name": "Salon Mystique",
				"Street/HouseNumber": "10950 CLUB WEST PKWY",
				"Suppl": "STE 150",
				"City": "Blaine",
				"PostalCode": 55449,
				"Country": "US",
				"Region": "MN",
				"Telephone": "763-767-2548",
				"E-Mail": "blankemail@sample.com",
				"ContactID": 858,
				"ContactPerson-Name": "Nielson",
				"ContactPerson-FirstName": "Cheryl",
				"ContactPerson-Description": "Owner",
				"CustomerGroup": 41,
				"TermsOfPayment": "ZCRD",
				"DeliveryPlant": 1010,
				"OrderBlock-SelectedSalesArea": null,
				"OrderBlock-AllSalesAreas": null,
				"CustomerGrp1": 101,
				"CustomerGrp2": null,
				"HeadOfficeTexts-ShippingNotes": "Closed on Mondays",
				"Classification": "Concept",
				"PartnerFunction-PayerID": 102615,
				"PayerName": "Salon Mystique",
				"PayerStreetHouseNumber": "10950 CLUB WEST PKWY",
				"PayerSuppl": "STE 150",
				"PayerCity": "Blaine",
				"PayerPostalCode": 55449,
				"PayerCountry": "US",
				"PayerRegion": "MN",
				"PartnerFunction-Ship-ToID": 102615,
				"Ship-ToName": "Salon Mystique",
				"Ship-ToStreetHouseNumber": "10950 CLUB WEST PKWY",
				"Ship-ToSuppl": "STE 150",
				"Ship-ToCity": "Blaine",
				"Ship-ToPostalCode": 55449,
				"Ship-ToCountry": "US",
				"Ship-ToRegion": "MN",
				"SDPName": "Ryan Torkelson",
				"SDPID": 900498,
				"PODName": "ASI Metro & Dakotas",
				"PODID": 21148,
				"RegionName": "ASI - CENTRAL: Greater Midwest",
				"RegionID": 21050,
				"CoOwnerID": "",
				"CoOwnerFirstName": "",
				"CoOwnerLastName": "",
				"CoOwnerEmail": ""
			},
			{
				"SalesOrganization": 1450,
				"DistributionChannel": 10,
				"Division": 21,
				"CustomerNumber-Sold-To": 300023,
				"Name": "Juut Edina",
				"Street/HouseNumber": "2670 SOUTHDALE CTR",
				"Suppl": "",
				"City": "Edina",
				"PostalCode": 55435,
				"Country": "US",
				"Region": "MN",
				"Telephone": "952-952-4343",
				"E-Mail": "invoices@juut.com",
				"ContactID": 2450,
				"ContactPerson-Name": "Wagner",
				"ContactPerson-FirstName": "David",
				"ContactPerson-Description": "Owner",
				"CustomerGroup": 41,
				"TermsOfPayment": "ZA30",
				"DeliveryPlant": 1010,
				"OrderBlock-SelectedSalesArea": null,
				"OrderBlock-AllSalesAreas": null,
				"CustomerGrp1": 107,
				"CustomerGrp2": null,
				"HeadOfficeTexts-ShippingNotes": "",
				"Classification": "Lifestyle Salon",
				"PartnerFunction-PayerID": 600092,
				"PayerName": "Juut Salonspa",
				"PayerStreetHouseNumber": "310 GROVELAND AVE",
				"PayerSuppl": "",
				"PayerCity": "Minneapolis",
				"PayerPostalCode": 55403,
				"PayerCountry": "US",
				"PayerRegion": "MN",
				"PartnerFunction-Ship-ToID": 300023,
				"Ship-ToName": "Juut",
				"Ship-ToStreetHouseNumber": "2670 SOUTHDALE CTR",
				"Ship-ToSuppl": "",
				"Ship-ToCity": "Edina",
				"Ship-ToPostalCode": 55435,
				"Ship-ToCountry": "US",
				"Ship-ToRegion": "MN",
				"SDPName": "Wendy Heie",
				"SDPID": 900524,
				"PODName": "ASI Metro & Northern MN",
				"PODID": 21147,
				"RegionName": "ASI - CENTRAL: Greater Midwest",
				"RegionID": 21050,
				"CoOwnerID": "",
				"CoOwnerFirstName": "",
				"CoOwnerLastName": "",
				"CoOwnerEmail": ""
			},
			{
				"SalesOrganization": 1450,
				"DistributionChannel": 10,
				"Division": 21,
				"CustomerNumber-Sold-To": 315102,
				"Name": "Salon Del Sol - Franklin",
				"Street/HouseNumber": "2601 Franklin Rd SW",
				"Suppl": "",
				"City": "Roanoke",
				"PostalCode": 24014,
				"Country": "US",
				"Region": "VA",
				"Telephone": "540-387-1900",
				"E-Mail": "stevestorersds@gmail.com",
				"ContactID": 195590,
				"ContactPerson-Name": "Latham",
				"ContactPerson-FirstName": "Bob",
				"ContactPerson-Description": "Owner",
				"CustomerGroup": 41,
				"TermsOfPayment": "ZCOD",
				"DeliveryPlant": 1500,
				"OrderBlock-SelectedSalesArea": null,
				"OrderBlock-AllSalesAreas": null,
				"CustomerGrp1": 101,
				"CustomerGrp2": null,
				"HeadOfficeTexts-ShippingNotes": "",
				"Classification": "Lifestyle Salon",
				"PartnerFunction-PayerID": 600140,
				"PayerName": "Salon Del Sol",
				"PayerStreetHouseNumber": "3101 Northside Ave",
				"PayerSuppl": "",
				"PayerCity": "Richmond",
				"PayerPostalCode": 23228,
				"PayerCountry": "US",
				"PayerRegion": "VA",
				"PartnerFunction-Ship-ToID": 410848,
				"Ship-ToName": "Salon Del Sol",
				"Ship-ToStreetHouseNumber": "11619 BUSY ST",
				"Ship-ToSuppl": "",
				"Ship-ToCity": "North Chesterfield",
				"Ship-ToPostalCode": 23236,
				"Ship-ToCountry": "US",
				"Ship-ToRegion": "VA",
				"SDPName": "Desaree Wallace",
				"SDPID": 900696,
				"PODName": "ASI Mid Atlantic",
				"PODID": 21109,
				"RegionName": "ASI - EAST: Southeast",
				"RegionID": 21020,
				"CoOwnerID": "",
				"CoOwnerFirstName": "",
				"CoOwnerLastName": "",
				"CoOwnerEmail": ""
			},
			{
				"SalesOrganization": 1450,
				"DistributionChannel": 10,
				"Division": 21,
				"CustomerNumber-Sold-To": 137971,
				"Name": "Kinship Salon",
				"Street/HouseNumber": "253 Clement ST",
				"Suppl": "",
				"City": "San Francisco",
				"PostalCode": 94118,
				"Country": "US",
				"Region": "CA",
				"Telephone": "415-735-9300",
				"E-Mail": "kinshipsalon@gmail.com",
				"ContactID": 834193,
				"ContactPerson-Name": "Zografos",
				"ContactPerson-FirstName": "Ashley",
				"ContactPerson-Description": "Owner",
				"CustomerGroup": 41,
				"TermsOfPayment": "ZCRD",
				"DeliveryPlant": 1520,
				"OrderBlock-SelectedSalesArea": null,
				"OrderBlock-AllSalesAreas": null,
				"CustomerGrp1": 101,
				"CustomerGrp2": null,
				"HeadOfficeTexts-ShippingNotes": "",
				"Classification": "Exclusive",
				"PartnerFunction-PayerID": 137971,
				"PayerName": "Kinship Salon",
				"PayerStreetHouseNumber": "253 Clement ST",
				"PayerSuppl": "",
				"PayerCity": "San Francisco",
				"PayerPostalCode": 94118,
				"PayerCountry": "US",
				"PayerRegion": "CA",
				"PartnerFunction-Ship-ToID": 137971,
				"Ship-ToName": "Kinship Salon",
				"Ship-ToStreetHouseNumber": "253 Clement ST",
				"Ship-ToSuppl": "",
				"Ship-ToCity": "San Francisco",
				"Ship-ToPostalCode": 94118,
				"Ship-ToCountry": "US",
				"Ship-ToRegion": "CA",
				"SDPName": "Alice Chin",
				"SDPID": 900356,
				"PODName": "ASI Northern CA",
				"PODID": 21160,
				"RegionName": "ASI - WEST: Northwest",
				"RegionID": 21055,
				"CoOwnerID": "834194",
				"CoOwnerFirstName": "Jimmy",
				"CoOwnerLastName": "Hsu",
				"CoOwnerEmail": "kinshipsalon@gmail.com"
			},
			{
				"SalesOrganization": 1450,
				"DistributionChannel": 10,
				"Division": 21,
				"CustomerNumber-Sold-To": 101198,
				"Name": "Barberia",
				"Street/HouseNumber": "939 Edgewater Blvd",
				"Suppl": "STE D",
				"City": "Foster City",
				"PostalCode": 94404,
				"Country": "US",
				"Region": "CA",
				"Telephone": "650-349-2414",
				"E-Mail": "info@barberiasalon.com",
				"ContactID": 2522,
				"ContactPerson-Name": "Demarco",
				"ContactPerson-FirstName": "Terry",
				"ContactPerson-Description": "Owner",
				"CustomerGroup": 41,
				"TermsOfPayment": "ZCRD",
				"DeliveryPlant": 1520,
				"OrderBlock-SelectedSalesArea": null,
				"OrderBlock-AllSalesAreas": null,
				"CustomerGrp1": 101,
				"CustomerGrp2": 101,
				"HeadOfficeTexts-ShippingNotes": "",
				"Classification": "Family",
				"PartnerFunction-PayerID": 101198,
				"PayerName": "Barberia",
				"PayerStreetHouseNumber": "939 Edgewater Blvd",
				"PayerSuppl": "STE D",
				"PayerCity": "Foster City",
				"PayerPostalCode": 94404,
				"PayerCountry": "US",
				"PayerRegion": "CA",
				"PartnerFunction-Ship-ToID": 101198,
				"Ship-ToName": "Barberia",
				"Ship-ToStreetHouseNumber": "939 Edgewater Blvd",
				"Ship-ToSuppl": "STE D",
				"Ship-ToCity": "Foster City",
				"Ship-ToPostalCode": 94404,
				"Ship-ToCountry": "US",
				"Ship-ToRegion": "CA",
				"SDPName": "Alice Chin",
				"SDPID": 900356,
				"PODName": "ASI Northern CA",
				"PODID": 21160,
				"RegionName": "ASI Northern CA",
				"RegionID": 21055,
				"CoOwnerID": "",
				"CoOwnerFirstName": "",
				"CoOwnerLastName": "",
				"CoOwnerEmail": ""
			}
		];

		return soldTos;
	}

	return service;
}

function PromotionCleanup($q, AvedaCategoryService, OrderCloud) {
	var service = {
		RemoveProductFromXP: _removeProductFromXP
	};

	function _removeProductFromXP() {
		var deferred = $q.defer();

		function cleanPromotions(promotions) {
			var queue = [];
			angular.forEach(promotions, function(promotion) {
				queue.push((function() {
					var d = $q.defer();

					delete promotion.children;
					if (promotion.xp && promotion.xp.Promo && promotion.xp.Promo.length) {
						angular.forEach(promotion.xp.Promo, function(product) {
							delete product.Product;
						});
					}

					OrderCloud.Categories.Update(promotion.ID, promotion)
						.then(function() {
							d.resolve();
						})
						.catch(function() {
							d.resolve();
						});

					return d.promise;
				})());
			});

			$q.all(queue).then(function() {
				deferred.resolve();
			});
		}

		AvedaCategoryService.GetCategoryTree()
			.then(function(tree) {
				var promotions = _.filter(tree, function(rootCat) { return rootCat.ID == 'AvedaPromotionsRoot'})[0].children;
				cleanPromotions(promotions);
			});

		return deferred.promise;
	}

	return service;
}
