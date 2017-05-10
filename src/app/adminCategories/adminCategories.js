angular.module('orderCloud.adminCategories', [])
	.config(AdminCategoriesConfig)
	.controller('AdminCategoriesCtrl', AdminCategoriesController)
	.controller('CreateCategoryModalCtrl', CreateCategoryModalController)
	.controller('EditCategoryModalCtrl', EditCategoryModalController)
	.directive('categorytree', CategoryTree)
	.directive('categorynode', CategoryNode)
;

function AdminCategoriesConfig($stateProvider) {
	$stateProvider
		.state('base.adminCategories', {
			url: '/categories',
			data: {pageTitle: 'Administer Categories', loadingMessage: 'Loading Categories'},
			views: {
				'': {
					template: '<article id="AdminCategories" ui-view am-layout="vertical"></article>'
				},
				'@base.adminCategories': {
					templateUrl: 'adminCategories/templates/adminCategories.tpl.html',
					controller: 'AdminCategoriesCtrl',
					controllerAs: 'adminCategories',
					resolve: {
						Catalog: function(AvedaCategoryService) {
							return AvedaCategoryService.GetAllCategories();
						},
						Tree: function(AvedaCategoryService) {
							return AvedaCategoryService.GetCategoryTree();
						}
					}
				}
			}
		})
	;
}

function CategoryTree() {
	var obj = {
		restrict: 'E',
		replace: true,
		scope: {
			tree: '='
		},
		template: "<ul><categorynode ng-repeat='node in tree' node='node'></categorynode></ul>"
	};
	return obj;
}

function CategoryNode($compile) {
	var obj = {
		restrict: 'E',
		replace: true,
		scope: {
			node: '='
		},
		template: '<li><a ui-sref="base.adminCategories.edit({id:node.ID})" ng-bind-html="node.Name"></a></li>',
		link: function(scope, element) {
			if (angular.isArray(scope.node.children)) {
				element.append("<categorytree tree='node.children' />");
				$compile(element.contents())(scope);
			}
		}
	};
	return obj;
}

function AdminCategoriesController($state, $rootScope, $uibModal, Underscore, Catalog, Tree, AvedaCategoryService) {
	var vm = this;
	vm.catalog = Catalog;
	vm.avedaTree = Underscore.where(Tree, {ID: 'AvedaCatalogRoot'})[0] ? Underscore.where(Tree, {ID: 'AvedaCatalogRoot'})[0].children : null;

	vm.treeOptions = {
		dropped: function(event) {
			AvedaCategoryService.UpdateCategoryNode(event);
		}
	};

	vm.toggle = function(scope) {
		scope.toggle();
	};

	vm.createNewCategory = function() {
		var modalCreateInstance = $uibModal.open({
			templateUrl: 'adminCategories/templates/adminCategories.createModal.tpl.html',
			controller: 'CreateCategoryModalCtrl',
			controllerAs: 'createCategoryModal',
			size: 'category'
		});

		modalCreateInstance.result
			.then(function() {
				$state.reload();
			})
			.catch(function() {
				$state.reload();
			});
	};

	vm.editCategory = function(cat) {
		var modalEditInstance = $uibModal.open({
			templateUrl: 'adminCategories/templates/adminCategories.editModal.tpl.html',
			controller: 'EditCategoryModalCtrl',
			controllerAs: 'editCategoryModal',
			size: 'category',
			resolve: {
				EditCategory: function($q, AvedaCategoryService) {
					return editCategoryModalResolve($q, AvedaCategoryService, cat);
				}
			}
		});

		modalEditInstance.result
			.then(function() {
				$state.reload();
			})
			.catch(function() {
				$state.reload();
			});
	};

	function editCategoryModalResolve($q, AvedaCategoryService, cat) {
		var deferred = $q.defer();
		$rootScope.loading = {
			promise: deferred.promise,
			message: 'Loading product assignments'
		};

		AvedaCategoryService.GetCategoryAndProducts(cat.ID)
			.then(function(category) {
				category.Children = cat.children;
				deferred.resolve(category);
			});

		return deferred.promise;
	}
}

