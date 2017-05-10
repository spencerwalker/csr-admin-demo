angular.module('orderCloud.adminUpdates', [])
	.config(AdminUpdatesConfig)
	.factory('AdminUpdatesService', AdminUpdatesService)
	.controller('AdminUpdatesListCtrl', AdminUpdatesListController)
	.controller('UpdateAssignmentModalCtrl', UpdateAssignmentModalController)
;

function AdminUpdatesConfig($stateProvider) {
	$stateProvider
		.state('base.adminUpdates', {
			url: '/updates',
			data:{pageTitle: 'Administer Updates', loadingMessage: 'Loading All Updates'},
			views: {
				'': {
					template: '<article id="AdminUpdates" ui-view am-layout="vertical"></article>'
				},
				'@base.adminUpdates': {
					templateUrl: 'adminUpdates/templates/adminUpdates.list.tpl.html',
					resolve: {
						Updates: function(AdminUpdatesService) {
							return AdminUpdatesService.List()
								.then(function(updates) {
									return updates;
								});
						}
					},
					controller: 'AdminUpdatesListCtrl',
					controllerAs: 'adminUpdatesList'
				}
			}
		})
	;
}

function AdminUpdatesService($q, AzureService) {
	var service = {
		Get: _get,
		List: _list,
		Create: _create,
		Update: _update,
		UpdateBody: _updateBody,
		Delete: _delete
	};

	function _get(id) {
		var deferred = $q.defer();

		AzureService.Updates.Get(id)
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

		AzureService.Updates.List()
			.then(function(data) {
				deferred.resolve(data.Data);
			})
			.catch(function(ex) {
				deferred.reject(ex);
			});

		return deferred.promise;
	}

	function _create(update, regions, salonTypes, plants) {
		var deferred = $q.defer();

		update.Timestamp = new Date().getTime();

		update.Assignments.Regions = [];
		angular.forEach(regions, function(region) {
			if (region.Selected) {
				update.Assignments.Regions.push(region);
			}
		});
		update.Assignments.SalonTypes = [];
		angular.forEach(salonTypes, function(type) {
			if (type.Selected) {
				update.Assignments.SalonTypes.push(type);
			}
		});
		update.Assignments.Plants = [];
		angular.forEach(plants, function(plant) {
			if (plant.Selected) {
				update.Assignments.Plants.push(plant);
			}
		});

		AzureService.Updates.Create(update)
			.then(function(data) {
				deferred.resolve(data.Data);
			})
			.catch(function(ex) {
				deferred.reject(ex);
			});

		return deferred.promise;
	}

	function _update(update, regions, salonTypes, plants) {
		var deferred = $q.defer();

		update.Assignments.Regions = [];
		angular.forEach(regions, function(region) {
			if (region.Selected) {
				update.Assignments.Regions.push(region);
			}
		});
		update.Assignments.SalonTypes = [];
		angular.forEach(salonTypes, function(type) {
			if (type.Selected) {
				update.Assignments.SalonTypes.push(type);
			}
		});
		update.Assignments.Plants = [];
		angular.forEach(plants, function(plant) {
			if (plant.Selected) {
				update.Assignments.Plants.push(plant);
			}
		});

		update.Editing = false;

		AzureService.Updates.Update((update.id || update.ID), update)
			.then(function(data) {
				deferred.resolve(data.Data);
			})
			.catch(function(ex) {
				deferred.reject(ex);
			});

		return deferred.promise;
	}

	function _updateBody(update) {
		var deferred = $q.defer();

		update.Body = update.NewBody;
		update.Timestamp = new Date().getTime();

		update.Editing = false;

		AzureService.Updates.Update((update.id || update.ID), update)
			.then(function(data) {
				deferred.resolve(data.Data);
			})
			.catch(function(ex) {
				deferred.reject(ex);
			});

		return deferred.promise;
	}

	function _delete(update) {
		var deferred = $q.defer();

		AzureService.Updates.Delete((update.id || update.ID))
			.then(function(data) {
				deferred.resolve(data.Data);
			})
			.catch(function(ex) {
				deferred.reject(ex);
			});

		return deferred.promise;
	}

	return service;
}

