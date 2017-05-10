angular.module('orderCloud.avedaHierarchy', [])
    .factory('AvedaHierarchy', AvedaHierarchyService)
;

function AvedaHierarchyService($q, $filter, Underscore, AzureService, OrderCloudSDK, buyerid) {
    var service = {
        Update: _update,
        Get: _get,
        GetSalonsByLevel: _getSalonsByLevel,
        GetSalonsByCustomerGroup: _getSalonsByCustomerGroup
    };

    function _update() {
        var deferred = $q.defer();

        var avedaSalons = [];
        var pageCount = 1;
        var hierarchy = {
            id: 'AvedaHierarchy'
        };

        gatherAllSalons();

        function gatherAllSalons() {
            var opts ={ search: 'SoldTo-', page: pageCount, pageSize: 100 };
            OrderCloudSDK.UserGroups.List(buyerid, opts).then(function(data) {
                avedaSalons = avedaSalons.concat(data.Items);
                //as long as there are more pages of salons to load, recursively call gatherAllSalons after increasing pageCount
                if (data.Meta.TotalPages > data.Meta.Page) {
                    pageCount++;
                    gatherAllSalons();
                } else {
                    buildHierarchyReference(avedaSalons);
                    updateHierarchyDocument();
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

        function updateHierarchyDocument() {
            AzureService.AvedaHierarchy.Update(hierarchy)
                .then(function(data) {
                    deferred.resolve(data.Data);
                })
                .catch(function(ex) {
                    deferred.reject(ex);
                });
        }

        return deferred.promise;
    }

    var hierarchyCache;

    function _get() {
        var deferred = $q.defer();

        if (hierarchyCache) {
            deferred.resolve(hierarchyCache);
        }
        else {
            AzureService.AvedaHierarchy.Get()
                .then(function(data) {
                    hierarchyCache = data.Data;
                    deferred.resolve(hierarchyCache);
                });
        }

        return deferred.promise;
    }

    function _getSalonsByLevel(level, id) {
        var deferred = $q.defer();
        var salons = [];

        var filterKey = 'xp.' + level + 'ID';
        var filter = {};
        filter[filterKey] = id;

        function addNon35s(data) {
            data.Items = $filter('xpStringToJSON')(data.Items);
            salons = salons.concat(Underscore.filter(data.Items, function(salon){return (salon.xp && salon.xp.CustomerGroup != '35')}));
        }

        function findSalons() {
            var opts ={ search: 'SoldTo-', page: 1, pageSize: 100, searchOn: 'ID', filters: filter};
            OrderCloudSDK.UserGroups.List(buyerid, opts)
                .then(function(data) {
                    addNon35s(data);
                    var queue = [];
                    for (var i = 2; i <= data.Meta.TotalPages; i++) {
                        opts.page = i;
                        queue.push(OrderCloudSDK.UserGroups.List(buyerid, opts));
                    }
                    $q.all(queue).then(function(results) {
                        angular.forEach(results, function(d) {
                            addNon35s(d);
                        });
                        deferred.resolve(salons);
                    })
                });
        }
        findSalons();

        return deferred.promise;
    }

    function _getSalonsByCustomerGroup(groupNum) {
        var deferred = $q.defer(),
            salons = [],
            queue = [];
        var opts = {search : 'SoldTo-', page: 1, pageSize: 100, searchOn: 'ID', filters: {'xp.CustomerGroup': groupNum}};
        OrderCloudSDK.UserGroups.List(buyerid, opts )
            .then(function(data) {
                angular.forEach(data.Items, function(group) {
                    if (group.xp && typeof(group.xp) == 'string') group.xp = JSON.parse(group.xp);
                });
                salons = salons.concat(data.Items);
                for (var i = 2; i <= data.Meta.TotalPages; i++) {
                    opts.page = i;
                    queue.push(OrderCloudSDK.UserGroups.List(buyerid, opts));
                }
                $q.all(queue).then(function(results) {
                    angular.forEach(results, function(r) {
                        angular.forEach(r.Items, function(group) {
                            if (group.xp && typeof(group.xp) == 'string') group.xp = JSON.parse(group.xp);
                        });
                        salons = salons.concat(r.Items);
                    });
                    deferred.resolve(salons);
                })
            });

        return deferred.promise;
    }

    return service;
}