angular.module('orderCloud.adminNews', [])

	.config(AdminNewsConfig)
	.factory('AdminNewsService', AdminNewsService)
	.controller('AdminNewsListCtrl', AdminNewsListController)
	.controller('AdminNewsDetailCtrl', AdminNewsDetailController)
	.controller('AdminNewsCreateCtrl', AdminNewsCreateController)
	.controller('NewsAssignmentModalCtrl', NewsAssignmentModalController)
;

function AdminNewsConfig($stateProvider) {
	$stateProvider
		.state('base.adminNews', {
			url: '/news',
			data:{pageTitle: 'Administer News', loadingMessage: 'Loading News Articles'},
			views: {
				'': {
					template: '<article id="AdminNews" ui-view am-layout="vertical"></article>'
				},
				'@base.adminNews': {
					templateUrl: 'adminNews/templates/adminNews.list.tpl.html',
					controller: 'AdminNewsListCtrl',
					controllerAs: 'adminNewsList',
					resolve: {
						NewsArticles: function (AdminNewsService) {
							return AdminNewsService.List()
								.then(function(articles) {
									return articles;
								});
						}
					}
				}
			}
		})
		.state('base.adminNews.create', {
			url: '/create',
			templateUrl:'adminNews/templates/adminNews.create.tpl.html',
			controller: 'AdminNewsCreateCtrl',
			controllerAs: 'adminNewsCreate'
		})
		.state('base.adminNews.detail', {
			url: '/:id',
			params: {editing: false},
			templateUrl: 'adminNews/templates/adminNews.detail.tpl.html',
			controller: 'AdminNewsDetailCtrl',
			controllerAs: 'adminNewsDetail',
			data: {loadingMessage: 'Loading Article'},
			resolve: {
				NewsItem: function($state, $stateParams, AdminNewsService) {
					return AdminNewsService.Get($stateParams.id)
						.then(function(article) {
							return article;
						})
						.catch(function() {
							$state.go('base.adminNews');
						});
				}
			}
		})
	;
}

function AdminNewsService($q, AzureService) {
	var service = {
		Get: _get,
		List: _list,
		Create: _create,
		Update: _update,
		Delete: _delete
	};

	function _get(id) {
		var deferred = $q.defer();

		AzureService.News.Get(id)
			.then(function(data) {
				deferred.resolve(data.Data);
			})
			.catch(function(ex) {
				deferred.reject(ex);
			});

		return deferred.promise;
	}

	function _list() {
		var deferred = $q.defer();

		AzureService.News.List()
			.then(function(data) {
				deferred.resolve(data.Data);
			})
			.catch(function(ex) {
				deferred.reject(ex);
			});

		return deferred.promise;
	}

	function _create(article, regions, salonTypes) {
		var deferred = $q.defer();

		article.Timestamp = new Date().getTime();

		article.Assignments.Regions = [];
		angular.forEach(regions, function(region) {
			if (region.Selected) {
				article.Assignments.Regions.push(region);
			}
		});
		article.Assignments.SalonTypes = [];
		angular.forEach(salonTypes, function(type) {
			if (type.Selected) {
				article.Assignments.SalonTypes.push(type);
			}
		});

		AzureService.News.Create(article)
			.then(function(data) {
				deferred.resolve(data.Data);
			})
			.catch(function(ex) {
				deferred.reject(ex);
			});

		return deferred.promise;
	}

	function _update(article, regions, salonTypes) {
		var deferred = $q.defer();

		article.Assignments.Regions = [];
		angular.forEach(regions, function(region) {
			if (region.Selected) {
				article.Assignments.Regions.push(region);
			}
		});
		article.Assignments.SalonTypes = [];
		angular.forEach(salonTypes, function(type) {
			if (type.Selected) {
				article.Assignments.SalonTypes.push(type);
			}
		});

		AzureService.News.Update((article.id || article.ID), article)
			.then(function(data) {
				deferred.resolve(data.Data);
			})
			.catch(function(ex) {
				deferred.reject(ex);
			});

		return deferred.promise;
	}

	function _delete(article) {
		var deferred = $q.defer();

		AzureService.News.Delete((article.id || article.ID))
			.then(function(data) {
				deferred.resolve(data);
			})
			.catch(function(ex) {
				deferred.reject(ex);
			});

		return deferred.promise;
	}

	return service;
}

function AdminNewsListController(NewsArticles) {
	var vm = this;
	vm.articles = NewsArticles;
}

