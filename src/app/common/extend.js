angular.module('orderCloud.extend', [])
    .factory('Extend', AvedaExtend)
;

function AvedaExtend() {
    var service = {
        Categories: _categories
    };

    function _categories(data) {
		if (data.Items) {
			angular.forEach(data.Items, function (item) {
				item.CurrentID = item.ID;
			});
		}
		else {
			data.CurrentID = data.ID;
		}
    }

    return service;
}