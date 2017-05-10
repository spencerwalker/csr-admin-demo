angular.module('orderCloud.adminResubmitOrders', [])
    .config(AdminResubmitOrdersConfig)
    .factory('ResubmitOrdersService', ResubmitOrdersService)
    .controller('ResubmitOrdersCtrl', ResubmitOrdersController)
;

function AdminResubmitOrdersConfig($stateProvider) {
    $stateProvider.state('base.adminResubmitOrders', {
        url: '/resubmitOrders',
        templateUrl: 'adminResubmitOrders/templates/adminResubmitOrders.tpl.html',
        controller: 'ResubmitOrdersCtrl',
        controllerAs: 'adminResubmitOrders',
        data: {pageTitle: 'Resubmit Orders'},
        resolve: {
            FailedOrders: function(ResubmitOrdersService) {
                return ResubmitOrdersService.List(1);
            }
         }
    });
}

function ResubmitOrdersService($q, $resource, Underscore, OrderCloudSDK, integrationurl, environment, buyerid) {
    var service = {
        List: _list,
        Submit: _submit
    };

    function _list(page) {
        var deferred = $q.defer();
        var opts = {page : page, pageSize: 100, sortBy:'!DateCreated', filters:  {'xp.OrderStatus': 'Getting Confirmation'} };
        OrderCloudSDK.Orders.List('incoming', opts)
            .then(function(data) {
                angular.forEach(data.Items, function(order) {
                    console.log(order.ID + ' - ' + order.xp.OrderStatus)
                });
               deferred.resolve(data);
            });

        return deferred.promise;
    }

    function getOrderAndLineItems(orderID) {
        var deferred = $q.defer();

        var order = {};
        var lineItemPage = 1;

        function approvalRequired() {
            order.ApprovalRequired = (order.xp.CostCenter != null || ['CostCenter', 'Holiday', 'Launch'].indexOf(order.xp.Four51OrderType) > -1);
            order.ReviewRequired = (!order.ApprovalRequired && ['ClientDislike', 'CreditMemo', 'DebitMemo', 'Return'].indexOf(order.xp.Four51OrderType) == -1);
            deferred.resolve(order);
        }

        function _getShippingAddress() {
            if (!order.LineItems[0].ShippingAddress) {
                OrderCloudSDK.Addresses.Get(buyerid, order.LineItems[0].ShippingAddressID)
                    .then(function(address) {
                        approvalRequired();
                    })
                    .catch(function(){
                        approvalRequired();
                    });
            }
            else {
                approvalRequired();
            }
        }

        function getLineItemProducts() {
            var productIDs = Underscore.uniq(Underscore.pluck(order.LineItems, 'ProductID'));

            var queue = [];
            angular.forEach(productIDs, function(id) {
                queue.push((function() {
                    var d = $q.defer();

                    OrderCloudSDK.Products.Get(id)
                        .then(function(product) {
                            angular.forEach(Underscore.where(order.LineItems, { ProductID: product.ID}), function(item) {
                                item.Product = product;
                                if (product.StandardPriceSchedule && product.StandardPriceSchedule.xp.Excluded && product.StandardPriceSchedule.xp.Excluded == 'X') {
                                    order.LineItems = Underscore.filter(order.LineItems, function(i) { return i.ID != item.ID});
                                    OrderCloudSDK.LineItems.Delete('incoming', order.ID, item.ID)
                                        .then(function() {
                                            d.resolve();
                                        });
                                }
                                else {
                                    d.resolve();
                                }
                            });
                        });

                    return d.promise;
                })());
            });

            $q.all(queue).then(function() {
                var calculatedSubtotal = 0;
                var calculatedTotal = order.TaxCost + order.ShippingCost;
                angular.forEach(order.LineItems, function(item) {
                    if (item.xp && item.xp.ItemCategory != 'ZTNN' && !item.xp.Rejected) {
                        calculatedSubtotal = item.LineTotal;
                        calculatedTotal += item.LineTotal;
                    }
                });
                order.CalculatedSubtotal = calculatedSubtotal;
                order.CalculatedTotal = calculatedTotal;
                if (order.LineItems[0] && order.LineItems[0].ShippingAddressID) {
                    _getShippingAddress();
                }
                else {
                    approvalRequired();
                }
            });
        }

        function gatherLineItems() {
            var opts = { page : lineItemPage, pageSize: 100 };
            OrderCloudSDK.LineItems.List('incoming', orderID, opts)
                .then(function(data) {
                    order.LineItems = order.LineItems.concat(data.Items);
                    if (data.Meta.TotalPages > data.Meta.Page) {
                        lineItemPage++;
                        gatherLineItems();
                    }
                    else {
                        order.xp.CostCenter = (order.LineItems[0] && order.LineItems[0].CostCenter) ? order.LineItems[0].CostCenter : null;
                        order.AllZeroQuantities = Underscore.filter(order.LineItems, function(item) { return item.xp.ZeroQuantity }).length == order.LineItems.length;
                        getLineItemProducts();
                    }
                });
        }

        OrderCloudSDK.Orders.Get('incoming', orderID)
            .then(function(o) {
                order = o;
                order.LineItems = [];
                OrderCloudSDK.Payments.List('incoming', order.ID)
                    .then(function(payment) {
                        if (payment.Items.length && payment.Items[0].CreditCardID) {
                            order.CreditCardID = payment.Items[0].CreditCardID;
                            OrderCloudSDK.CreditCards.Get(buyerid, order.CreditCardID)
                                .then(function(card) {
                                    order.CreditCard = card;
                                });
                        }
                        else {
                            order.CreditCardID = null;
                            order.CreditCard = null;
                        }
                    });
                gatherLineItems();
            });

        return deferred.promise;
    }

    function buildAvedaOrderObject(order, user, salon, submit) {

        function formatDate(date, time) {
            return date.toJSON ? date.toJSON().split('T')[0] + (time ? (' ' + date.toJSON().split('T')[1].split('.')[0]) : ' 00:00:00') : (new Date(date).toJSON().split('T')[0] + (time ? (' ' + new Date(date).toJSON().split('T')[1].split('.')[0]) : ' 00:00:00'));
        }

        var now = new Date();

        var obj = {
            "Order": {
                "OrderID": order.ID,
                "OrderStatus": submit ? 'Getting Confirmation' : 'Getting Validated',
                "OrderType": order.xp.OrderType,
                "SalesOrg": (salon.xp ? salon.xp.SalesOrganization : null),
                "DistributionChannel": (salon.xp ? salon.xp.DistributionChannel : null),
                "Division": (salon.xp ? salon.xp.Division : null),
                "CreatedBy": user.FirstName + ' ' + user.LastName,
                "CreatedDate": formatDate(now, true),
                "PONumber": order.xp.PONumber ? order.xp.PONumber : ((order.xp && order.xp.Four51OrderType == 'ClientDislike') ? 'Client Dislike' : formatDate(now, true)),
                "POType": 'FOUR',
                "TermsOfPayment": (order.xp ? order.xp.TermsOfPayment : null),
                "BudgetCode": order.xp.BudgetCode ? order.xp.BudgetCode : '',
                "BillingBlock": (order.xp ? order.xp.BillingBlock : null),
                "RequestedDelDate": submit ? formatDate(order.xp.RequestedDelDateCustom, false) : formatDate(now, true),
                "PricingDate": formatDate(now, true),
                "OrderReason": (order.xp ? order.xp.OrderReason : null),
                "DeliveryBlock": order.xp.DeliveryBlock,
                "CustGrp1": (salon.xp && salon.xp.CustomerGroup1 ? salon.xp.CustomerGroup1 : ''),
                "CustGrp2": (order.xp && order.xp.CustomerGroup2Override && (salon.xp && (salon.xp.CustomerGroup2 == '101' || salon.xp.CustomerGroup2 == null))) ? '' : salon.xp.CustomerGroup2,
                "PromotionCode": "",
                "CollectiveNumber": (order.xp && order.xp.CollectiveNumber) ? (order.xp.Four51OrderType == 'MultipleOneFreight' ? order.xp.CollectiveNumber.toString() : order.xp.CollectiveNumber.Number.toString()) : '',
                "SoldTo": {
                    "ID": salon.ID.replace('SoldTo-', ''),
                    "Name": salon.Name,
                    "Street": (salon.xp && salon.xp.SoldToAddress) ? salon.xp.SoldToAddress.Street : null,
                    "Suppl": (salon.xp && salon.xp.SoldToAddress) ? salon.xp.SoldToAddress.Street2 : null,
                    "Region": (salon.xp && salon.xp.SoldToAddress) ? salon.xp.SoldToAddress.State : null,
                    "City": (salon.xp && salon.xp.SoldToAddress) ? salon.xp.SoldToAddress.City : null,
                    "PostalCode": (salon.xp && salon.xp.SoldToAddress) ? salon.xp.SoldToAddress.ZipCode : null,
                    "Country": (salon.xp && salon.xp.SoldToAddress) ? salon.xp.SoldToAddress.Country : null
                },
                "ShipTo": {
                    "ID": order.xp.ShippingAddressID,
                    "Name": order.LineItems[0].ShippingAddress.AddressName,
                    "Street": order.LineItems[0].ShippingAddress.Street1,
                    "Suppl": order.LineItems[0].ShippingAddress.Street2,
                    "Region": order.LineItems[0].ShippingAddress.State,
                    "City": order.LineItems[0].ShippingAddress.City,
                    "PostalCode": order.LineItems[0].ShippingAddress.Zip,
                    "Country": order.LineItems[0].ShippingAddress.Country
                },
                "LineItem": []
            }
        };

        if (submit) {
            obj.Order.CardType = '';
            obj.Order.Token = '';
            obj.Order.ExpDate = '';
            obj.Order.AuthCode = '';
            obj.Order.CardHolderName = '';
            obj.Order.TransactionDate = '';
            obj.Order.AuthAmount = '';
        }

        angular.forEach(order.LineItems, function(item) {
            var li = {
                LineItemID: item.xp.SAP_ID,
                ProductID: item.ProductID,
                OrderQuantity: (item.xp.RequestedQuantity ? item.xp.RequestedQuantity.toString() : ''),
                ItemCategory: item.xp.ItemCategory,
                Usage: item.xp.Usage,
                Plant: (item.xp.PlantOverride == 'AllPlants' ? (salon.xp ? salon.xp.DeliveryPlant : null) : item.xp.PlantOverride)
            };

            angular.forEach(li, function(value, key) {
                if (!value) {
                    delete li[key];
                }
            });

            if (!submit || (submit && !item.xp.Rejected && !item.xp.Disallowed)) obj.Order.LineItem.push(li);
        });

        angular.forEach(obj.Order.SoldTo, function(value, key) {
            if (!value) {
                delete obj.Order.SoldTo[key];
            }
        });

        angular.forEach(obj.Order, function(value, key) {
            if (!value && ['ExpDate', 'CustGrp1', 'CustGrp2', 'CardHolderName', 'Token', 'CardType', 'AuthAmount', 'AuthCode', 'TransactionDate', 'AuthDate', 'AuthTime', 'ResponseCode', 'ResponseTextMsg', 'ProcessorResponseCode', 'AVSResult', 'AVSAddressResult', 'AVSZipCodeResult', "AUTHFLAG", "AUTHORTYPE", "CURRENCY", "AUTHREFNO", "CCREAMOUNT", "CCSTATEX", "CCREACT"].indexOf(key) == -1) {
                delete obj.Order[key];
            }
        });

        return obj;
    }

    function _submit(orders) {
        var deferred = $q.defer();
        var queue = [];

        angular.forEach(orders, function(o) {
            if (o.Selected) {
                queue.push((function() {
                    var d = $q.defer();

                    getOrderAndLineItems(o.ID)
                        .then(function(ord) {
                            OrderCloudSDK.UserGroups.Get(buyerid, ord.FromUserID)
                                .then(function(salon) {
                                    var orderSubmit = buildAvedaOrderObject(ord, ord.xp.SubmittingUser, salon, true);
                                    $resource(integrationurl + '/components/esteelauder/v1/ordersubmit?environment=' + (environment == 'newavedatest' ? 'test' : environment), {}, {call: {method: 'POST', headers: {'Authorization': OrderCloudSDK.GetToken()}}}).call(orderSubmit).$promise.then(
                                        function(data) {
                                            console.log('Order Submit Successful');
                                            console.log(data);
                                        },
                                        function(ex) {
                                            console.log('Order Submit Error');
                                            console.log(ex);
                                        }
                                    );
                                    d.resolve();
                                });
                        });

                    return d.promise;
                })());
            }
        });

        $q.all(queue).then(function() {
            deferred.resolve();
        });

        return deferred.promise;
    }

    return service;
}