function AdminNewsDetailController($state, $stateParams, $uibModal, NewsItem, AdminNewsService) {
	var vm = this;
	vm.editing = $stateParams.editing;

	vm.article = {
		id: NewsItem.id,
		Timestamp: NewsItem.Timestamp,
		Title: NewsItem.Title,
		Body: NewsItem.Body,
		Files: NewsItem.Files,
		Assignments: NewsItem.Assignments
	};

	if (vm.editing) {
		vm.item = angular.copy(vm.article);
	}
	vm.toggleEdit = function() {
		if ($stateParams.editing) {
			$state.go('base.adminNews');
		} else {
			vm.item = angular.copy(vm.article);
			vm.editing = !vm.editing;
		}
	};

	vm.update = function() {
		var modalInstance = $uibModal.open({
			templateUrl: 'adminNews/templates/adminNews.assignment.tpl.html',
			controller: 'NewsAssignmentModalCtrl',
			controllerAs: 'newsAssignment',
			size: 'infoAssignment',
			resolve: {
				NewsArticle: function() {
					return vm.item;
				},
				Hierarchy: function(AvedaHierarchy) {
					return AvedaHierarchy.Get();
				},
				CreateOrEdit: function() {
					return 'Edit';
				}
			}
		});

		modalInstance.result.then(function() {
			vm.editing = false;
		});
	};

	vm.delete = function() {
		AdminNewsService.Delete(vm.article)
			.then(function() {
				$state.go('base.adminNews', {}, {reload:true});
			});
	};
}

function AdminNewsCreateController($uibModal) {
	var vm = this;

	vm.article = {
		id: randomString(),
		Title: null,
		Body: null,
		Files: [],
		Timestamp: new Date().getTime(),
		Assignments: {
			AllUsers: true,
			Internal: false,
			External: false,
			Regions: [],
			SalonTypes: []
		}
	};

	vm.submit = function() {
		var modalInstance = $uibModal.open({
			templateUrl: 'adminNews/templates/adminNews.assignment.tpl.html',
			controller: 'NewsAssignmentModalCtrl',
			controllerAs: 'newsAssignment',
			size: 'infoAssignment',
			resolve: {
				NewsArticle: function() {
					return vm.article;
				},
				Hierarchy: function(AvedaHierarchy) {
					return AvedaHierarchy.Get();
				},
				CreateOrEdit: function() {
					return 'Create';
				}
			}
		});
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
}

function NewsAssignmentModalController($state, $uibModalInstance, AdminNewsService, NewsArticle, Hierarchy, CreateOrEdit) {
	var vm = this;
	vm.article = NewsArticle;
	vm.regions = Hierarchy.Regions;
	vm.salonTypes = Hierarchy.SalonTypes;

	vm.close = function() {
		$uibModalInstance.dismiss();
	};

	vm.save = function() {
		if (CreateOrEdit == 'Create') {
			AdminNewsService.Create(vm.article, vm.regions, vm.salonTypes)
				.then(function(data) {
					$uibModalInstance.close();
					$state.go('base.adminNews.detail', {id: data.id});
				})
				.catch(function(error) {
					$uibModalInstance.close();
					console.log(error);
				});
		}
		else if (CreateOrEdit == 'Edit') {
			AdminNewsService.Update(vm.article, vm.regions, vm.salonTypes)
				.then(function() {
					$uibModalInstance.close();
					$state.reload();
				})
				.catch(function() {
					$uibModalInstance.close();
					$state.reload();
				});
		}
	};

	vm.allUsersToggle = function(allUsers) {
		if (allUsers) {
			vm.article.Assignments.Internal = false;
			vm.article.Assignments.External = false;
			vm.article.Assignments.Regions = [];
			angular.forEach(vm.regions, function(region) {
				region.Selected = false;
			});
			vm.article.Assignments.SalonTypes = [];
			angular.forEach(vm.salonTypes, function(type) {
				type.Selected = false;
			});
		}
	};
	vm.allUsersToggle(vm.article.Assignments.AllUsers);

	vm.internalUsersToggle = function(internalUsers) {
		if (internalUsers) {
			vm.article.Assignments.Internal = true;
			vm.article.Assignments.External = false;
			vm.article.Assignments.Regions = [];
			angular.forEach(vm.regions, function(region) {
				region.Selected = false;
			});
			vm.article.Assignments.SalonTypes = [];
			angular.forEach(vm.salonTypes, function(type) {
				type.Selected = false;
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
	}
	clearAllAssignments();

	if (vm.article.Assignments.Regions) {
		angular.forEach(vm.regions, function(r) {
			angular.forEach(vm.article.Assignments.Regions, function(region) {
				if (region.ID == r.ID) {
					r.Selected = true;
				}
			});
		});
	}
	if (vm.article.Assignments.SalonTypes) {
		angular.forEach(vm.salonTypes, function(t) {
			angular.forEach(vm.article.Assignments.SalonTypes, function(type) {
				if (type.Type == t.Type) {
					t.Selected = true;
				}
			});
		});
	}
}