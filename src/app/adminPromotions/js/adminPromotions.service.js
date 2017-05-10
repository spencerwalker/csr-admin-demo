angular.module('orderCloud')
    .factory('AdminPromotionsService', AdminPromotionsService)
;

function AdminPromotionsService($q, $uibModal, OrderCloudSDK, AvedaFilesService, buyerid, catalogid) {
    var service = {
        Create: _create,
        GetPromotions: _getPromotions,
        Get: _get,
        Update: _update,
        EditAssignments: _editAssignments,
        Delete: _delete,
        AddProduct: _addProduct
    };

    function _create(promotion, products) {
        var deferred = $q.defer();

        function assignPromotion(promotion) {
            var assignment = {
                BuyerID: buyerid,
                CategoryID: promotion.ID
            };
            OrderCloudSDK.Categories.SaveAssignment(catalogid, assignment)
                .then(function() {
                    deferred.resolve(promotion);
                });
        }

        if (promotion.Image && promotion.Image.File) {
            saveImage();
        } else {
            createPromo();
        }

        function saveImage() {
            AvedaFilesService.Upload(promotion.Image.File)
                .then(function(imgData) {
                    if (promotion.xp) {
                        promotion.xp.Image = {
                            ID: imgData.Key,
                            URL: imgData.Location
                        };
                    }
                    else {
                        promotion.xp = {
                            Image: {
                                ID: imgData.Key,
                                URL: imgData.Location
                            }
                        }
                    }
                    createPromo();
                });
        }

        function createPromo() {
            if (!promotion.xp) promotion.xp = {};
            promotion.xp.Promo = [];
            angular.forEach(products, function(product) {
                promotion.xp.Promo.push({
                    ID: product.ID,
                    Quantity: product.Quantity,
                    Free: product.Free
                });
            });

            OrderCloudSDK.Categories.Create(catalogid, promotion)
                .then(assignPromotion);
        }

        return deferred.promise;
    }

    function _getPromotions(tree) {
        var deferred = $q.defer();

        function gatherPromotions(promoCategories) {
            var d = $q.defer();

            var productQueue = [];
            angular.forEach(promoCategories, function(promotion) {
                promotion.isActive = checkPromotionActive(promotion);
                angular.forEach(promotion.xp.Promo, function(item) {
                    productQueue.push((function() {
                        var pq = $q.defer();
                        OrderCloudSDK.Products.Get(item.ID)
                            .then(function(product) {
                                item.FullProduct = product;
                                pq.resolve()
                            });
                        return pq.promise;
                    })());
                });
            });

            function checkPromotionActive(p) {
                var today = new Date(),
                    startDate = new Date(p.xp.StartDate),
                    endDate = new Date(p.xp.EndDate);
                return (startDate < today) && (endDate > today);
            }

            $q.all(productQueue).then(function() {
                d.resolve(promoCategories);
            });

            return d.promise;
        }

        gatherPromotions(_.filter(_.where(tree, {ID: 'AvedaPromotionsRoot'})[0].children, function(promo) { return promo.xp && !promo.xp.Deleted }))
            .then(function(promotions) {
                deferred.resolve(promotions);
            });

        return deferred.promise;
    }

    function _get(id) {
        var deferred = $q.defer();
        OrderCloudSDK.Categories.Get(catalogid, id).then(function(data) {
            var productQueue = [];
            angular.forEach(data.xp.Promo, function(item) {
                var _deferred = $q.defer();
                OrderCloudSDK.Products.Get(item.ID)
                    .then(function(product) {
                        item.FullProduct = product;
                        _deferred.resolve()
                    });
                productQueue.push(_deferred.promise);
            });
            $q.all(productQueue).then(function() {
                deferred.resolve(data);
            })
        });
        return deferred.promise;
    }

    function _update(promotion, selectedProducts) {
        var deferred = $q.defer();

        if (promotion.ImageUpdated) {
            updateImage();
        }
        else {
            updatePromo();
        }

        function updateImage() {
            AvedaFilesService.Upload(promotion.Image.File)
                .then(function(imgData) {
                    if (promotion.xp) {
                        promotion.xp.Image = {
                            ID: imgData.Key,
                            URL: imgData.Location
                        };
                    }
                    else {
                        promotion.xp = {
                            Image: {
                                ID: imgData.Key,
                                URL: imgData.Location
                            }
                        }
                    }
                    updatePromo();
                });
        }

        function updatePromo() {
            promotion.xp.Promo = [];
            angular.forEach(selectedProducts, function(product) {
                promotion.xp.Promo.push({
                    ID: product.ID,
                    Quantity: product.Quantity,
                    Free: product.Free
                });
            });
            OrderCloudSDK.Categories.Update(catalogid, promotion.ID, promotion)
                .then(function(p) {
                    deferred.resolve(p);
                });
        }

        return deferred.promise;
    }

    function _editAssignments(assignments) {
        var deferred = $q.defer();
        var assignmentsObj = assignments ? assignments : {};

        var assignmentModalInstance = $uibModal.open({
            templateUrl: 'adminPromotions/templates/adminPromotions.assignments.tpl.html',
            controller: 'PromotionAssignmentsCtrl',
            controllerAs: 'promotionAssignments',
            size: 'infoAssignment',
            resolve: {
                AssignmentsObj: function() {
                    return assignmentsObj;
                },
                Hierarchy: function(AvedaHierarchy) {
                    return AvedaHierarchy.Get();
                }
            }
        });

        assignmentModalInstance.result.then(
            function(obj) {
                deferred.resolve(obj);
            }
        );

        return deferred.promise;
    }

    function _delete(promo) {
        //AVEDA-17351
        //Do not actually delete promotion so that we can still report on them
        promo.xp.Deleted = true;
        return OrderCloudSDK.Categories.Patch(catalogid, promo.ID, {xp: promo.xp});
    }

    function _addProduct() {
        var deferred = $q.defer();
        var modalAddProductInstance = $uibModal.open({
            templateUrl: 'adminPromotions/templates/adminPromotions.addProduct.tpl.html',
            controller: 'PromotionAddProductCtrl',
            controllerAs: 'promotionAddProduct',
            size: 'category'
        });

        modalAddProductInstance.result.then(
            function(promoObj) {
                deferred.resolve(promoObj);
            }
        );
        return deferred.promise;
    }

    return service;
}