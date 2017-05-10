angular.module('orderCloud.adminCreditCards', [])
    .config(AdminCreditCardsConfig)
    .factory('AdminCreditCardsService', AdminCreditCardsService)
    .controller('AdminCreditCardsCtrl', AdminCreditCardsController)
;

function AdminCreditCardsConfig($stateProvider) {
    $stateProvider
        .state('base.adminCreditCards', {
            url: '/creditcards',
            data: {pageTitle: 'Credit Cards'},
            views: {
                '': {
                    template: '<article id="AdminCreditCards" ui-view am-layout="vertical"></article>'
                },
                '@base.adminCreditCards': {
                    templateUrl: 'adminCreditCards/templates/adminCreditCards.tpl.html',
                    controller: 'AdminCreditCardsCtrl',
                    controllerAs: 'adminCreditCards',
                    resolve: {
                        CreditCardList: function(AdminCreditCardsService) {
                            return AdminCreditCardsService.List();
                        }
                    }
                }
            }
        })
    ;
}

function AdminCreditCardsService($q, Underscore, OrderCloudSDK, buyerid) {
    var service = {
        List: _list,
        ActivateDeactivate: _activateDeactivate
    };

    function _list() {
        var deferred = $q.defer();
        var cards = [];
        var cardsQueue = [];

        function gatherAll() {
            var opts = {page: 1, pageSize: 100};
            OrderCloudSDK.CreditCards.List(buyerid, opts)
                .then(function(data) {
                    cards = cards.concat(data.Items);
                    for (var i = 2; i <= data.Meta.TotalPages; i++) {
                        opts.page= i;
                        cardsQueue.push(OrderCloudSDK.CreditCards.List(buyerid, opts));
                    }

                    $q.all(cardsQueue).then(function(results) {
                        angular.forEach(results, function(r) {
                            cards = cards.concat(r.Items);
                        });
                        angular.forEach(cards, function(card) {
                            if (card.xp && card.xp.Personal) card.TempCardHolderName = card.CardholderName;
                        });
                        cards = Underscore.filter(cards, function(card) {if(card.xp)return !card.xp.OneTime});
                        deferred.resolve(cards);
                    });
                });
        }
        gatherAll();

        return deferred.promise;
    }

    function _activateDeactivate(cards) {
        var deferred = $q.defer();
        var queue = [];

        angular.forEach(cards, function(card) {
            if (card.Selected) {
                queue.push((function() {
                    var d = $q.defer();

                    card.Token = card.xp.Active ? (card.Token + '#') : card.Token.replace('#', '');
                    card.xp.Active = !card.xp.Active;
                    card.xp.DateLastModified = new Date();
                    OrderCloudSDK.CreditCards.Patch(buyerid, card.ID, {Token: card.Token, xp: card.xp})
                        .then(function() {
                            d.resolve();
                        });

                    return d.promise;
                })());
            }
        });

        $q.all(queue).then(function() {
            _list().then(function(cardList) {
                deferred.resolve(cardList);
            });
        });

        return deferred.promise;
    }

    return service;
}

function AdminCreditCardsController(AdminCreditCardsService, CreditCardList) {
    var vm = this;
    vm.creditCards = CreditCardList;
    vm.currentPage = 1;

    vm.filters = {};
    vm.salons = {};
    vm.cardTypes = [
        {Type: 'VISA', Name: 'Visa'},
        {Type: 'MC', Name: 'Master Card'},
        {Type: 'AMEX', Name: 'American Express'},
        {Type: 'DISC', Name: 'Discover'},
        {Type: 'ECHQ', Name: 'eCheck'}
    ];

    angular.forEach(vm.creditCards, function(cc) {
        if (cc.xp.Salon && !vm.salons[cc.xp.Salon.ID]) {
            vm.salons[cc.xp.Salon.ID] = {ID: cc.xp.Salon.ID, Name: cc.xp.Salon.Name};
        }
    });

    vm.openDatepicker = function($event, picker) {
        $event.preventDefault();
        $event.stopPropagation();
        vm[picker] = true;
    };

    vm.sortByColumn = 'PartialAccountNumber';
    vm.reverseSort = false;
    vm.selectColumn = function(column) {
        if (vm.sortByColumn == column) {
            vm.reverseSort = true;
        }
        else {
            vm.reverseSort = false;
            vm.sortByColumn = column;
        }
    };

    vm.activateDeactivate = function() {
        AdminCreditCardsService.ActivateDeactivate(vm.creditCards)
            .then(function(cards) {
                vm.creditCards = cards;
                angular.forEach(vm.creditCards, function(c) {
                    c.Selected = false;
                });
            });
    };
}