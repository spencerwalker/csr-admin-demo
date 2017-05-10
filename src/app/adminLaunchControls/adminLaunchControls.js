angular.module('orderCloud.adminLaunchControls', [])
    .config(AdminLaunchControlsConfig)
    .controller('AdminLaunchControlsCtrl', AdminLaunchControlsController)
;

function AdminLaunchControlsConfig($stateProvider) {
    $stateProvider
        .state('base.adminLaunchControls', {
            url: '/launch-controls',
            data: {pageTitle: 'Launch Controls'},
            views: {
                '': {
                    template: '<article id="AdminLaunchControls" ui-view am-layout="vertical"></article>'
                },
                '@base.adminLaunchControls': {
                    templateUrl: 'adminLaunchControls/templates/adminLaunchControls.tpl.html',
                    controller: 'AdminLaunchControlsCtrl',
                    controllerAs: 'adminLaunchControls',
                    resolve: {
                        Aveda: function(OrderCloudSDK, buyerid) {
                            var buyerID = buyerid;
                            return OrderCloudSDK.Buyers.Get(buyerID);
                        }
                    }
                }
            }
        })
    ;
}

function AdminLaunchControlsController($filter, $resource, toastr, OrderCloudSDK, Aveda, bulkapproveurl, jitterbitauth, buyerid) {
    var vm = this;
    vm.buyer = Aveda;

    vm.saveSDPLaunchDates = function() {
        OrderCloudSDK.Buyers.Patch(buyerid, {xp: vm.buyer.xp})
            .then(function(){
                toastr.success('The SDP Launch period has been updated', 'Success!');
            })
            .catch(function(){
                toastr.error('Something went wrong, please try selecting your dates again', 'Error!');
            });
    };

    vm.openDatepicker = function($event, picker) {
        $event.preventDefault();
        $event.stopPropagation();
        vm[picker] = true;
    };

    vm.processApprovals = function() {
        var approveDates = {
            from: $filter('date')(vm.launchApprovalsStart, 'MM/dd/yyyy'),
            to: $filter('date')(vm.launchApprovalsEnd, 'MM/dd/yyyy')
        };
        $resource(bulkapproveurl, {}, {authorize: {method: 'POST', headers: {'Authorization': jitterbitauth}}}).authorize(approveDates).$promise
            .then(function(){
                toastr.success('The bulk approval process has been started, an email summary will be sent upon completion');
            })
            .catch(function(){
                toastr.error('Something went wrong, please try again');
            });
    };
}
