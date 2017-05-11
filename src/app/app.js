angular.module('orderCloud', [
	'textAngular',
	'ngSanitize',
	'ngAnimate',
	'ngMessages',
	'ngTouch',
	'ngCookies',
	'ui.router',
	'ui.tree',
	'cgBusy',
	'firebase',
	'LocalForageModule',
	'orderCloud.sdk',
    'ordercloud-angular-sdk',
	'orderCloud.extend',
	'orderCloud.ui',
	'ui.bootstrap',
	'orderCloud.filters',
	'orderCloud.avedaFiles',
	'orderCloud.base',
	'orderCloud.login',
	'orderCloud.adminApprovals',
	'orderCloud.adminCategories',
	'orderCloud.adminProducts',
	'orderCloud.adminCostCenters',
	'orderCloud.adminNews',
	'orderCloud.adminUpdates',
	'orderCloud.adminInternalUsers',
	'orderCloud.adminAdminUsers',
	'orderCloud.avedaUsers',
	'orderCloud.avedaCategories',
	'orderCloud.adminClaims',
	'orderCloud.adminMisc',
	'orderCloud.avedaHierarchy',
	'orderCloud.defaultPermissions',
	'orderCloud.dashboard',
	'orderCloud.adminResubmitOrders',
	'orderCloud.adminCreditCards',
	'orderCloud.adminDiagnosticTool',
    'orderCloud.adminLaunchControls',
    'orderCloud.adminDataWarehouse'

])

	.run(Run)
    .run(OrderCloudAngularSDKConfig)
	.config(Routing)
	.config(ErrorHandling)
	.controller('AppCtrl', AppCtrl)
	.directive('avedaLogo', avedaLogoDirective)
;

function Run(environment, OrderCloud) {
    switch (environment) {
        case 'test':
        case 'newavedatest':
            OrderCloud.BuyerID.Set('AvedaTest');
            OrderCloud.CatalogID.Set('AvedaTest');
            break;
        default:
            OrderCloud.BuyerID.Set('Aveda');
            OrderCloud.CatalogID.Set('Aveda');
    }
}
function OrderCloudAngularSDKConfig(OrderCloudSDK, appname, apiurl, authurl) {
    var cookiePrefix = appname.replace(/ /g, '_').toLowerCase();
    var apiVersion = 'v1';
    OrderCloudSDK.Config(cookiePrefix, apiurl + '/' + apiVersion, authurl);
}

function avedaLogoDirective() {
    var template = ['<figure><h1 class="visuallyhidden">Aveda</h1>',
        '<h1 class="am-text-c" ng-if="application.environment !== \'PROD\'">{{application.environment | avedaenvironment}}</h1>',
        '<svg ng-if="application.environment === \'PROD\'" version="1.1" id="AvedaLogo" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 348.1 72" enable-background="new 0 0 348.1 72" xml:space="preserve">',
        '<g fill="{{AvedaLogo.fillColor}}">',
            '<path d="M336.1,68.2l-23.2-46.8l-24.6,46.8h-12.2L312.8,0l35.4,68.2H336.1z M319.6,52.7c0-3.8-3.2-6.8-7-6.8c-3.9,0-7,3-7,6.8	c0,3.7,3.1,6.8,7,6.8C316.4,59.5,319.6,56.4,319.6,52.7z"/>',
            '<path d="M263.2,36.1c0,13.7-7.8,22.4-26.9,22.4H229V13h7.3C255.8,13,263.2,22,263.2,36.1z M273.8,36.1c0-20-10.7-32.9-38.2-32.9 h-18.7v65h18.7C262.1,68.2,273.8,55.6,273.8,36.1z"/>',
            '<polygon points="197.2,68.2 197.2,58.9 161.1,58.9 161.1,40.4 192.2,40.4 192.2,31.2 161.1,31.2 161.1,12.5 196.7,12.5 196.7,3.2 149.3,3.2 149.3,68.2"/>',
            '<polygon points="133.8,3.2 122.3,3.2 98.8,47.5 76,3.2 63.6,3.2 98.5,72"/>',
            '<path d="M59.9,68.1L36.7,21.3L12.2,68.1H0L36.7,0L72,68.1H59.9z M43.6,52.6c0-3.7-3.1-6.7-7-6.7c-3.9,0-7,3-7,6.7	c0,3.8,3.1,6.8,7,6.8C40.4,59.4,43.6,56.4,43.6,52.6z"/>',
        '</g>',
        '</svg></figure>'];
	var obj = {
		template: template.join(''),
		replace:true,
		link: function(scope, element, attrs) {
			scope.AvedaLogo = {
				'fillColor': attrs.color
			};
		}
	};
	return obj;
}

function AppCtrl($q, $rootScope, environment, appname, $state, $ocMedia) {
	var vm = this;
	vm.$state = $state;
	vm.$ocMedia = $ocMedia;

	vm.now = new Date();
    vm.environment = environment.toUpperCase();

    vm.contentLoading = undefined;

    function cleanLoadingIndicators() {
        if (vm.contentLoading && vm.contentLoading.promise && !vm.contentLoading.promise.$cgBusyFulfilled) vm.contentLoading.resolve(); //resolve leftover loading promises
    }

    $rootScope.$on('$stateChangeStart', function(e, toState) {
        cleanLoadingIndicators();
        var defer = $q.defer();
        //defer.delay = 200;
        //defer.wrapperClass = 'indicator-container';
        (toState.data && toState.data.loadingMessage) ? defer.message = toState.data.loadingMessage : defer.message = 'Please wait';
        defer.templateUrl = 'base/templates/base.loading.tpl.html';
        vm.contentLoading = defer;
    });

    $rootScope.$on('$stateChangeSuccess', function(e, toState) {
        cleanLoadingIndicators();
        if (toState.data && toState.data.componentName) {
            vm.title = toState.data.componentName + ' | ' + appname;
        } else {
            vm.title = appname;
        }
    });

    $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, error) {
        cleanLoadingIndicators();
        console.log(error);
    });

	$rootScope.$watch('loading', function(value) {
        if (!value || !value.promise) return;
        cleanLoadingIndicators();
        var defer = $q.defer();
        (value.message) ? defer.message = value.message : defer.message = 'Please wait';
        defer.templateUrl = 'base/templates/base.loading.tpl.html';
        defer.promise = value.promise;
        vm.contentLoading = defer;
	});
}

function Routing($urlRouterProvider, $urlMatcherFactoryProvider) {
	$urlMatcherFactoryProvider.strictMode(false);
	$urlRouterProvider.otherwise('/adminProducts');
	//$locationProvider.html5Mode(true);
	//For HTML5 mode to work we need to always return index.html as the entry point on the serverside
}

function ErrorHandling($provide) {
	$provide.decorator('$exceptionHandler', handler);

	function handler($delegate, $injector) {
		return function(ex, cause) {
		var message = '';
		if(ex && ex.response && ex.response.body && ex.response.body.Errors && ex.response.body.Errors.length) {
			message = ex.response.body.Errors[0].Message;
		} else if(ex && ex.response && ex.response.body && ex.response.body['error_description']) {
			message = ex.response.body['error_description'];
		} else if(ex.message) {
			message = ex.message;
		} else {
			message = 'An error occurred';
		}
		$delegate(ex, cause);
		$injector.get('toastr').error(message, 'Error');
	};
	}
}
