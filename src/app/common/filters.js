angular.module('orderCloud.filters', [])
    .filter('avedaCostCenters', avedaCostCenters)
    .filter('avedaCostCenterName', avedaCostCenterName)
    .filter('avedaApprovalRule', avedaApprovalRule)
    .filter('avedaSoldToID', avedaSoldToID)
    .filter('avedaInternalUsersType', avedaInternalUsersType)
    .filter('dChainSpecificStatus', dChainSpecificStatus)
    .filter('promotionalProductID', promotionalProductID)
    .filter('productDescriptionKeywords', productDescriptionKeywords)
    .filter('orderObjectBy', orderObjectBy)
    .filter('categoryProductSearch', categoryProductSearch)
    .filter('xpStringToJSON', xpStringToJSON)
    .filter('orderType', orderType)
    .filter('paginate', paginate)
    .filter('creditcardfilter', creditcardfilter)
    .filter('removeDuplicates', removeDuplicates)
    .filter('CustomerGroupNumber', CustomerGroupNumber)
    .filter('avedaenvironment', avedaenvironment)
;

function xpStringToJSON() {
    return function(value) {
        function xpToJSON(model) {
            if (model.xp && typeof(model.xp) == 'string') {
                model.xp = JSON.parse(model.xp);
            }
        }
        if (!value.ID) {
            angular.forEach(value, xpToJSON)
        } else {
            xpToJSON(value);
        }
        return value;
    }
}

function avedaCostCenters(Underscore) {
    return function(costCenters) {
        return Underscore.filter(costCenters, function(cc) {
            if (cc.ID.indexOf('AvedaCostCenter-') == 0) {
                return cc;
            }
        });
    }
}

function avedaCostCenterName() {
    return function(name) {
        return name.split('-')[2];
    }
}

function avedaApprovalRule() {
    return function(name, type) {
        switch(type) {
            case 'FinanceHolidayLaunch':
                return $.trim(name.split('Approval-')[1].replace(/([A-Z])/g, ' $1')).replace(/ /g, ' and ');
            case 'CM':
                return 'Region ' + name.split('Approval-CM-')[1];
            case 'CostCenter':
                return name.replace('AvedaCostCenter-External-', '').replace('AvedaCostCenter-Internal-', '');
            default:
                return name;
        }
    }
}

function avedaSoldToID() {
    return function(id) {
        return id.replace('SoldTo-', '');
    }
}

function avedaInternalUsersType() {
    return function(accessLevel) {
        switch (accessLevel) {
            case 'CSR':
                return 'CSRs';
            case 'RegionVP':
                return 'Regional Vice Presidents';
            case 'POD':
                return 'POD Directors';
            case 'SDP':
                return 'Sales People';
            case 'Custom':
                return 'Aveda Users';
            default:
                return 'Unknown Access Level'
        }
    }
}

function dChainSpecificStatus() {
    var dChainMap = {
        '01': 'Inititation',
        '02': 'Reviewed',
        '03': 'Released',
        '04': 'Launch Event',
        '05': 'In-Line',
        '06': 'Phase Out',
        '07': 'Discontinued',
        '08': 'Inactive'
    };
    return function(value) {
        return dChainMap[value];
    }
}

function promotionalProductID() {
    return function(value) {
        return value.replace('-PROMOCOPY', '');
    }
}

function productDescriptionKeywords() {
    return function(value) {
        if (!value) return;
        return value.split(' <span id="keywords">')[0];
    }
}

function orderObjectBy() {
    return function(items, field, reverse) {
        var filtered = [];
        angular.forEach(items, function (item) {
            filtered.push(item);
        });
        filtered.sort(function (a, b) {
            return (a[field] > b[field] ? 1 : -1);
        });
        if (reverse) filtered.reverse();
        return filtered;
    };
}

function categoryProductSearch() {
    return function(products, searchTerm) {
        var results = [];
        if (!searchTerm) return products;

        angular.forEach(products, function(product) {
            if (product.Name.toLowerCase().indexOf(searchTerm) > -1 || (product.xp && product.xp.UPC && product.xp.UPC.toLowerCase().indexOf(searchTerm) > -1) || (product.xp.Size && product.xp.Size.indexOf(searchTerm) > -1)) {
                results.push(product);
            }
        });

        return results;
    }
}

