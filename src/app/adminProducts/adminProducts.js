angular.module('orderCloud.adminProducts', [])
	.config(AdminProductsConfig)
	.factory('AdminProductsService', AdminProductsService)
	.controller('AdminProductsCtrl', AdminProductsController)
	.controller('AdminProductsCategoryAssignmentModalCtrl', AdminProductsCategoryAssignmentModalController)
;

function AdminProductsConfig($stateProvider) {
	$stateProvider
		.state('base.adminProducts', {
			url: '/adminProducts?productID',
			templateUrl: 'adminProducts/templates/adminProducts.tpl.html',
			controller: 'AdminProductsCtrl',
			controllerAs: 'adminProducts',
			data: {pageTitle: 'AdminProducts'},
			resolve: {
				Tree: function(AvedaCategoryService) {
					return AvedaCategoryService.GetCategoryTree();
				},
				UnassignedProducts: function(AdminProductsService) {
					return AdminProductsService.GetUnassignedProducts();
				}
			}
		})
	;
}

function AdminProductsService($q, Underscore, OrderCloudSDK, AvedaFilesService, catalogid) {
	var service = {
		Update: _update,
		GetUnassignedProducts: _getUnassignedProducts,
		UpdateCategoryAssignments: _updateCategoryAssignments,
		AssignMarkdownSpecs: _assignMarkdownSpecs
	};

	function _update(p) {
		var product = angular.copy(p);
		var deferred = $q.defer();

		if (product.ImageUpdated) {
			updateProductImage();
		}
		else {
			updateProduct().then(function(prod) {
				deferred.resolve(prod);
			});
		}

		function updateProductImage() {
			AvedaFilesService.Upload(p.Image.File)
				.then(function(imgData) {
                    if (product.xp) {
                        product.xp.Image = {
                            ID: imgData.Key,
                            URL: imgData.Location
                        };
                    }
                    else {
                        product.xp = {
                            Image: {
                                ID: imgData.Key,
                                URL: imgData.Location
                            }
                        }
                    }
					updateProduct().then(function(prod) {
						deferred.resolve(prod);
					});
				});
		}

		var updateProductQueue = [];
		function updateProduct() {
			var productUpdateDeferred = $q.defer();
			if (product.xp) {
				var keywordString = '<span id="keywords">' +
					product.ID + ', ' +
					product.xp.UPC + ', ' +
					product.xp.ProductType + ', ' +
					(product.xp.Size ? (product.xp.Size + ', ') : '') +
					'</span>';
				product.Description = (product.Description ? product.Description : '') + ' ' + keywordString;
			}

			OrderCloudSDK.Products.Update(product.ID, product)
				.then(function(p) {
					p.xp.ClientDislike ? updateProductQueue.push(OrderCloudSDK.Categories.SaveProductAssignment(catalogid, {CategoryID: 'AvedaClientDislikeRoot', ProductID: p.ID})) :
						updateProductQueue.push(OrderCloudSDK.Categories.DeleteProductAssignment(catalogid, 'AvedaClientDislikeRoot', p.ID));

					p.xp.CustomizedMarketing ? updateProductQueue.push(OrderCloudSDK.Categories.SaveProductAssignment(catalogid, {CategoryID: 'AvedaMarketingRoot', ProductID: p.ID})) :
						updateProductQueue.push(OrderCloudSDK.Categories.DeleteProductAssignment(catalogid, 'AvedaMarketingRoot', p.ID));

					p.xp.Holiday ? updateProductQueue.push(OrderCloudSDK.Categories.SaveProductAssignment(catalogid, {CategoryID: 'AvedaHolidayRoot', ProductID: p.ID})) :
						updateProductQueue.push(OrderCloudSDK.Categories.DeleteProductAssignment(catalogid, 'AvedaHolidayRoot', p.ID));

					p.xp.Launch ? updateProductQueue.push(OrderCloudSDK.Categories.SaveProductAssignment(catalogid, {CategoryID: 'AvedaLaunchRoot', ProductID: p.ID})) :
						updateProductQueue.push(OrderCloudSDK.Categories.DeleteProductAssignment(catalogid, 'AvedaLaunchRoot', p.ID));

					p.xp.LongTermBackOrder ? updateProductQueue.push(OrderCloudSDK.Categories.SaveProductAssignment(catalogid, {CategoryID: 'AvedaLongTermBackOrderRoot', ProductID: p.ID})) :
						updateProductQueue.push(OrderCloudSDK.Categories.DeleteProductAssignment( catalogid, 'AvedaLongTermBackOrderRoot', p.ID));

					$q.all(updateProductQueue).then(function() {
						productUpdateDeferred.resolve(p);
					});
				});

			return productUpdateDeferred.promise;
		}
		return deferred.promise;
	}

	function _getUnassignedProducts() {
		var deferred = $q.defer();
		var unassignedProducts = [];
		var products = [];
		var specAssignments = [];
		var categories = [];
		var assignedProducts = [];

		function gatherProducts() {
			var opts = {page: 1, pageSize: 100};
			OrderCloudSDK.Products.List(opts)
				.then(function(data) {
					products = products.concat(data.Items);
					var queue = [];
					for (var i = 2; i <= data.Meta.TotalPages; i++) {
						opts.page = i;
						queue.push(OrderCloudSDK.Products.List(opts));
					}
					$q.all(queue).then(function(results) {
						angular.forEach(results, function(r) {
							products = products.concat(r.Items);
						});
						gatherSpecAssignments();
					})
				});
		}
		gatherProducts();

		function gatherSpecAssignments() {
			var opts = {search: 'FreeProductSpec', page: 1, pageSize: 100};
			OrderCloudSDK.Specs.ListProductAssignments(opts)
				.then(function(data) {
					specAssignments = specAssignments.concat(data.Items);
					var queue = [];
					for (var i = 2; i <= data.Meta.TotalPages; i++) {
						opts.page = i;
						queue.push(OrderCloudSDK.Specs.ListProductAssignments(opts));
					}
					$q.all(queue).then(function(results) {
						angular.forEach(results, function(r) {
							specAssignments = specAssignments.concat(r.Items);
						});
						var productsWithSpecs = Underscore.uniq(Underscore.pluck(specAssignments, 'ProductID'));
						angular.forEach(products, function(product) {
							product.HasMarkdownSpecs = productsWithSpecs.indexOf(product.ID) > -1;
						});
						gatherCategories();
					});
				});
		}

		function gatherCategories() {
			var opts = { page : 1, pageSize: 100, filters: {ParentID: 'AvedaCatalogRoot'}, depth: 'all' };
			OrderCloudSDK.Categories.List( catalogid, opts)
					.then(function(data) {
						categories = categories.concat(data.Items);
						var queue = [];
						angular.forEach(data.Items, function(c) {
							opts.filters = {ParentID: c.ID};
							queue.push(OrderCloudSDK.Categories.List(catalogid, opts));
						});
						$q.all(queue).then(function(results) {
							angular.forEach(results, function(r) {
								categories = categories.concat(r.Items);
							});
							gatherProductAssignments();
						});
					});
		}

		function gatherProductAssignments() {
			var assignmentQueue = [];
			angular.forEach(categories, function(cat) {
				assignmentQueue.push((function() {
					var d = $q.defer();
					var opts = {categoryID : cat.ID, page: 1, pageSize: 100 };
					OrderCloudSDK.Categories.ListProductAssignments(catalogid, opts)
						.then(function(data) {
							angular.forEach(data.Items, function(i) {
								if (['ALLProducts', 'AvedaHolidayRoot', 'AvedaLaunchRoot', 'AvedaMarketingRoot', 'AvedaPromotionsRoot', 'AvedaClientDislikeRoot', 'AvedaLongTermBackOrderRoot'].indexOf(i.CategoryID) == -1) assignedProducts.push(i.ProductID);
							});
							d.resolve();
						});

					return d.promise;
				})());
			});

			$q.all(assignmentQueue).then(function() {
				findUnassignedProducts();
			});
		}

		function findUnassignedProducts() {
			var productIDs = Underscore.pluck(products, 'ID');
			var unassignedProductIDs = Underscore.difference(productIDs, assignedProducts);

			unassignedProducts = Underscore.filter(products, function(p) { return unassignedProductIDs.indexOf(p.ID) > -1 });

			deferred.resolve(unassignedProducts);
		}


		return deferred.promise;
	}

	function _updateCategoryAssignments(product, tree, originalCategories) {
		var deferred = $q.defer();

		var assignmentQueue = [];

		function analyzeCategory(cat) {
			if (cat.SelectedToAssign) {
				if (originalCategories.indexOf(cat.ID) == -1) {
					assignmentQueue.push(OrderCloudSDK.Categories.SaveProductAssignment(catalogid, {CategoryID: cat.ID, ProductID: product.ID}));
				}
			}
			else {
				if (originalCategories.indexOf(cat.ID) > -1) {
					assignmentQueue.push(OrderCloudSDK.Categories.DeleteProductAssignment(catalogid, cat.ID, product.ID));
				}
			}
			if (cat.children && cat.children.length) {
				angular.forEach(cat.children, function(c) {
					analyzeCategory(c);
				});
			}
		}
		angular.forEach(tree, function(c) {
			analyzeCategory(c);
		});

		$q.all(assignmentQueue).then(function() {
			deferred.resolve();
		});

		return deferred.promise;
	}

	function _assignMarkdownSpecs() {
		var deferred = $q.defer();

		var productsQueue = [];
		var specsQueue = [];
		var products = [];
		function gatherProducts() {
			var opts = {page: 1 , pageSize: 100};
			OrderCloudSDK.Products.List(opts).then(function(data) {
				products = products.concat(data.Items);
				for (var i = 2; i <= data.Meta.TotalPages; i++) {
					opts.page = i;
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
						deferred.resolve();
					});
				});
			});
		}
		gatherProducts();

		return deferred.promise;
	}

	return service;
}

