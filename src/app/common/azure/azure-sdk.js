angular.module('orderCloud')
    .factory('AzureService', AzureService)
;

function AzureService($resource, devapiurl) {
    var service = {
        Updates: Updates(),
        News: News(),
        ClaimCategoryOptions: ClaimCategoryOptions(),
        ClaimReasons: ClaimReasons(),
        AvedaHierarchy: AvedaHierarchy(),
        StoredProcedure: StoredProcedure()
    };

    var azureURL = devapiurl + '/azure';

    function Updates() {
        return {
            List: _list,
            Get: _get,
            Create: _create,
            Update: _update,
            Delete: _delete
        };

        function _list() {
            return $resource(azureURL + '/updates', {}, {call: {method: 'GET'}}).call().$promise;
        }

        function _get(updateid) {
            return $resource(azureURL + '/updates/:updateid', {updateid: updateid}, {call: {method: 'GET'}}).call().$promise;
        }

        function _create(update) {
            return $resource(azureURL + '/updates', {}, {call: {method: 'POST'}}).call(update).$promise;
        }

        function _update(updateid, update) {
            return $resource(azureURL + '/updates/:updateid', {updateid: updateid}, {call: {method: 'PUT'}}).call(update).$promise;
        }

        function _delete(updateid) {
            return $resource(azureURL + '/updates/:updateid', {updateid: updateid}, {call: {method: 'DELETE'}}).call().$promise;
        }
    }

    function News() {
        return {
            List: _list,
            Get: _get,
            Create: _create,
            Update: _update,
            Delete: _delete
        };

        function _list() {
            return $resource(azureURL + '/news', {}, {call: {method: 'GET'}}).call().$promise;
        }

        function _get(newsid) {
            return $resource(azureURL + '/news/:newsid', {newsid: newsid}, {call: {method: 'GET'}}).call().$promise;
        }

        function _create(news) {
            return $resource(azureURL + '/news', {}, {call: {method: 'POST'}}).call(news).$promise;
        }

        function _update(newsid, news) {
            return $resource(azureURL + '/news/:newsid', {newsid: newsid}, {call: {method: 'PUT'}}).call(news).$promise;
        }

        function _delete(newsid) {
            return $resource(azureURL + '/news/:newsid', {newsid: newsid}, {call: {method: 'DELETE'}}).call().$promise;
        }
    }

    function ClaimCategoryOptions() {
        return {
            List: _list,
            Get: _get,
            Create: _create,
            Update: _update,
            Delete: _delete
        };

        function _list(params) {
            return $resource(azureURL + '/claimcategoryoptions', params, {call: {method: 'GET'}}).call().$promise;
        }

        function _get(categoryid) {
            return $resource(azureURL + '/claimcategoryoptions/:categoryid', {categoryid: categoryid}, {call: {method: 'GET'}}).call().$promise;
        }

        function _create(category) {
            return $resource(azureURL + '/claimcategoryoptions', {}, {call: {method: 'POST'}}).call(category).$promise;
        }

        function _update(categoryid, category) {
            return $resource(azureURL + '/claimcategoryoptions/:categoryid', {categoryid: categoryid}, {call: {method: 'PUT'}}).call(category).$promise;
        }

        function _delete(categoryid) {
            return $resource(azureURL + '/claimcategoryoptions/:categoryid', {categoryid: categoryid}, {call: {method: 'DELETE'}}).call().$promise;
        }
    }

    function ClaimReasons() {
        return {
            List: _list,
            Update: _update
        };

        function _list(params) {
            return $resource(azureURL + '/claimreasons', params, {call: {method: 'GET'}}).call().$promise;
        }

        function _update(reason) {
            return $resource(azureURL + '/claimreasons', {}, {call: {method: 'PUT'}}).call(reason).$promise;
        }
    }

    function AvedaHierarchy() {
        return {
            Get: _get,
            Create: _create,
            Update: _update
        };

        function _get() {
            return $resource(azureURL + '/avedahierarchy', {}, {call: {method: 'GET'}}).call().$promise;
        }

        function _create(hierarchy) {
            return $resource(azureURL + '/avedahierarchy', {}, {call: {method: 'POST'}}).call(hierarchy).$promise;
        }

        function _update(hierarchy) {
            return $resource(azureURL + '/avedahierarchy', {}, {call: {method: 'PUT'}}).call(hierarchy).$promise;
        }
    }

    function StoredProcedure() {
        return {
            BulkUploadDocuments: _bulkUploadDocuments,
            BulkDeleteDocuments: _bulkDeleteDocuments
        };

        function _bulkUploadDocuments(collection, documents) {
            return $resource(azureURL + '/storedprocedures/bulkupload/:collection', {collection: collection}, {call: {method: 'POST'}}).call(documents).$promise;
        }

        function _bulkDeleteDocuments(collection) {
            return $resource(azureURL + '/storedprocedures/bulkdelete/:collection', {collection: collection}, {call: {method: 'POST'}}).call().$promise;
        }
    }

    return service;
}