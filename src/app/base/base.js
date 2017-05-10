angular.module('orderCloud.base', ['ui.router'])
	.config(BaseConfig)
	.controller('BaseCtrl', BaseController)
;

function BaseConfig($stateProvider) {
	$stateProvider.state('base', {
		abstract: true,
		url: '',
		resolve: {
            isAuthenticated: function($state, $localForage, OrderCloudSDK, LoginService) {
                return OrderCloudSDK.Me.Get()
                    .then(function(me) {
                        return me ;
                    })
                    .catch(function(){
                        LoginService.Logout();
                        return false;
                    });
            },
			CurrentUser: function($state, isAuthenticated) {
                return isAuthenticated;
			}
		},
		views: {
			'': {
				templateUrl: 'base/templates/base.tpl.html',
				controller: 'BaseCtrl',
				controllerAs: 'base'
			},
			'top@base': {
				templateUrl: 'base/templates/base.top.tpl.html'
			},
			'left@base': {
				templateUrl: 'base/templates/base.left.tpl.html'
			},
			'right@base': {
				templateUrl: 'base/templates/base.right.tpl.html'
			},
			'bottom@base': {
				templateUrl: 'base/templates/base.bottom.tpl.html'
			}
		}
	});
}

function BaseController($state, $localForage, $timeout, LoginService, CurrentUser) {
	var vm = this;
	vm.currentUser = CurrentUser;
	vm.swiped = 'none';
	vm.showMobileSearch = false;
	vm.searchType = 'News';

	vm.searchTypes = ['News', 'Updates'];

	vm.setSearchType = function(type) {
		vm.searchType = type;
	};

	vm.drawers = {
		left: false,
		right: false
	};

	vm.onDropdownToggle = function() {
		vm.showMobileSearch = false;
		vm.closeDrawers();
	};

	vm.toggleSearch = function() {
		vm.closeDrawers();
		vm.showMobileSearch = !vm.showMobileSearch;
	};

	vm.toggleDrawer = function(drawer) {
		vm.showMobileSearch = false;
		angular.forEach(vm.drawers, function(value, key) {
			if (key != drawer) vm.drawers[key] = false;
		});
		vm.drawers[drawer] = !vm.drawers[drawer];
	};

	vm.logout = function() {
		vm.currentUser = {};
		LoginService.Logout();
	};

	vm.closeDrawers = function() {
		angular.forEach(vm.drawers, function(value, key) {
			vm.drawers[key] = false;
		});
	};

	vm.dataWarehouseUnlocked = false;
	var clicks = {First: -1, Second: -1};
	vm.avedaClick = function(event) {
		var coords = getCrossBrowserElementCoords(event);
		if (clicks.First < 0) {
			clicks.First = coords.x;
		}
		else {
			clicks.Second = coords.x;
		}
		checkClicks();
		$timeout(resetClicks, 1000);
	};

	function checkClicks() {
		vm.dataWarehouseUnlocked = clicks && (0 <= clicks.First && clicks.First <= 13) && (44 <= clicks.Second && clicks.Second <= 54);
	}

	function resetClicks() {
		clicks = {First: -1, Second: -1};
	}

	function getCrossBrowserElementCoords(mouseEvent) {
		var result = {x: 0, y: 0};

		if (!mouseEvent) {mouseEvent = window.event;}

		if (mouseEvent.pageX || mouseEvent.pageY) {
			result.x = mouseEvent.pageX;
			result.y = mouseEvent.pageY;
		} else if (mouseEvent.clientX || mouseEvent.clientY) {
			result.x = mouseEvent.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
			result.y = mouseEvent.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		}

		if (mouseEvent.target) {
			var offEl = mouseEvent.target;
			var offX = 0;
			var offY = 0;

			if (typeof(offEl.offsetParent) != "undefined") {
				while (offEl) {
					offX += offEl.offsetLeft;
					offY += offEl.offsetTop;
					offEl = offEl.offsetParent;
				}
			} else {
				offX = offEl.x;
				offY = offEl.y;
			}

			result.x -= offX;
			result.y -= offY;
		}

		return result;
	}
}
