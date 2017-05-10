var router = require('express').Router();
var q = require('q');
var documentClient = require("documentdb").DocumentClient;
var https = require('https');
var _ = require('underscore');
var SlackWebClient = require('@slack/client').WebClient;
var slack;
var config = require('../azure.config');

var client = new documentClient(config.endpoint, { "masterKey": config.primaryKey });
var databaseLink = 'dbs/' + config.database;

var collectionLink = databaseLink + '/colls/';


/* * Updates * */
//LIST
router.route('/updates')
    //LIST
    .get(function(req, res) {
        var querySpec = {
            query: 'SELECT * FROM Updates'
        };

        collectionQuery('updates', querySpec)
            .then(function(data) {
                res.status(200).json({Data: data});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
    //CREATE
    .post(function(req, res) {
        createDocument('updates', req.body)
            .then(function(update) {
                res.status(200).json({Data: update});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
;
router.route('/updates/:updateid')
    //GET
    .get(function(req, res) {
        var querySpec = {
            query: 'SELECT * FROM Updates WHERE Updates.id = @updateid',
            parameters: [
                {
                    name: '@updateid',
                    value: req.params.updateid
                }
            ]
        };

        collectionQuery('updates', querySpec)
            .then(function(data) {
                res.status(200).json({Data: data.length ? data[0] : data});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
    //UPDATE
    .put(function(req, res) {
        updateDocument('updates', req.params.updateid, req.body)
            .then(function(update) {
                res.status(200).json({Data: update});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
    //DELETE
    .delete(function(req, res) {
        deleteDocument('updates', req.params.updateid)
            .then(function(update) {
                res.status(200).json({Data: update});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
;


/* * News * */
router.route('/news')
    //LIST
    .get(function(req, res) {
        var querySpec = {
            query: 'SELECT * FROM News'
        };

        collectionQuery('news', querySpec)
            .then(function(data) {
                res.status(200).json({Data: data});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
    //CREATE
    .post(function(req, res) {
        createDocument('news', req.body)
            .then(function(news) {
                res.status(200).json({Data: news});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
;
router.route('/news/:newsid')
    //GET
    .get(function(req, res) {
        var querySpec = {
            query: 'SELECT * FROM News WHERE News.id = @newsID',
            parameters: [
                {
                    name: '@newsID',
                    value: req.params.newsid
                }
            ]
        };

        collectionQuery('news', querySpec)
            .then(function(data) {
                res.status(200).json({Data: data.length ? data[0] : data});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
    //UPDATE
    .put(function(req, res) {
        updateDocument('news', req.params.newsid, req.body)
            .then(function(news) {
                res.status(200).json({Data: news});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
    //DELETE
    .delete(function(req, res) {
        deleteDocument('news', req.params.newsid)
            .then(function(news) {
                res.status(200).json({Data: news});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
;


/* * Claim Category Options * */
router.route('/claimcategoryoptions')
    //LIST
    .get(function(req, res) {
        var querySpec = {
            query: 'SELECT * FROM ClaimCategoryOptions'
        };

        if (req.query.Type) {
            querySpec.query += ' WHERE ClaimCategoryOptions.Type = @type';
            querySpec.parameters = [
                {
                    name: '@type',
                    value: req.query.Type
                }
            ];
        }

        collectionQuery('claimcategoryoptions', querySpec)
            .then(function(data) {
                res.status(200).json({Data: data});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
    //CREATE
    .post(function(req, res) {
        createDocument('claimcategoryoptions', req.body)
            .then(function(category) {
                res.status(200).json({Data: category});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
;
router.route('/claimcategoryoptions/:categoryid')
    //GET
    .get(function(req, res) {
        var querySpec = {
            query: 'SELECT * FROM ClaimCategoryOptions WHERE ClaimCategoryOptions.id = @categoryid',
            parameters: [
                {
                    name: '@categoryid',
                    value: req.params.categoryid
                }
            ]
        };

        collectionQuery('claimcategoryoptions', querySpec)
            .then(function(data) {
                res.status(200).json({Data: data.length ? data[0] : data});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
    //UPDATE
    .put(function(req, res) {
        updateDocument('claimcategoryoptions', req.params.categoryid, req.body)
            .then(function(category) {
                res.status(200).json({Data: category});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
    //DELETE
    .delete(function(req, res) {
        deleteDocument('claimcategoryoptions', req.params.categoryid)
            .then(function(category) {
                res.status(200).json({Data: category});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
;

/* * Claim Reasons * */
router.route('/claimreasons')
    //LIST
    .get(function(req, res) {
        var querySpec = {
            query: 'SELECT * FROM Miscellaneous WHERE Miscellaneous.id = @claimReasons',
            parameters: [
                {
                    name: '@claimReasons',
                    value: 'ClaimReasons'
                }
            ]
        };

        collectionQuery('miscellaneous', querySpec)
            .then(function(data) {
                res.status(200).json({Data: data.length ? data[0] : data});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
    //CREATE
    .put(function(req, res) {
        updateDocument('miscellaneous', 'ClaimReasons', req.body)
            .then(function(reason) {
                res.status(200).json({Data: reason});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
;

router.route('/claimreasons/:reason')
    //DELETE
    .delete(function(req, res) {
        deleteDocument('miscellaneous', req.params.reason)
            .then(function(reason) {
                res.status(200).json({Data: reason});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
;

/* * Aveda Hierarchy * */
router.route('/avedahierarchy')
    //GET
    .get(function(req, res) {
        var querySpec = {
            query: 'SELECT * FROM Miscellaneous WHERE Miscellaneous.id = @hierarchyid',
            parameters: [
                {
                    name: '@hierarchyid',
                    value: 'AvedaHierarchy'
                }
            ]
        };

        collectionQuery('miscellaneous', querySpec)
            .then(function(data) {
                res.status(200).json({Data: data.length ? data[0] : data});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
    //CREATE - Used once
    .post(function(req, res) {
        createDocument('miscellaneous', req.body)
            .then(function(category) {
                res.status(200).json({Data: category});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
    //UPDATE
    .put(function(req, res) {
        updateDocument('miscellaneous', 'AvedaHierarchy', req.body)
            .then(function(hierarchy) {
                res.status(200).json({Data: hierarchy});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
;

router.route('/avedahierarchy/sync')
    .post(function(req, res) {
        var token;
        authenticateOrderCloud()
            .then(function(data) {
                token = data['access_token'];
                //kick off hierarchy update, but respond to call
                //this is called by an automated service and should never be end-user facing
                buildHierarchy(token);
                res.status(202).json({Data: 'Aveda Hierarchy Sync has been started'});
                    /*.then(function(hierarchy) {
                        res.status(200).json({Data: hierarchy});
                    });*/
            });
    })
;


/* * Stored Procedures * */
router.route('/storedprocedures/:sproc/:collection')
    .post(function(req, res) {
        execSproc(req.params.sproc, req.params.collection, req.body)
            .then(function(result) {
                res.status(200).json({Data: result});
            })
            .catch(function(ex) {
                res.status(400).json({Error: ex});
            });
    })
;


function collectionQuery(collection, querySpec) {
    var deferred = q.defer();

    client.queryDocuments(
        collectionLink + collection,
        querySpec
    ).toArray(function (err, results) {
        if (err) {
            deferred.reject(err);
        }
        else {
            deferred.resolve(results);
        }
    });

    return deferred.promise;
}

function createDocument(collection, document) {
    var deferred = q.defer();
    var url = collectionLink + collection;

    client.createDocument(url, document, function(err, created) {
        if (err) {
            deferred.reject(err);
        }
        else {
            deferred.resolve(created);
        }
    });

    return deferred.promise;
}

function updateDocument(collection, id, document) {
    var deferred = q.defer();
    var url = collectionLink + collection + '/docs/' + (id || document.id || document.ID);

    client.replaceDocument(url, document, function(err, updated) {
        if (err) {
            deferred.reject(err);
        }
        else {
            deferred.resolve(updated);
        }
    });

    return deferred.promise;
}

function deleteDocument(collection, id) {
    var deferred = q.defer();
    var url = collectionLink + collection + '/docs/' + id;

    client.deleteDocument(url, function(err, result) {
        if (err) {
            deferred.reject(err);
        }
        else {
            deferred.resolve(result);
        }
    });

    return deferred.promise;
}

function execSproc(sproc, collection, documents) {
    var deferred = q.defer();

    //dbs/:databaseid/colls/:collectionid/sprocs/:sprocid
    var url = collectionLink + collection + '/sprocs/' + sproc;

    //body must be an object -- cannot pass array of documents as the body
    var body = (documents && documents.length) ? {documents: documents} : documents; //body should look like: {documents: [{id: '1', Name: 'Ex1'}, {id: '2', Name: 'Ex2'}, {id: '3', Name: 'Ex3'}, ...]}

    client.executeStoredProcedure(url, body, function(err, result) {
        if (err) {
            deferred.reject(err);
        }
        else {
            deferred.resolve(result);
        }
    });

    return deferred.promise;
}

function authenticateOrderCloud() {
    var deferred = q.defer();

    var options = {
        host: config.integration.authURL,
        path: '/oauth/token',
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'text/html'
        }
    };

    var request = https.request(options, function(response) {
        var r = '';
        response.on('data', function(chunk) {
            r += chunk;
        });

        response.on('end', function() {
            deferred.resolve(JSON.parse(r));
        });
    });

    var body = 'client_id=' + config.integration.clientID + '&grant_type=client_credentials&client_secret=' + config.integration.clientSecret + '&scope=FullAccess';
    request.write(body);
    request.end();

    return deferred.promise;
}

function authenticateSlack() {
    var slackToken = config.integration.slackToken;
    slack = new SlackWebClient(slackToken);
}

function buildHierarchy(token) {
    var deferred = q.defer();

    var avedaSalons = [];
    var pageCount = 1;
    var hierarchy = {
        id: 'AvedaHierarchy'
    };

    gatherAllSalons();

    function gatherAllSalons() {
        var options = {
            host: config.integration.apiURL,
            path: '/v1/buyers/' + config.integration.buyerID + '/usergroups?search=SoldTo-&page=' + pageCount + '&pageSize=100',
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            }
        };

        var request = https.request(options, function(response) {
            var r = '';
            response.on('data', function(chunk) {
                r += chunk;
            });

            response.on('end', function() {
                var result = JSON.parse(r);
                avedaSalons = avedaSalons.concat(result.Items);
                if (result.Meta.TotalPages > result.Meta.Page) {
                    pageCount++;
                    gatherAllSalons();
                }
                else {
                    buildHierarchy(avedaSalons);
                    updateHierarchyDocument();
                }
            });
        });

        request.end();
    }

    function buildHierarchy(salons) {
        hierarchy.Regions = {};
        hierarchy.PODs = {};
        hierarchy.SDPs = {};
        hierarchy.SalonTypes = [];
        hierarchy.Plants = [];
        salons.forEach(function(salon) {
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
            if (salon.xp && salon.xp.Classification && _.pluck(hierarchy.SalonTypes, 'Type').indexOf(salon.xp.Classification) == -1) {
                hierarchy.SalonTypes.push({Type: salon.xp.Classification});
            }
            if (salon.xp && salon.xp.DeliveryPlant && _.pluck(hierarchy.Plants, 'Plant').indexOf(salon.xp.DeliveryPlant) == -1) {
                hierarchy.Plants.push({Plant: salon.xp.DeliveryPlant});
            }
        });
    }

    function updateHierarchyDocument() {
        hierarchy.DateLastUpdated = new Date().toString(); //Date/Time with timezone
        updateDocument('miscellaneous', 'AvedaHierarchy', hierarchy)
            .then(function(h) {
                updateSlack(true);
                deferred.resolve(h);
            })
            .catch(function(ex) {
                updateSlack(false);
                deferred.reject(ex);
            });
    }

    return deferred.promise;
}

function updateSlack(successful) {
    var slackChannel = config.integration.slackChannel;
    if (slackChannel && slackChannel != 'none') {
        authenticateSlack();
        var message = (successful ? ':white_check_mark:' : ':x:') + ' Aveda Hierarchy update on Azure DocDB ' + (successful ? 'was *successful*' : '*failed*') + ' on ' + (config.database == 'aveda-test' ? '*Test*' : '*Production*');
        slack.chat.postMessage(slackChannel, message);
    }
}

module.exports = router;
