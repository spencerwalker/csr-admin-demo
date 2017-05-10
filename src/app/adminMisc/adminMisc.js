angular.module('orderCloud.adminMisc', [])
    .config(AdminMiscConfig)
    .controller('AdminMiscCtrl', AdminMiscController)
;

function AdminMiscConfig($stateProvider) {
    $stateProvider
        .state('base.adminMisc', {
            url: '/miscellaneous',
            data: {pageTitle: 'Miscellaneous'},
            views: {
                '': {
                    template: '<article id="AdminMisc" ui-view am-layout="vertical"></article>'
                },
                '@base.adminMisc': {
                    templateUrl: 'adminMisc/templates/adminMisc.tpl.html',
                    controller: 'AdminMiscCtrl',
                    controllerAs: 'adminMisc',
                    resolve: {
                        HolidayOrders: function(OrderCloudSDK, catalogid) {
                            return OrderCloudSDK.Categories.Get(catalogid, 'AvedaHolidayRoot')
                                .then(function(category) {
                                    return category;
                                });
                        },
                        Company: function(OrderCloudSDK, buyerid) {
                            var buyerID = buyerid;
                            return OrderCloudSDK.Buyers.Get(buyerID);
                        }
                    }
                }
            }
        })
    ;
}

function AdminMiscController($rootScope, OrderCloudSDK, AvedaHierarchy, HolidayOrders, Company, catalogid, buyerid) {
    var vm = this;
    vm.holidayOrders = HolidayOrders;
    vm.company = Company;

    vm.updateHolidayOrders = function() {
        OrderCloudSDK.Categories.Patch(catalogid, 'AvedaHolidayRoot', {xp: {HolidayOrdersActive: vm.holidayOrders.xp.HolidayOrdersActive}});
    };

    vm.updateProcessCreditCard = function() {
        var buyerID = buyerid;
        return OrderCloudSDK.Buyers.Get(buyerID);
    };

    vm.updateHierarchy = function() {
        $rootScope.loading = {
            message: 'Updating Customer Master Hierarchy...'
        };
        $rootScope.loading.promise = AvedaHierarchy.Update();
    };
}