function AdminUpdatesListController($state, $uibModal, Underscore, Updates, AdminUpdatesService) {
	var vm = this;
	vm.updates = Updates;
	vm.newUpdateBody = null;

	vm.deleteUpdate = function(updateID) {
		AdminUpdatesService.Get(updateID).then(function(update) {
			AdminUpdatesService.Delete(update).then(function() {
				$state.reload();
			});
		});
	};

	vm.createNewUpdate = function() {
		vm.update = {
			id: randomString,
			Body: vm.newUpdateBody,
			Assignments: {
				AllUsers: true,
				Internal: true,
				External: true,
				Regions: [],
				SalonTypes: [],
				Plants: []
			}
		};

		var modalInstance = $uibModal.open({
			templateUrl: 'adminUpdates/templates/adminUpdates.assignment.tpl.html',
			controller: 'UpdateAssignmentModalCtrl',
			controllerAs: 'updateAssignment',
			size: 'infoAssignment',
			resolve: {
				UpdateItem: function() {
					return vm.update;
				},
				Hierarchy: function(AvedaHierarchy) {
					return AvedaHierarchy.Get();
				},
				CreateOrEdit: function() {
					return 'Create';
				}
			}
		});

		modalInstance.result.then(function(result) {
			$state.reload();
		}, function(error) {
			$state.reload();
		});
	};

	vm.editItem = function(scope) {
		scope.item.NewBody = angular.copy(scope.item.Body);
		angular.forEach(Underscore.where(vm.updates, {Editing: true}), function(i) {
			i.Editing = false;
		});
		scope.item.Editing = true;
	};

	vm.updateItem = function(update) {
		AdminUpdatesService.UpdateBody(update)
			.then(function() {
				$state.reload();
			})
			.catch(function(error) {
				$state.reload();
			});
	};

	vm.editAssignments = function(id) {
		var modalInstance = $uibModal.open({
			templateUrl: 'adminUpdates/templates/adminUpdates.assignment.tpl.html',
			controller: 'UpdateAssignmentModalCtrl',
			controllerAs: 'updateAssignment',
			size: 'infoAssignment',
			resolve: {
				UpdateItem: function(AdminUpdatesService) {
					return AdminUpdatesService.Get(id)
						.then(function(update) {
							return update;
						})
						.catch(function() {
							$state.go('base.adminUpdates');
						})
				},
				Hierarchy: function(AvedaHierarchy) {
					return AvedaHierarchy.Get();
				},
				CreateOrEdit: function() {
					return 'Edit';
				}
			}
		});

		modalInstance.result.then(function(result) {
			$state.reload();
		}, function(error) {
			$state.reload();
		})
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

function UpdateAssignmentModalController($uibModalInstance, AdminUpdatesService, UpdateItem, Hierarchy, CreateOrEdit) {
	var vm = this;
	vm.update = UpdateItem;
	vm.regions = Hierarchy.Regions;
	vm.salonTypes = Hierarchy.SalonTypes;
	vm.plants = Hierarchy.Plants;

	vm.cancel = function() {
		$uibModalInstance.dismiss();
	};

	vm.save = function() {
		if (CreateOrEdit == 'Create') {
			AdminUpdatesService.Create(vm.update, vm.regions, vm.salonTypes, vm.plants)
				.then(function(id) {
					$uibModalInstance.close('Success');
				})
				.catch(function(error) {
					$uibModalInstance.dismiss(error);
				});
		}
		else if (CreateOrEdit == 'Edit') {
			AdminUpdatesService.Update(vm.update, vm.regions, vm.salonTypes, vm.plants)
				.then(function() {
					$uibModalInstance.close('Success');
				})
				.catch(function(error) {
					$uibModalInstance.dismiss(error);
				});
		}
	};

	vm.allUsersToggle = function(allUsers) {
		if (allUsers) {
			vm.update.Assignments.Internal = false;
			vm.update.Assignments.External = false;
			vm.update.Assignments.Regions = [];
			angular.forEach(vm.regions, function(region) {
				region.Selected = false;
			});
			vm.update.Assignments.SalonTypes = [];
			angular.forEach(vm.salonTypes, function(type) {
				type.Selected = false;
			});
			vm.update.Assignments.Plants = [];
			angular.forEach(vm.plants, function(plant) {
				plant.Selected = false;
			});
		}
	};
	vm.allUsersToggle(vm.update.Assignments.AllUsers);

	vm.internalUsersToggle = function(internalUsers) {
		if (internalUsers) {
			vm.update.Assignments.AllUsers = false;
			vm.update.Assignments.Internal = true;
			vm.update.Assignments.External = false;
			vm.update.Assignments.Regions = [];
			angular.forEach(vm.regions, function(region) {
				region.Selected = false;
			});
			vm.update.Assignments.SalonTypes = [];
			angular.forEach(vm.salonTypes, function(type) {
				type.Selected = false;
			});
			vm.update.Assignments.Plants = [];
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

	if (vm.update.Assignments.Regions) {
		angular.forEach(vm.regions, function(r) {
			angular.forEach(vm.update.Assignments.Regions, function(region) {
				if (region.ID == r.ID) {
					r.Selected = true;
				}
			});
		});
	}
	if (vm.update.Assignments.SalonTypes) {
		angular.forEach(vm.salonTypes, function(t) {
			angular.forEach(vm.update.Assignments.SalonTypes, function(type) {
				if (type.Type == t.Type) {
					t.Selected = true;
				}
			});
		});
	}
	if (vm.update.Assignments.Plants) {
		angular.forEach(vm.plants, function(p) {
			angular.forEach(vm.update.Assignments.Plants, function(plant) {
				if (plant.Plant == p.Plant) {
					p.Selected = true;
				}
			});
		});
	}
}
