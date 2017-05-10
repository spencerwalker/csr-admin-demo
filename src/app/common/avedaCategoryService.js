angular.module('orderCloud.avedaCategories', [])
	.factory('AvedaCategoryService', AvedaCategoryService)
;

function AvedaCategoryService($q, Underscore, OrderCloudSDK, AvedaFilesService, catalogid, buyerid) {
	var service = {
		GetAllCategories: _getAllCategories,
		GetProductCategories: _get,
		GetCategoryTree: _tree,
		UpdateCategoryNode: _updateCategoryNode,
		GetCategoryAndProducts: _getCategoryAndProducts,
		GetAvailableProductsForCategory: _getAvailableProductsForCategory,
		CreateCategoryAndProductAssignments: _createCategoryAndProductAssignments,
		UpdateCategoryAndProductAssignments: _updateCategoryAndProductAssignments,
		DeleteParentAndChildren: _deleteParentAndChildren
	};

	function _getAllCategories() {
		var deferred = $q.defer();
		var categories = [];
		var queue = [];
		var opts = { page: 1, pageSize: 100, depth: 'all'};

		OrderCloudSDK.Categories.List(catalogid, opts)
				.then(function(data) {
					categories = categories.concat(data.Items);
					for (var i = 2; i <= data.Meta.TotalPages; i++) {
						opts.page = i;
						queue.push(OrderCloudSDK.Categories.List(catalogid, opts));
					}

					$q.all(queue).then(function(results) {
						angular.forEach(results, function(result) {
							categories = categories.concat(result.Items);
						});
						deferred.resolve(categories);
					})
				});

		return deferred.promise;
	}

	function _get(id, categories) {
		var opts = {productid: id};
		return OrderCloudSDK.Categories.ListProductAssignments(catalogid, opts).then(function (list) {
			angular.forEach(categories, function (cat) {
				cat.Selected = false;
				angular.forEach(Underscore.where(list.Items, { CategoryID: cat.ID }), function() {
					cat.Selected = true;
				});
			});
		});
	}

	function _tree() {
		var tree = [];
		var categories = [];
		var deferred = $q.defer();
		var queue = [];
        var opts = { page: 1, pageSize: 100, depth: 'all'};

		OrderCloudSDK.Categories.List(catalogid, opts).then(function(data) {
			categories = categories.concat(data.Items);
			for (var i = 2; i <= data.Meta.TotalPages; i++) {
				opts.page = i;
				queue.push(OrderCloudSDK.Categories.List(catalogid, opts));
			}

			$q.all(queue).then(function(results) {
				angular.forEach(results, function(result) {
					categories = categories.concat(result.Items);
				});

				angular.forEach(Underscore.where(categories, { ParentID: null}), function(node) {
					tree.push(_getnode(node));
				});

				function _getnode(node) {
					var children = Underscore.where(categories, { ParentID: node.ID});
					if (children.length > 0) {
						node.children = children;
						angular.forEach(children, function(child) {
							return _getnode(child);
						});
					} else {
						node.children = [];
					}
					return node;
				}

				deferred.resolve(tree);
			});
		});
		return deferred.promise;
	}

	function _updateCategoryNode(event) {
		var sourceParentNodeList = event.source.nodesScope.$modelValue,
			destParentNodeList = event.dest.nodesScope.$modelValue,
			masterDeferred = $q.defer();

		updateNodeList(destParentNodeList).then(function() {
			if (sourceParentNodeList != destParentNodeList) {
				if (sourceParentNodeList.length) {
					updateNodeList(sourceParentNodeList).then(function() {
						updateParentID().then(function() {
							masterDeferred.resolve();
						});
					});
				} else {
					updateParentID().then(function() {
						masterDeferred.resolve();
					});
				}
			}
		});

		function updateNodeList(nodeList) {
			var deferred = $q.defer(),
				nodeQueue = [];
			angular.forEach(nodeList,function(cat, index) {
				nodeQueue.push((function() {
					return OrderCloudSDK.Categories.Patch(catalogid, cat.ID, {ListOrder: index});
				}));
			});

			var queueIndex = 0;
			function run(i) {
				nodeQueue[i]().then(function() {
					queueIndex++;
					if (queueIndex < nodeQueue.length) {
						run(queueIndex);
					} else {
						deferred.resolve();
					}
				});
			}
			run(queueIndex);

			return deferred.promise;
		}

		function updateParentID() {
			var deferred = $q.defer(),
				parentID;

			if (event.dest.nodesScope.node) {
				parentID = event.dest.nodesScope.node.ID;
			} else {
				parentID = 'AvedaCatalogRoot';
			}
			OrderCloudSDK.Categories.Patch(catalogid,event.source.nodeScope.node.ID, {ParentID: parentID})
				.then(function() {
					deferred.resolve();
				});
			return deferred.promise;
		}

		return masterDeferred.promise;
	}

	function _getCategoryAndProducts(catID) {
		var deferred = $q.defer();
		var category;
		var page = 1;

		OrderCloudSDK.Categories.Get(catalogid, catID)
			.then(function(data) {
				category = data;
				category.ProductAssignments = [];
				category.Products = [];
				gatherProducts(page);
			});

		function gatherProducts(pg) {
            var opts = { page: pg, pageSize: 100, categoryID: catID};
			OrderCloudSDK.Categories.ListProductAssignments(catalogid, opts)
				.then(function(data) {
					category.ProductAssignments = category.ProductAssignments.concat(data.Items);
					if (data.Meta.TotalPages > data.Meta.Page) {
						page++;
						gatherProducts(page);
					} else {
						getProductObjects();
					}
				});
		}

		function getProductObjects() {
			var queue = [];

			angular.forEach(category.ProductAssignments, function(a) {
				queue.push((function() {
					var d = $q.defer();

					OrderCloudSDK.Products.Get(a.ProductID).then(function(product) {
						category.Products.push(product);
						d.resolve();
					});

					return d.promise;
				})());
			});

			$q.all(queue).then(function() {
				deferred.resolve(category);
			});
		}

		return deferred.promise;
	}

	function _getAvailableProductsForCategory(category) {
		var deferred = $q.defer();
		var availableProducts = [];

		var allProducts = [];
		var productPage = 1;
		function gatherAllProducts(page) {
			var opts = {page: page, pageSize: 100};
			OrderCloudSDK.Products.List(opts)
				.then(function(data) {
					allProducts = allProducts.concat(data.Items);
					if (data.Meta.TotalPages > data.Meta.Page) {
						productPage++;
						gatherAllProducts(productPage);
					} else {
						filterProducts(allProducts);
					}
				});
		}
		gatherAllProducts(productPage);

		function filterProducts(allProducts) {
			var availableProducts = [];
			var categoryProductIDs = Underscore.map(category.Products, function(p) { return p.ID; });
			angular.forEach(allProducts, function(product) {
				if (categoryProductIDs.indexOf(product.ID) == -1) {
					availableProducts.push(product);
				}
			});
			deferred.resolve(availableProducts);
		}

		return deferred.promise;
	}

	function _createCategoryAndProductAssignments(category, categoryProducts) {
		var deferred = $q.defer();
		if (category.Image && category.Image.File) {
			saveImage();
		} else {
			createCategory();
		}

		function saveImage() {
			AvedaFilesService.Upload(category.Image.File)
				.then(function(imgData) {
                    if (category.xp) {
                        category.xp.Image = {
                            ID: imgData.Key,
                            URL: imgData.Location
                        };
                    }
                    else {
                        category.xp = {
                            Image: {
                                ID: imgData.Key,
                                URL: imgData.Location
                            }
                        }
                    }
					createCategory();
				});
		}

		function createCategory() {
			OrderCloudSDK.Categories.Create(catalogid, category)
				.then(assignCategory);
		}

		function assignCategory(cat) {
			var assignment = {
				BuyerID: buyerid,
				CategoryID: cat.ID
			};
			OrderCloudSDK.Categories.SaveAssignment(catalogid, assignment)
				.then(assignProducts(cat));
		}

		function assignProducts(cat) {
			var queue = [];
			angular.forEach(categoryProducts, function(p) {
				queue.push((function() {
					var d = $q.defer();

					var assignment = {
						CategoryID: cat.ID,
						ProductID: p.ID
					};
					OrderCloudSDK.Categories.SaveProductAssignment(catalogid, assignment).then(function() {
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

	function _updateCategoryAndProductAssignments(category, categoryProducts) {
		var deferred = $q.defer();

		if (category.ImageUpdated) {
			updateImage();
		}
		else {
			updateCategory();
		}

		function updateImage() {
			AvedaFilesService.Upload(category.Image.File)
				.then(function(imgData) {
                    if (category.xp) {
                        category.xp.Image = {
                            ID: imgData.Key,
                            URL: imgData.Location
                        };
                    }
                    else {
                        category.xp = {
                            Image: {
                                ID: imgData.Key,
                                URL: imgData.Location
                            }
                        }
                    }
					updateCategory();
				});
		}

		function updateCategory() {
			OrderCloudSDK.Categories.Update(catalogid, category.ID, category)
				.then(function(data) {
					updateProductAssignments();
				});
		}

		function updateProductAssignments() {
			var queue = [];

			var originalCategoryProductIDs = Underscore.map(category.Products, function(p) { return p.ID; });
			var newCategoryProductIDs = Underscore.map(categoryProducts, function(p) { return p.ID; });

			var productsToAdd = Underscore.difference(newCategoryProductIDs, originalCategoryProductIDs);
			var productsToRemove = Underscore.difference(originalCategoryProductIDs, newCategoryProductIDs);

			angular.forEach(productsToAdd, function(p) {
				queue.push((function() {
					var d = $q.defer();

					var assignment = {
						CategoryID: category.ID,
						ProductID: p
					};
					OrderCloudSDK.Categories.SaveProductAssignment(catalogid, assignment).then(function() {
						d.resolve();
					});

					return d.promise;
				})());
			});

			angular.forEach(productsToRemove, function(p) {
				queue.push((function() {
					var d = $q.defer();

					OrderCloudSDK.Categories.DeleteProductAssignment(catalogid, category.ID, p).then(function() {
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

	function _deleteParentAndChildren(parentCat, childrenCats) {
		var deferred = $q.defer();

		function compare(a,b) {
			if (a.Level > b.Level)
				return -1;
			if (a.Level < b.Level)
				return 1;
			return 0;
		}

		function deleteParent() {
			OrderCloudSDK.Categories.Delete(catalogid, catalogid, parentCat.ID)
				.then(function() {
					deferred.resolve();
				});
		}

		var deleteChildren = childrenCats.sort(compare);
		var queueIndex = 0;
		var queueLength = deleteChildren.length;

		function deleteChild(i) {
			OrderCloudSDK.Categories.Delete(catalogid, deleteChildren[i].ID)
				.then(function() {
					queueIndex++;
					if (queueIndex < queueLength) {
						deleteChild(queueIndex);
					}
					else {
						deleteParent();
					}
				});
		}
		deleteChild(queueIndex);

		return deferred.promise;
	}

	return service;
}