function CreateCategoryModalController($uibModalInstance, Underscore, OrderCloudSDK, AvedaCategoryService) {
	var vm = this;
	vm.categoryProducts = [];

	vm.newCategory = {
		ID: null,
		Name: null,
		Description: null,
		ListOrder: null,
		Active: true,
		ParentID: 'AvedaCatalogRoot'
	};

	vm.createNewCategory = function() {
		vm.newCategory.ID = vm.newCategory.Name.replace(/ /g,'');
		vm.modalLoading = {
			message: 'Creating category'
		};
		vm.modalLoading.promise = AvedaCategoryService.CreateCategoryAndProductAssignments(vm.newCategory, vm.categoryProducts)
			.then(function() {
				$uibModalInstance.close();
			})
			.catch(function() {
				$uibModalInstance.dismiss();
			});
	};

	vm.cancelCreate = function() {
		$uibModalInstance.close();
	};

	vm.searchingProducts = false;
	vm.searchProducts = function(searchTerm) {
		if (!searchTerm || searchTerm.length < 3) return;

		vm.searchingProducts = true;
		var assignedProductIDs = Underscore.pluck(vm.categoryProducts, 'ID');
		var opts = {search: searchTerm, page: 1, pageSize: 25};
		OrderCloudSDK.Products.List(opts)
			.then(function(data) {
				vm.searchResults = [];
				vm.searchingProducts = false;
				angular.forEach(data.Items, function(item) {
					if (assignedProductIDs.indexOf(item.ID) == -1) {
						vm.searchResults.push(item);
					}
				});
			});
	};

	vm.addProducts = function() {
		var selectedProductIDs = Underscore.pluck(vm.selectedAvailableProducts, 'ID');
		angular.forEach(vm.searchResults, function(product, index) {
			if (selectedProductIDs.indexOf(product.ID) > -1) {
				vm.searchResults.splice(index, 1);
				vm.categoryProducts.push(product);
			}
		});
	};

	vm.removeProducts = function() {
		var selectedProductIDs = Underscore.pluck(vm.selectedCategoryProducts, 'ID');
		angular.forEach(vm.categoryProducts, function(product, index) {
			if (selectedProductIDs.indexOf(product.ID) > -1) {
				vm.categoryProducts.splice(index, 1);
			}
		});
	};

}

function EditCategoryModalController($state, $uibModalInstance, Underscore, toastr, OrderCloudSDK, AvedaCategoryService, EditCategory, buyerid) {
	var vm = this;

	vm.selectedCategory = EditCategory;
	vm.originalName = angular.copy(vm.selectedCategory.Name);
	vm.categoryProducts = angular.copy(vm.selectedCategory.Products);

	vm.cancel = function() {
		$uibModalInstance.dismiss();
	};

	vm.saveCategory = function() {
		vm.modalLoading = {
			message: 'Saving category'
		};
		vm.modalLoading.promise = AvedaCategoryService.UpdateCategoryAndProductAssignments(vm.selectedCategory, vm.categoryProducts)
			.then(function(data) {
				$uibModalInstance.close();
			})
			.catch(function(ex) {
				$uibModalInstance.dismiss(ex);
			});
	};

	vm.deleteCategory = function() {
		if (vm.selectedCategory.Children && vm.selectedCategory.Children.length > 0) {
			var warning = 'Deleting ' + vm.selectedCategory.Name + ' will delete the following child categories: \r\n';
			var deleteChildren = [];
			function listChildren(children, level) {
				angular.forEach(children, function(child) {
					child.Level = level;
					deleteChildren.push(child);
					warning += child.Name + ', ';
					if (child.children) listChildren(child.children, child.Level + 1);
				});
			}
			listChildren(vm.selectedCategory.Children, 1);
			warning = warning.slice(0, -2);
			var c = confirm(warning);
			if (c) {
				AvedaCategoryService.DeleteParentAndChildren(vm.selectedCategory, deleteChildren)
					.then(function() {
						$uibModalInstance.close();
						toastr.success(vm.selectedCategory.Name + ' and its children were deleted.', 'Success!');
						$state.reload();
					});
			}
		}
		else {
			OrderCloudSDK.Categories.Delete(buyerid, vm.selectedCategory.ID)
				.then(function() {
					$uibModalInstance.close();
					toastr.success(vm.selectedCategory.Name + ' was deleted.', 'Success!');
					$state.reload();
				});
		}
	};

	vm.searchingProducts = false;
	vm.searchProducts = function(searchTerm) {
		if (!searchTerm || searchTerm.length < 3) return;

		vm.searchingProducts = true;
		var assignedProductIDs = Underscore.pluck(vm.categoryProducts, 'ID');
		var opts = {search: searchTerm, page: 1, pageSize:25};
		OrderCloudSDK.Products.List(opts)
			.then(function(data) {
				vm.searchResults = [];
				vm.searchingProducts = false;
				angular.forEach(data.Items, function(item) {
					if (assignedProductIDs.indexOf(item.ID) == -1) {
						vm.searchResults.push(item);
					}
				});
			});
	};

	vm.addProducts = function() {
		var selectedProductIDs = Underscore.pluck(vm.selectedAvailableProducts, 'ID');
		angular.forEach(vm.searchResults, function(product, index) {
			if (selectedProductIDs.indexOf(product.ID) > -1) {
				vm.searchResults.splice(index, 1);
				vm.categoryProducts.push(product);
			}
		});
	};

	vm.removeProducts = function() {
		var selectedProductIDs = Underscore.pluck(vm.selectedCategoryProducts, 'ID');
		angular.forEach(vm.categoryProducts, function(product, index) {
			if (selectedProductIDs.indexOf(product.ID) > -1) {
				vm.categoryProducts.splice(index, 1);
			}
		});
	};
}