angular.module('orderCloud.adminDataWarehouse', [])
    .config(AdminDataWarehouse)
    .factory('AdminDataWarehouseService', AdminDataWarehouseService)
    .controller('AdminDataWarehouseCtrl', AdminDataWarehouseController)
    .controller('AdminDataWarehouseConsoleCtrl', AdminDataWarehouseConsoleController)
;

function AdminDataWarehouse($stateProvider) {
    $stateProvider
        .state('base.adminDataWarehouse', {
            url: '/datawarehouse',
            params: {
                tab: null
            },
            data: {pageTitle: 'Data Warehouse'},
            views: {
                '': {
                    template: '<article id="AdminDataWarehouse" ui-view am-layout="vertical"></article>'
                },
                '@base.adminDataWarehouse': {
                    templateUrl: 'adminDataWarehouse/templates/adminDataWarehouse.tpl.html',
                    controller: 'AdminDataWarehouseCtrl',
                    controllerAs: 'adminDataWarehouse',
                    resolve: {

                    }
                }
            }
        })
    ;
}

function AdminDataWarehouseService($q, $resource, $timeout, Underscore, AzureService, OrderCloudSDK, firebaseurl, buyerid) {
    var service = {
        UserGroups: _userGroups,
        OrdersLineItemsProducts: _ordersLineItemsProducts,
        ConsoleSubmit: _consoleSubmit,
        FirebaseToAzureNotes: _firebaseToAzureNotes,
        FirebaseToAzureUpdates: _firebaseToAzureUpdates,
        FirebaseToAzureNews: _firebaseToAzureNews,
        FirebaseToAzureClaimCategoryOptions: _firebaseToAzureClaimCategoryOptions,
        FirebaseToAzureClaims: _firebaseToAzureClaims,
        MoveDataFromFirebaseToAzureDocDB: _moveDataFromFirebaseToAzureDocDB,
        DeleteAzureDocDBData: _deleteAzureDocDBData,
        CreateAvedaHierarchyDocument: _createAvedaHierarchyDocument
    };

    function _userGroups() {
        var deferred = $q.defer();
        var salons = [];
        var opts = {search :'SoldTo-', page: 1, pageSize: 100, searchOn: 'ID'};
        OrderCloudSDK.UserGroups.List(buyerid, opts)
            .then(function(data) {
                salons = salons.concat(data.Items);
                var queue = [];
                for (var i = 2; i <= data.Meta.TotalPages; i++) {
                    opts.page = i;
                    queue.push(OrderCloudSDK.UserGroups.List(buyerid, opts));
                }
                $q.all(queue).then(function(results) {
                    angular.forEach(results, function(r) {
                        salons = salons.concat(r.Items);
                    });
                    Underscore.map(salons, function(salon) {
                        salon.DWModifiedDate = new Date().toJSON();
                        return salon;
                    });
                    zipItUp(salons, 'UserGroups')
                        .then(function(blob) {
                            deferred.resolve(blob);
                        });
                })
            });

        return deferred.promise;
    }

    function _ordersLineItemsProducts(options) {
        var deferred = $q.defer();
        var orders = [];
        var lineItems = [];
        var opts = {filters : {Status: 'Open|Completed'}, page: 1, pageSize:(options.OrderCount && options.OrderCount < 100 ? options.OrderCount : 100)}
        OrderCloudSDK.Orders.List('incoming', opts)
            .then(function(data) {
                orders = orders.concat(data.Items);
                if (options.OrderCount && orders.length == options.OrderCount) {
                    Underscore.map(orders, function(order) {
                        order.DWModifiedDate = new Date().toJSON();
                        return order;
                    });
                    getLineItems();
                }
                else {
                    var orderQueue = [];
                    var totalOrders = orders.length;
                    for (var i = 2; i <= data.Meta.TotalPages; i++) {
                        var remaining = options.OrderCount - totalOrders;
                        if (options.AllOrders || remaining > 0) {
                            var opts = {page : i, pageSize:((options.AllOrders || remaining) > 100 ? 100 : remaining), filters : {Status: 'Open|Completed'} };
                            orderQueue.push(OrderCloudSDK.Orders.List('incoming', opts));
                            totalOrders += (remaining > 100 ? 100 : remaining);
                        }
                    }
                    $q.all(orderQueue).then(function(results) {
                        angular.forEach(results, function(r) {
                            orders = orders.concat(r.Items);
                        });
                        Underscore.map(orders, function(order) {
                            order.DWModifiedDate = new Date().toJSON();
                            return order;
                        });
                        getLineItems();
                    });
                }
            });

        function getLineItems() {
            var lineItemQueue = [];
            angular.forEach(orders, function(order) {
                lineItemQueue.push((function() {
                    var d = $q.defer();
                    var opts = {page: 1, pageSize: 100};
                    OrderCloudSDK.LineItems.List('incoming', order.ID, opts)
                        .then(function(data) {
                            angular.forEach(data.Items, function(item) {
                                item.OrderID = order.ID;
                            });
                            lineItems = lineItems.concat(data.Items);
                            var queue = [];
                            for (var i = 2; i <= data.Meta.TotalPages; i++) {
                                opts.page = i;
                                queue.push(OrderCloudSDK.LineItems.List('incoming', order.ID, opts));
                            }
                            $q.all(queue).then(function(results) {
                                angular.forEach(results, function(r) {
                                    angular.forEach(r.Items, function(item) {
                                        item.OrderID = order.ID;
                                    });
                                    lineItems = lineItems.concat(r.Items);
                                });
                                Underscore.map(lineItems, function(item) {
                                    item.DWModifiedDate = new Date().toJSON();
                                    return item;
                                });
                                d.resolve();
                            })
                        });

                    return d.promise;
                })());
            });

            $q.all(lineItemQueue).then(function() {
                getProducts();
            });
        }

        function reduceProduct(p) {
            return {
                ID: p.ID,
                Name: p.Name,
                QuantityMultiplier: p.QuantityMultiplier,
                Active: p.Active,
                xp: p.xp
            }
        }

        function getProducts() {
            var productIDs = Underscore.uniq(Underscore.pluck(lineItems, 'ProductID'));
            var productQueue = [];
            angular.forEach(productIDs, function(id) {
                 productQueue.push(OrderCloudSDK.Products.Get(id));
            });

            $q.all(productQueue).then(function(results) {
                angular.forEach(results, function(product) {
                    var reducedProduct = reduceProduct(product);
                    var itemsWithProduct = Underscore.filter(lineItems, function(item) { return item.ProductID == product.ID });
                    angular.forEach(itemsWithProduct, function(li) {
                        li.Product = reducedProduct;
                    });
                });
                combinedZip(options);
            });
        }

        function combinedZip(options) {
            var zip = new JSZip();

            angular.forEach(orders, function(order) {
                var fileName = 'Orders/Orders' + order.ID + '.json';
                zip.file(fileName, JSON.stringify(order));
            });

            if (options.LineItemStructure == 'Single') {
                var lineItemGroups = Underscore.groupBy(lineItems, 'OrderID');
                angular.forEach(lineItemGroups, function(items, orderID) {
                    var fileName = 'LineItems/' + orderID + 'LineItems.json';
                    zip.file(fileName, JSON.stringify(items));
                });
            }
            else if (options.LineItemStructure == 'Separate') {
                angular.forEach(lineItems, function(lineItem) {
                    var fileName = 'LineItems/' + lineItem.OrderID + 'LineItems' + lineItem.ID + '.json';
                    zip.file(fileName, JSON.stringify(lineItem));
                });
            }

            zip.generateAsync({type:"blob"})
                .then(function (blob) {
                    deferred.resolve(blob);
                });
        }

        return deferred.promise;
    }

    function _consoleSubmit(request) {
        var deferred = $q.defer();

        switch(request.Method) {
            case 'GET':
            case 'LIST':
                $resource(request.URL, {}, {call: {method: 'GET', headers: {'Authorization': 'Bearer ' + OrderCloudSDK.GetToken()}}}).call().$promise
                    .then(function(data) {
                        deferred.resolve(data);
                    });
                break;
            case 'POST':
                $resource(request.URL, {}, {call: {method: 'POST', headers: {'Authorization': 'Bearer ' + OrderCloudSDK.GetToken()}}}).call(request.Body).$promise
                    .then(function(data) {
                        deferred.resolve(data);
                    });
                break;
            case 'PUT':
                $resource(request.URL, {}, {call: {method: 'PUT', headers: {'Authorization': 'Bearer ' + OrderCloudSDK.GetToken()}}}).call(request.Body).$promise
                    .then(function(data) {
                        deferred.resolve(data);
                    });
                break;
            case 'PATCH':
                $resource(request.URL, {}, {call: {method: 'PATCH', headers: {'Authorization': 'Bearer ' + OrderCloudSDK.GetToken()}}}).call(request.Body).$promise
                    .then(function(data) {
                        deferred.resolve(data);
                    });
                break;
            default:
                deferred.resolve("You can't do that here!");
        }

        return deferred.promise;
    }

    function _firebaseToAzureNotes() {
        var deferred = $q.defer();
        var results = [];

        var ref = new Firebase(firebaseurl + '/Notes');
        ref.on('value', function(data) {
            angular.forEach(data.val(), function(notes, key) {
                angular.forEach(notes, function(note, id) {
                    if (note.ID) {
                        var n = {
                            ID: note.ID,
                            Description: note.Description,
                            CustomerName: note.CustomerName,
                            Private: note.Private,
                            Timestamp: new Date(note.Timestamp).getTime(),
                            FromUser: {
                                ID: note.FromUser.ID,
                                Email: note.FromUser.Email,
                                Username: note.FromUser.Username,
                                FirstName: note.FromUser.FirstName,
                                LastName: note.FromUser.LastName,
                                AccessLevel: note.FromUser.xp.AccessLevel
                            },
                            Salon: {
                                ID: note.Salon.ID,
                                Name: note.Salon.Name
                            }
                        };
                        results.push(n);
                    }
                });
            });

            zipItUp(results, 'Notes')
                .then(function(blob) {
                    deferred.resolve(blob);
                });
        });

        return deferred.promise;
    }

    function _firebaseToAzureUpdates() {
        var deferred = $q.defer();
        var results = [];

        var ref = new Firebase(firebaseurl + '/Updates');
        ref.on('value', function(data) {
            angular.forEach(data.val(), function(update, key) {
                if (update.ID) {
                    update.Timestamp = new Date(update.Timestamp).getTime();
                    results.push(update);
                }
            });

            zipItUp(results, 'Updates')
                .then(function(blob) {
                    deferred.resolve(blob);
                });
        });

        return deferred.promise;
    }

    function _firebaseToAzureNews() {
        var deferred = $q.defer();
        var results = [];

        var ref = new Firebase(firebaseurl + '/News');
        ref.on('value', function(data) {
            angular.forEach(data.val(), function(news, key) {
                if (news.ID) {
                    news.Timestamp = new Date(news.Timestamp).getTime();
                    results.push(news);
                }
            });

            zipItUp(results, 'News')
                .then(function(blob) {
                    deferred.resolve(blob);
                });
        });

        return deferred.promise;
    }

    function _firebaseToAzureClaimCategoryOptions() {
        var deferred = $q.defer();
        var results = [];

        var ref = new Firebase(firebaseurl + '/Claims/CategoryOptions');
        ref.on('value', function(data) {
            var nonOrder = data.val()['non-order'];
            var order = data.val()['order'];
            angular.forEach(nonOrder, function(item, key) {
                item.ID = key;
                item.Type = 'NonOrder';
                item.Timestamp = new Date(item.Timestamp).getTime();
                results.push(item);
            });
            angular.forEach(order, function(item, key) {
                item.ID = key;
                item.Type = 'Order';
                item.Timestamp = new Date(item.Timestamp).getTime();
                results.push(item);
            });

            zipItUp(results, 'ClaimCategoryOptions')
                .then(function(blob) {
                    deferred.resolve(blob);
                });
        });

        return deferred.promise;
    }

    function _firebaseToAzureClaims() {
        var deferred = $q.defer();
        var results = [];

        var ref = new Firebase(firebaseurl + '/Claims');
        ref.on('value', function(data) {
            angular.forEach(data.val(), function(item, key) {
                if (key.indexOf('SoldTo') > -1) {
                    angular.forEach(item, function(claim, k) {
                        if (claim.ID && claim.Category && claim.SubCategory) {
                            var c = {
                                ID: claim.ID,
                                Type: claim.Type,
                                Description: claim.Description,
                                Details: claim.Details,
                                CustomerName: claim.CustomerName,
                                OrderID: claim.OrderID,
                                Private: claim.Private,
                                Status: claim.Status,
                                Timestamp: new Date(claim.Timestamp).getTime(),
                                FromUser: {
                                    ID: claim.FromUser.ID,
                                    Email: claim.FromUser.Email,
                                    Username: claim.FromUser.Username,
                                    FirstName: claim.FromUser.FirstName,
                                    LastName: claim.FromUser.LastName,
                                    AccessLevel: claim.FromUser.xp.AccessLevel
                                },
                                Salon: {
                                    ID: claim.Salon.ID,
                                    Name: claim.Salon.Name,
                                    xp: {
                                        POD: {
                                            ID: claim.Salon.xp.PODID,
                                            Name: claim.Salon.xp.PODName
                                        },
                                        Region: {
                                            ID: claim.Salon.xp.RegionID,
                                            Name: claim.Salon.xp.RegionName
                                        },
                                        SalesPerson: {
                                            ID: claim.Salon.xp.SalesPersonID,
                                            Name: claim.Salon.xp.SalesPersonName
                                        }
                                    }
                                },
                                Category: {
                                    Name: claim.Category.Name
                                },
                                SubCategory: {
                                    Name: claim.SubCategory.Name,
                                    ParentID: claim.SubCategory.ParentID
                                }
                            };

                            if (claim.LineItems && claim.LineItems.length) {
                                c.LineItems = [];
                                angular.forEach(claim.LineItems, function(lineItem, itemID) {
                                    if (lineItem.ID) {
                                        var item = {
                                            ID: lineItem.ID,
                                            OrderID: lineItem.OrderID,
                                            Quantity: lineItem.Quantity,
                                            ClaimQuantity: lineItem.ClaimQuantity,
                                            Details: lineItem.Details,
                                            Product: {
                                                ID: lineItem.Product.ID,
                                                Name: lineItem.Product.Name,
                                                QuantityMultiplier: lineItem.Product.QuantityMultiplier,
                                                StandardPriceSchedule: {
                                                    ID: lineItem.Product.StandardPriceSchedule.ID,
                                                    PriceBreaks: [
                                                        {Price: lineItem.Product.StandardPriceSchedule.PriceBreaks[0].Price}
                                                    ]
                                                },
                                                xp: {
                                                    UPC: lineItem.Product.xp.UPC,
                                                    Size: lineItem.Product.xp.Size
                                                }
                                            },
                                            xp: {
                                                Usage: lineItem.xp.Usage
                                            }
                                        };
                                        c.LineItems.push(item);
                                    }
                                });
                            }

                            results.push(c);
                        }
                    });
                }
            });

            zipItUp(results, 'Claims')
                .then(function(blob) {
                    deferred.resolve(blob);
                });
        });

        return deferred.promise;
    }

    function zipItUp(items, resourceName) {
        var d = $q.defer();

        var zip = new JSZip();

        angular.forEach(items, function(item) {
            var fileName = resourceName + '-' + item.ID + '.json';
            zip.file(fileName, JSON.stringify(item));
        });

        zip.generateAsync({type:"blob"})
            .then(function (blob) {
                d.resolve(blob);
            });

        return d.promise;
    }

    function unzipIt(content) {
        var d = $q.defer();

        var result = [];
        var queue = [];

        angular.forEach(content.files, function(data, key) {
            queue.push((function() {
                var df = $q.defer();

                content.file(key).async("string")
                    .then(function(file) {
                        try {
                            var f = JSON.parse(file);
                            if (f.ID) {
                                f.id = f.ID;
                                delete f.ID;
                            }
                            result.push(f);
                            df.resolve();
                        }
                        catch(e) {
                            df.resolve();
                        }
                    });

                return df.promise;
            })());
        });

        $q.all(queue).then(function() {
            d.resolve(result);
        });

        return d.promise;
    }

    function _moveDataFromFirebaseToAzureDocDB(collection) {
        var deferred = $q.defer();

        var resources;
        var results = [];

        var progress = ['Gathering ' + collection + ' from Firebase'];

        $timeout(function() {
            getResources();
        }, 1000);

        var getFn;

        function getResources() {
            deferred.notify(progress);
            switch(collection.toLowerCase()) {
                case 'updates':
                    getFn = _firebaseToAzureUpdates;
                    break;
                case 'notes':
                    getFn = _firebaseToAzureNotes;
                    break;
                case 'news':
                    getFn = _firebaseToAzureNews;
                    break;
                case 'claimcategoryoptions':
                    getFn = _firebaseToAzureClaimCategoryOptions;
                    break;
                case 'claims':
                    getFn = _firebaseToAzureClaims;
                    break;
            }

            getFn()
                .then(function(zip) {
                    var resourceUnzip = new JSZip();
                    resourceUnzip.loadAsync(zip)
                        .then(function(content) {
                            unzipIt(content)
                                .then(function(resourceResult) {
                                    resources = resourceResult;
                                    createResources();
                                });
                        });
                });
        }

        var createQueue = [];
        var createQueueIndex = 0;
        var createQueueLength;

        function createCollectionQueue(collection, documents) {
            var i, j, documentChunks = [], chunkLimit = 100;

            for (i = 0, j = documents.length; i < j; i += chunkLimit) {
                documentChunks.push(documents.slice(i, i + chunkLimit));
            }

            var documentChunksLength = documentChunks.length;
            angular.forEach(documentChunks, function(docSubSet, chunkIndex) {
                createQueue.push((function() {
                    var d = $q.defer();

                    progress.push('Creating chunk ' + (chunkIndex + 1) + ' of ' + documentChunksLength + ' of collection: ' + collection);
                    deferred.notify(progress);

                    AzureService.StoredProcedure.BulkUploadDocuments(collection, {documents: docSubSet})
                        .then(function(result) {
                            results.push(result);
                            d.resolve();
                        })
                        .catch(function(ex) {
                            results.push(ex);
                            d.resolve();
                        });

                    return d.promise;
                }));
            });
        }

        function run(index) {
            createQueue[index]()
                .then(function() {
                    createQueueIndex++;

                    if (createQueueIndex < createQueueLength) {
                        run(createQueueIndex);
                    }
                    else {
                        finish(results);
                    }
                });
        }

        function createResources() {
            progress.push('Creating ' + collection + ' on Azure DocDB');
            deferred.notify(progress);
            createCollectionQueue(collection, resources);
            createQueueLength = createQueue.length;
            if (createQueueLength > 0) {
                run(createQueueIndex);
            }
            else {
                finish({Data: 'There was nothing to create for ' + collection});
            }
        }

        function finish(response) {
            deferred.resolve(response);
        }

        return deferred.promise;
    }

    function _deleteAzureDocDBData() {
        var deferred = $q.defer();

        //This will serve as the response to know the success/error counts for each resource
        var results = {
            Updates: {Done: false, Results: [], RunCount: 0},
            News: {Done: false, Results: [], RunCount: 0},
            Notes: {Done: false, Results: [], RunCount: 0},
            ClaimCategoryOptions: {Done: false, Results: [], RunCount: 0},
            Claims: {Done: false, Results: [], RunCount: 0}
        };

        function run() {
            if (!results.Updates.Done) {
                AzureService.StoredProcedure.BulkDeleteDocuments('updates')
                    .then(function(result) {
                        results.Updates.Results.push(result);
                        results.Updates.RunCount++;
                        results.Updates.Done = (result.Data.Results.Successful != 100);
                        deleteNews();
                    })
                    .catch(function(ex) {
                        deferred.reject(ex);
                    });
            }
            else {
                deleteNews();
            }
            

            function deleteNews() {
                if (!results.News.Done) {
                    AzureService.StoredProcedure.BulkDeleteDocuments('news')
                        .then(function(result) {
                            results.News.Results.push(result);
                            results.News.RunCount++;
                            results.News.Done = (result.Data.Results.Successful != 100);
                            deleteNotes();
                        })
                        .catch(function(ex) {
                            deferred.reject(ex);
                        });
                }
                else {
                    deleteNotes();
                }
            }

            function deleteNotes() {
                if (!results.Notes.Done) {
                    AzureService.StoredProcedure.BulkDeleteDocuments('notes')
                        .then(function(result) {
                            results.Notes.Results.push(result);
                            results.Notes.RunCount++;
                            results.Notes.Done = (result.Data.Results.Successful != 100);
                            deleteClaimCategoryOptions();
                        })
                        .catch(function(ex) {
                            deferred.reject(ex);
                        });
                }
                else {
                    deleteClaimCategoryOptions();
                }
            }

            function deleteClaimCategoryOptions() {
                if (!results.ClaimCategoryOptions.Done) {
                    AzureService.StoredProcedure.BulkDeleteDocuments('claimcategoryoptions')
                        .then(function(result) {
                            results.ClaimCategoryOptions.Results.push(result);
                            results.ClaimCategoryOptions.RunCount++;
                            results.ClaimCategoryOptions.Done = (result.Data.Results.Successful != 100);
                            deleteClaims();
                        })
                        .catch(function(ex) {
                            deferred.reject(ex);
                        });
                }
                else {
                    deleteClaims();
                }
            }

            function deleteClaims() {
                if (!results.Claims.Done) {
                    AzureService.StoredProcedure.BulkDeleteDocuments('claims')
                        .then(function(result) {
                            results.Claims.Results.push(result);
                            results.Claims.RunCount++;
                            results.Claims.Done = (result.Data.Results.Successful != 100);
                            finish();
                        })
                        .catch(function(ex) {
                            deferred.reject(ex);
                        });
                }
                else {
                    finish();
                }
            }
        }

        run();

        function finish() {
            var done = true;
            angular.forEach(results, function(data, col) {
                if (!data.Done) {
                    done = false;
                }
            });
            if (done) {
                deferred.resolve(results);
            }
            else {
                run();
            }
        }

        return deferred.promise;
    }

    function _createAvedaHierarchyDocument() {
        var deferred = $q.defer();

        var avedaSalons = [];
        var pageCount = 1;
        var hierarchy = {
            id: 'AvedaHierarchy'
        };

        gatherAllSalons();

        function gatherAllSalons() {
            var opts = {search : 'SoldTo-', page: pageCount, pageSize: 100};
            OrderCloudSDK.UserGroups.List(buyerid, opts).then(function(data) {
                avedaSalons = avedaSalons.concat(data.Items);
                //as long as there are more pages of salons to load, recursively call gatherAllSalons after increasing pageCount
                if (data.Meta.TotalPages > data.Meta.Page) {
                    pageCount++;
                    gatherAllSalons();
                } else {
                    buildHierarchyReference(avedaSalons);
                    createHierarchyDocument();
                }
            });
        }

        function buildHierarchyReference(salons) {
            hierarchy.Regions = {};
            hierarchy.PODs = {};
            hierarchy.SDPs = {};
            hierarchy.SalonTypes = [];
            hierarchy.Plants = [];
            angular.forEach(salons, function(salon) {
                if (!salon.xp) return;
                if (salon.xp && typeof(salon.xp) == 'string') salon.xp = JSON.parse(salon.xp);
                if (salon.xp && !hierarchy.Regions[salon.xp.RegionID] && salon.xp.RegionName) {
                    hierarchy.Regions[salon.xp.RegionID] = {ID: salon.xp.RegionID, Name: salon.xp.RegionName};
                }
                if (salon.xp && !hierarchy.PODs[salon.xp.PODID] && salon.xp.PODName) {
                    hierarchy.PODs[salon.xp.PODID] = {
                        ID: salon.xp.PODID,
                        Name: salon.xp.PODName,
                        Region: {ID: salon.xp.RegionID, Name: salon.xp.RegionName}
                    };
                }
                if (salon.xp && !hierarchy.SDPs[salon.xp.SalesPersonID] && salon.xp.SalesPersonName) {
                    hierarchy.SDPs[salon.xp.SalesPersonID] = {
                        ID: salon.xp.SalesPersonID,
                        Name: salon.xp.SalesPersonName,
                        Region: {ID: salon.xp.RegionID, Name: salon.xp.RegionName},
                        POD: {ID: salon.xp.PODID, Name: salon.xp.PODName}
                    };
                }
                if (salon.xp && salon.xp.Classification && Underscore.pluck(hierarchy.SalonTypes, 'Type').indexOf(salon.xp.Classification) == -1) {
                    hierarchy.SalonTypes.push({Type: salon.xp.Classification});
                }
                if (salon.xp && salon.xp.DeliveryPlant && Underscore.pluck(hierarchy.Plants, 'Plant').indexOf(salon.xp.DeliveryPlant) == -1) {
                    hierarchy.Plants.push({Plant: salon.xp.DeliveryPlant});
                }
            });
        }

        function createHierarchyDocument() {
            AzureService.AvedaHierarchy.Create(hierarchy)
                .then(function(data) {
                    deferred.resolve(data.Data);
                })
                .catch(function(ex) {
                    deferred.reject(ex);
                });
        }

        return deferred.promise;
    }

    return service;
}

