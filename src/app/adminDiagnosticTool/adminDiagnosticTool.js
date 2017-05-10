angular.module('orderCloud.adminDiagnosticTool', [])
    .config(AdminDiagnosticTool)
    .factory('AdminDiagnosticToolService', AdminDiagnosticToolService)
    .controller('AdminDiagnosticToolCtrl', AdminDiagnosticToolController)
    .directive('jsonText', jsonText)
;

function AdminDiagnosticTool($stateProvider) {
    $stateProvider
        .state('base.adminDiagnosticTool', {
            url: '/diagnostic-tool',
            data: {pageTitle: 'Diagnostic Tool'},
            views: {
                '': {
                    template: '<article id="AdminDiagnosticTool" ui-view am-layout="vertical"></article>'
                },
                '@base.adminDiagnosticTool': {
                    templateUrl: 'adminDiagnosticTool/templates/adminDiagnosticTool.tpl.html',
                    controller: 'AdminDiagnosticToolCtrl',
                    controllerAs: 'adminDiagnosticTool'
                }
            }
        })
    ;
}

function AdminDiagnosticToolService($q, $resource, OrderCloudSDK, integrationurl, environment, buyerclientid, buyerid) {
    var service = {
        Send: _send
    };

    function _send(request) {
        var deferred = $q.defer();
        var impersonationConfig = {
            impersonationBuyerID : buyerid,
            buyerID : buyerid,
            securityProfileID: 'FullAccess',
            clientID : buyerclientid
        };
        var options = {
            filter : { impersonationBuyerID : buyerid }
        };
        OrderCloudSDK.ImpersonationConfigs.List(options)
            .then(function(configList){
                if (configList.Items.length > 0){
                }
                else {
                   return OrderCloudSDK.ImpersonationConfigs.Create(impersonationConfig);

                }
            });


        OrderCloudSDK.Users.GetAccessToken(buyerid, request.Salon.ID, {ClientID: buyerclientid, Claims: ['BuyerImpersonation', 'Shopper', 'ProductReader', 'CategoryReader', 'AddressReader', 'BuyerReader', 'CostCenterReader', 'CreditCardReader', 'CreditCardAdmin', 'PriceScheduleReader', 'SpendingAccountReader', 'BuyerUserReader', 'BuyerUserAdmin', 'UserGroupReader', 'UserGroupAdmin', 'OrderReader', 'OrderAdmin', 'OverrideTax', 'OverrideShipping', 'OverrideUnitPrice', 'UnsubmittedOrderReader']})
            .then(function(data) {
                sendRequest(data['access_token']);
            });

        function sendRequest(token) {
            $resource(integrationurl + '/components/esteelauder/v1/diagnostictool?environment=' + (environment == 'newavedatest' ? 'test' : environment), 
                    {}, 
                    {call: {method: 'POST', headers: {'Authorization': token}}}
            ).call(request).$promise
                .then(function(response) {
                    deferred.resolve(response);
                });
        }

        return deferred.promise;
    }

    return service;
}

function AdminDiagnosticToolController($timeout, $filter, Underscore, OrderCloudSDK, AdminDiagnosticToolService, buyerid) {
    var vm = this;
    vm.request = {};

    vm.submit = function() {
        vm.response = null;
        AdminDiagnosticToolService.Send(vm.request)
            .then(function(response) {
                vm.response = response;
            });
    };

    var searching;
    vm.searchSalons = function(salonSearch) {
        if (!salonSearch || salonSearch.length < 2) return;
        if (searching) $timeout.cancel(searching);
        searching = $timeout((function() {
            var opts = {search : salonSearch, page: 1, pageSize: 25, filters:  {ID: 'SoldTo-*'}};
            return OrderCloudSDK.UserGroups.List(buyerid, opts)
                .then(function(data) {
                    data.Items = Underscore.filter(data.Items, function(item) {
                        return Underscore.pluck(vm.selectedSalonGroups, 'ID').indexOf(item.ID) === -1;
                    });
                    return $filter('xpStringToJSON')(data.Items);
                })
        }), 300);
        return searching;
    };

    vm.selectSalon = function(salon) {
        vm.request.Salon = salon;
    };
}

function jsonText() {
    var directive = {
        restrict: 'A',
        require: 'ngModel',
        link: function (scope, element, attr, ngModel) {
            function into(input) {
                return JSON.parse(input);
            }

            function out(data) {
                return JSON.stringify(data);
            }

            ngModel.$parsers.push(into);
            ngModel.$formatters.push(out);
        }
    };

    return directive;
}