function ResubmitOrdersController(toastr, Underscore, ResubmitOrdersService, FailedOrders) {
    var vm = this;
    vm.orders = FailedOrders.Items;
    vm.totalOrders = FailedOrders.Meta.TotalCount;
    vm.sortBy = 'DateCreated';
    vm.reverseSort = true;

    vm.currentPage = 1;
    vm.pageCount = FailedOrders.Meta.TotalPages;

    vm.selectPage = function() {
        vm.searching = true;
        ResubmitOrdersService.List(vm.currentPage)
            .then(function(data) {
                vm.orders = data.Items;
                vm.sortBy = 'DateCreated';
                vm.reverseSort = true;
                vm.searching = false;
            });
    };

    vm.submit = function() {
        ResubmitOrdersService.Submit(vm.orders)
            .then(function() {
                toastr.success('Your selected orders have been sent to SAP');
                angular.forEach(vm.orders, function(order) {
                    order.Selected = false;
                });
            });
    };

    vm.ordersSelected = function() {
        return Underscore.filter(vm.orders, function(order) { return order.Selected }).length > 0;
    };

    vm.selectColumn = function(column) {
        if (vm.sortBy == column) {
            vm.reverseSort = !vm.reverseSort;
        }
        else {
            vm.reverseSort = false;
            vm.sortBy = column;
        }
    };
}