function AdminDataWarehouseController($rootScope, $filter, $uibModal, $stateParams, toastr, AdminDataWarehouseService, CurrentUser, environment) {
    var vm = this;
    vm.currentUser = CurrentUser;
    vm.environment = environment.toLowerCase();
    vm.override = false;
    vm.options = {
        OrderCount: null,
        AllOrders: false,
        LineItemStructure: 'Single'
    };

    vm.tab = $stateParams.tab ? $stateParams.tab : 'warehouse';

    vm.setTab = function(tab) {
        vm.tab = tab;
    };

    vm.generateJSON = function(resource) {
        if (AdminDataWarehouseService[resource]) {
            $rootScope.loading = {
                message: 'Generating ' + resource + ' JSON...'
            };
            $rootScope.loading.promise = AdminDataWarehouseService[resource](vm.options)
                .then(function(blob) {
                    var now = new Date();
                    var fileName = resource + '-' + $filter('date')(now, 'MMddyyyy') + '.zip';
                    saveAs(blob, fileName);
                    vm.options.OrderCount = null;
                    vm.options.AllOrders = false;
                });
        }
        else {
            toastr.error('The ' + resource + ' resource is currently not available.')
        }
    };

    vm.FirebaseToAzure = function(resource) {
        if (AdminDataWarehouseService['FirebaseToAzure' + resource]) {
            $rootScope.loading = {
                message: 'Generating ' + resource + ' JSON...'
            };
            $rootScope.loading.promise = AdminDataWarehouseService['FirebaseToAzure' + resource]()
                .then(function(blob) {
                    var now = new Date();
                    var fileName = resource + '-' + $filter('date')(now, 'MMddyyyy') + '.zip';
                    saveAs(blob, fileName);
                });
        }
        else {
            toastr.error('The ' + resource + ' resource is currently not available.');
        }
    };

    vm.orderCountChange = function() {
        if (vm.options.AllOrders) {
            var c = confirm('Are you sure you want to get ALL orders?');
            if (c) {
                vm.options.AllOrders = true;
                vm.options.OrderCount = null;
            }
            else {
                vm.options.AllOrders = false;
            }
        }
        else {
            vm.options.AllOrders = false;
        }
    };

    vm.openConsole = function() {
        var modelInstance = $uibModal.open({
            animation: false,
            templateUrl: 'adminDataWarehouse/templates/adminDataWarehouse.console.modal.tpl.html',
            controller: 'AdminDataWarehouseConsoleCtrl',
            controllerAs: 'adminDataWarehouseConsole',
            size: 'category'
        });
    };

    vm.azureResults = null;
    vm.azureProgress = [];
    vm.movingData = false;
    vm.collectionsCreated = [];
    vm.moveProductionData = function(collection) {
        vm.movingData = false;
        if (vm.override) {
            moveProductionData(collection);
        }
        else {
            var username = prompt('Please enter your username');
            if (username == vm.currentUser.Username) {
                var confirm = window.confirm('Are you sure you want to move Production data from Firebase to Azure DocDB?');
                if (confirm) {
                    moveProductionData();
                }
                else {
                    toastr.info('Data move canceled');
                }
            }
            else {
                toastr.error('Incorrect username: ' + username);
            }
        }
    };

    function moveProductionData(collection) {
        vm.movingData = true;
        vm.azureProgress = [];
        AdminDataWarehouseService.MoveDataFromFirebaseToAzureDocDB(collection)
            .then(
                function(data) {
                    vm.azureResults = data;
                    vm.movingData = false;
                    vm.collectionsCreated.push(collection);
                },
                function(ex) {
                    vm.azureResults = ex;
                    vm.azureProgress = [];
                    vm.movingData = false;
                },
                function(progress) {
                    vm.azureProgress = progress;
                }
            );
    }

    vm.deleteAzureDocuments = function() {
        if (vm.override) {
            deleteData();
        }
        else {
            var username = prompt('Please enter your username');
            if (username == vm.currentUser.Username) {
                var confirm = window.confirm('Are you sure you want to delete Production data from Azure DocDB?');
                if (confirm) {
                    deleteData();
                }
                else {
                    toastr.info('Delete canceled');
                }
            }
            else {
                toastr.error('Incorrect username: ' + username);
            }
        }
    };

    function deleteData() {
        $rootScope.loading = {
            message: 'Deleting data Azure DocumentDB...'
        };
        $rootScope.loading.promise = AdminDataWarehouseService.DeleteAzureDocDBData()
            .then(function(data) {
                vm.azureResults = data;
            })
            .catch(function(ex) {
                vm.azureResults = ex;
            });
    }

    vm.createAvedaHierarchy = function() {
        $rootScope.loading = {
            message: 'Creating Aveda Hierarchy Document...'
        };
        $rootScope.loading.promise = AdminDataWarehouseService.CreateAvedaHierarchyDocument()
            .then(function(data) {
                vm.azureResults = data;
            })
            .catch(function(ex) {
                vm.azureResults = ex;
            });
    };
}

function AdminDataWarehouseConsoleController($uibModalInstance, AdminDataWarehouseService, apiurl) {
    var vm = this;
    vm.methods = ['GET', 'LIST', 'POST', 'PUT', 'PATCH', 'DELETE'];

    vm.request = {
        Method: 'GET',
        URL: apiurl + '/v1/'
    };

    vm.reset = function() {
        vm.results = null;
        vm.request = {
            Method: 'GET',
            URL: apiurl + '/v1/'
        };
    };

    vm.loading = false;
    vm.submit = function() {
        vm.loading = true;
        AdminDataWarehouseService.ConsoleSubmit(vm.request)
            .then(function(data) {
                vm.results = data;
                vm.loading = false;
            });
    };

    //$uibModalInstance.close();
}