function CustomerGroupNumber(){
    var map = {
        'Custom':'35',
        'Salon': '41',
        'All': '*'
    };
    return function(value){
        return map[value];
    }
}

function orderType() {
    var map = {
        'Basic': {
            Name: 'Basic Order',
            Code: 'ZOR'
        },
        'ClientDislike': {
            Name: 'Client Dislike',
            Code: 'ZCM'
        },
        'CostCenter': {
            Name: 'Cost Center Order',
            Code: 'ZCO'
        },
        'CreditMemo': {
            Name: 'Credit Memo',
            Code: 'ZCM'
        },
        'CustomizedMarketing': {
            Name: 'Customized Marketing Order',
            Code: 'ZOR'
        },
        'DebitMemo': {
            Name: 'Debit Memo',
            Code: 'ZDM'
        },
        'Holiday': {
            Name: 'Holiday Order',
            Code: 'ZEO'
        },
        'Launch': {
            Name: 'Launch Order',
            Code: 'ZEO'
        },
        'MultipleOneFreight': {
            Name: 'Multiple Order One Freight',
            Code: 'ZOR'
        },
        'Replenishment': {
            Name: 'Replenishment Order',
            Code: 'ZEO'
        },
        'Return': {
            Name: 'Return',
            Code: 'ZRT'
        }
    };
    return function(type, mapType) {
        if (mapType == 'Name' && map[type]) {
            return map[type].Name;
        } else if (map[type]) {
            return map[type].Code;
        }
        else {
            return 'Order';
        }
    }
}

function paginate() {
    return function(input, start) {
        if (typeof input != 'object' || !input) return;
        start = +start; //parse to int
        return input.slice(start);
    }
}

function creditcardfilter() {
    return function(creditCards, filters) {
        var result = [];

        angular.forEach(creditCards, function(cc) {
            var addCard = true;

            if (filters.SalonTerm) {
                addCard = cc.xp.Salon && (cc.xp.Salon.Name.indexOf(filters.SalonTerm) > -1 || cc.xp.Salon.ID.indexOf(filters.SalonTerm) > -1);
            }
            if (filters.Status) {
                addCard = addCard ? ((cc.xp.Active && filters.Status == 'Active') || (!cc.xp.Active && filters.Status == 'Disabled')) : addCard;
            }
            if (filters.LastUsed && (filters.LastUsed.Start || filters.LastUsed.End)) {
                if (cc.xp.DateLastUsed) {
                    var lastUsed = new Date(cc.xp.DateLastUsed);
                    addCard = addCard ? ((!filters.LastUsed.Start || (lastUsed > filters.LastUsed.Start)) && (!filters.LastUsed.End || (lastUsed < filters.LastUsed.End))) : addCard;
                }
                else {
                    addCard = false;
                }
            }
            if (filters.CardType) {
                addCard = addCard ? (cc.CardType && cc.CardType == filters.CardType) : addCard;
            }
            if (filters.ExpDate && (filters.ExpDate.Start || filters.ExpDate.End)) {
                var xDate = new Date(cc.ExpirationDate);
                addCard = addCard ? ((!filters.ExpDate.Start || (xDate > filters.ExpDate.Start)) && (!filters.ExpDate.End || (xDate < filters.ExpDate.End))) : addCard;
            }

            if (addCard) result.push(cc);
        });

        return result;
    }
}

function removeDuplicates() {
    return function(approvalRules) {
        var result = [];
        var includedIDs = [];

        angular.forEach(approvalRules, function(ar) {
            if (includedIDs.indexOf(ar.ID) == -1) {
                includedIDs.push(ar.ID);
                result.push(ar);
            }
        });

        return result;
    }
}

function avedaenvironment() {
    return function(env) {
        var result = '';

        switch(env.toLowerCase()) {
            case 'prod':
                result = 'Production';
                break;
            case 'test':
            case 'newavedatest':
                result = 'Test';
                break;
            case 'qa':
                result = 'QA';
                break;
            default:
                result = env;
        }

        return result;
    }
}