angular.module('orderCloud')
    .config(AdminPromotionsConfig)
;

function AdminPromotionsConfig($stateProvider) {
    $stateProvider
        .state('base.adminPromotions', {
            url: '/promotions',
            data:{pageTitle: 'Administer Promotions', loadingMessage: 'Loading Promotions'},
            views: {
                '': {
                    template: '<article id="AdminPromotions" ui-view am-layout="horizontal"></article>'
                },
                '@base.adminPromotions': {
                    templateUrl: 'adminPromotions/templates/adminPromotions.list.tpl.html',
                    resolve: {
                        Tree: function(AvedaCategoryService) {
                            return AvedaCategoryService.GetCategoryTree();
                        },
                        Promotions: function(AdminPromotionsService, Tree) {
                            return AdminPromotionsService.GetPromotions(Tree)
                                .then(function(promotions) {
                                    return promotions;
                                });
                        }
                    },
                    controller: 'AdminPromotionsListCtrl',
                    controllerAs: 'adminPromotionsList'
                }
            }
        })
        .state('base.adminPromotions.create', {
            url: '/create',
            templateUrl: 'adminPromotions/templates/adminPromotions.create.tpl.html',
            controller: 'AdminPromotionsCreateCtrl',
            controllerAs: 'adminPromotionsCreate'
        })
        .state('base.adminPromotions.edit', {
            url: '/edit/:id',
            templateUrl: 'adminPromotions/templates/adminPromotions.edit.tpl.html',
            controller: 'AdminPromotionsEditCtrl',
            controllerAs: 'adminPromotionsEdit',
            data: {loadingMessage: 'Loading Promotion Details'},
            resolve: {
                SelectedPromotion: function($q, $stateParams, AdminPromotionsService) {
                    var deferred = $q.defer();
                    AdminPromotionsService.Get($stateParams.id).then(function(promotion) {
                        promotion.xp.StartDate = new Date(promotion.xp.StartDate);
                        promotion.xp.EndDate = new Date(promotion.xp.EndDate);
                        deferred.resolve(promotion);
                    });
                    return deferred.promise;
                }
            }
        })
    ;
}