function AdminProductsController($state, $filter, $rootScope, $uibModal, Underscore, toastr, OrderCloudSDK, AdminProductsService, Tree, UnassignedProducts, catalogid) {
	var vm = this;
	vm.SelectedProduct = null;
	vm.SelectedProductCopy = null;
	vm.ChangedCategories = [];
	vm.ProductUsageOptions = [
		'Retail',
		'Back Bar'
	];

	vm.avedaTree = Underscore.where(Tree, {ID: 'AvedaCatalogRoot'})[0] ? Underscore.where(Tree, {ID: 'AvedaCatalogRoot'})[0].children : null;

	vm.productSearchSelect = function(item) {
		vm.SelectedProduct = item;
		vm.showUnassignedProducts = false;
		vm.SelectedProduct.xp.ProductType ? makeCopy() : setDefaultProductType();
		if (vm.SelectedProduct.Description) vm.SelectedProduct.Description = $filter('productDescriptionKeywords')(vm.SelectedProduct.Description);

		function setDefaultProductType() {
			var backBarMaterialGroup2s = ['120', '150'];
			vm.SelectedProduct.xp.ProductType = vm.SelectedProduct.xp.MaterialGroup2 ? backBarMaterialGroup2s.indexOf(vm.SelectedProduct.xp.MaterialGroup2) > -1 ? 'Back Bar' : 'Retail' : 'Retail';
			makeCopy();
		}

		function makeCopy() {
			vm.SelectedProductCopy = angular.copy(vm.SelectedProduct);
		}
	};

	vm.searchProducts = function(searchTerm) {
		var opts = {search : searchTerm, page: 1, pageSize: 100};
		return OrderCloudSDK.Products.List(opts)
			.then(function(data) {
				return data.Items;
			})
	};

	vm.showUnassignedProducts = true;
	vm.unassignedProducts = UnassignedProducts;
	vm.showMarkdownSpecButton = Underscore.filter(vm.unassignedProducts, function(p) { return !p.HasMarkdownSpecs}).length > 0;
	vm.totalUnassignedProducts = UnassignedProducts.length;
	vm.currentUnassignedProductsPage = 1;

	vm.backToList = function() {
		$state.reload();
	};

	vm.selectOrderByColumn = function(column) {
		vm.searchResultsOrderBy = column;
		vm.searchResultsReverseSort = !vm.searchResultsReverseSort;
	};

	vm.undoChanges = function() {
		vm.SelectedProduct = angular.copy(vm.SelectedProductCopy);
		if (vm.SelectedProduct.Description) vm.SelectedProduct.Description = $filter('productDescriptionKeywords')(vm.SelectedProduct.Description);
	};

	vm.trackCategory = function(cat) {
		vm.ChangedCategories.push(cat);
	};

	vm.editCategoryAssignments = function() {
		var modalInstance = $uibModal.open({
			templateUrl: 'adminProducts/templates/adminProducts.categoryAssignment.tpl.html',
			controller: 'AdminProductsCategoryAssignmentModalCtrl',
			controllerAs: 'categoryAssignment',
			size: 'infoAssignment',
			resolve: {
				Tree: function() {
					return vm.avedaTree;
				},
				Product: function($q, OrderCloudSDK) {
					var deferred = $q.defer();
					var product = vm.SelectedProduct;
					var opts = {productID: product.ID, page : 1, pageSize:100};
					OrderCloudSDK.Categories.ListProductAssignments(catalogid, opts)
						.then(function(data) {
							product.AssignedCategories = Underscore.uniq(Underscore.pluck(data.Items, 'CategoryID'));
							deferred.resolve(product);
						});

					return deferred.promise;
				}
			}
		});

		modalInstance.result.then(
			function(data) {
				$rootScope.loading = {
					message: 'Updating category assignments'
				};
				$rootScope.loading.promise = AdminProductsService.UpdateCategoryAssignments(data.Product, data.Tree, data.OriginalCategories);
			},
			function() {
				angular.noop();
			}
		)
	};

	vm.saveProduct = function() {
		AdminProductsService.Update(vm.SelectedProduct)
			.then(function(product) {
				if (product.Description) product.Description = $filter('productDescriptionKeywords')(product.Description);
				vm.SelectedProduct = product;
				vm.SelectedProductCopy = angular.copy(vm.SelectedProduct);
				toastr.success(product.Name + ' was saved.', 'Success!');
			});
	};

	vm.assignMarkdownSpecs = function() {
		$rootScope.loading = {
			message: 'Assigning Markdown Specs'
		};
		$rootScope.loading.promise = AdminProductsService.AssignMarkdownSpecs().then(function() {
			vm.showMarkdownSpecButton = false;
		});
	};
}

function AdminProductsCategoryAssignmentModalController($uibModalInstance, Tree, Product) {
	var vm = this;
	vm.avedaTree = Tree;
	vm.selectedProduct = Product;
	vm.originalCategories = angular.copy(vm.selectedProduct.AssignedCategories);

	function analyzeCategory(cat) {
		cat.SelectedToAssign = vm.selectedProduct.AssignedCategories.indexOf(cat.ID) > -1;
		if (cat.children && cat.children.length) {
			angular.forEach(cat.children, function(c) {
				analyzeCategory(c);
			});
		}
	}

	angular.forEach(vm.avedaTree, function(cat) {
		analyzeCategory(cat);
	});

	vm.toggle = function(scope) {
		scope.toggle();
	};

	vm.treeOptions = {};

	vm.save = function(form) {
		if (form.$pristine) {
			$uibModalInstance.dismiss();
		}
		else {
			$uibModalInstance.close({Product: vm.selectedProduct, Tree: vm.avedaTree, OriginalCategories: vm.originalCategories});
		}
	};

	vm.cancel = function() {
		$uibModalInstance.dismiss();
	};
}