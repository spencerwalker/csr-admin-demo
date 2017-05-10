angular.module('orderCloud.avedaFiles', [])
    .factory('AvedaFilesService', AvedaFilesService)
    .directive('avedafileupload', avedaFileUploadDirective)
    .directive('avedamultifileupload', avedaMultiFileUploadDirective)
;

function AvedaFilesService($q) {
    var service = {
        Get: _get,
        Upload: _upload,
        Delete: _delete
    };

    AWS.config.region = 'us-east-1';
    AWS.config.update({ accessKeyId: 'AKIAJPA3JBOTZ3JVGCQQ', secretAccessKey: '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' });

    function randomString() {
        var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        var string_length = 15;
        var randomstring = '';
        for (var i = 0; i < string_length; i++) {
            var rnum = Math.floor(Math.random() * chars.length);
            randomstring += chars.substring(rnum, rnum + 1);
        }
        return randomstring;
    }

    function _get(fileKey) {
        var deferred = $q.defer();
        var s3 = new AWS.S3();
        var params = {Bucket: 'avedacare-images', Key: fileKey};
        s3.getObject(params, function (err, data) {
            err ? console.log(err) : console.log(data);
            deferred.resolve(data);
        });
        return deferred.promise;
    }

    function _upload(file) {
        var deferred = $q.defer();
        var s3 = new AWS.S3();
        var params = {Bucket: 'avedacare-images', Key: randomString(), ContentType: file.type, Body: file};
        s3.upload(params, function (err, data) {
            err ? console.log(err) : console.log(data);
            deferred.resolve(data);
        });
        return deferred.promise;
    }

    function _delete(fileKey) {
        var deferred = $q.defer();
        var s3 = new AWS.S3();
        var params = {Bucket: 'avedacare-images', Key: fileKey};
        s3.deleteObject(params, function (err, data) {
            err ? console.log(err) : console.log(data);
            deferred.resolve(data);
        });
        return deferred.promise;
    }

    return service;
}

function avedaFileUploadDirective($parse, Underscore, toastr) {

    var directive = {
        scope: {
            object: '=',
            extensions: '@',
            invalidExtension: '@'
        },
        restrict: 'E',
        templateUrl: 'common/fileUpload/avedaFiles.tpl.html',
        replace: true,
        link: link
    };

    function link(scope, element, attrs) {
        var file_input = $parse("file");
        var el = element;

        var allowed = {
            Extensions: [],
            Types: []
        };
        if (scope.extensions) {
            var items = Underscore.map(scope.extensions.split(','), function (ext) {
                return ext.replace(/ /g, '').replace(/\./g, '').toLowerCase()
            });
            angular.forEach(items, function (item) {
                if (item.indexOf('/') > -1) {
                    if (item.indexOf('*') > -1) {
                        allowed.Types.push(item.split('/')[0]);
                    }
                    else {
                        allowed.Extensions.push(item.split('/')[1]);
                    }
                }
                else {
                    allowed.Extensions.push(item);
                }
            });
        }

        function afterSelection(file) {
            scope.object.Image = {
                Name: file.name,
                File: file
            };
            scope.object.ImageUpdated = true;
            scope.$apply();
        }

        function updateModel(event) {
            switch (event.target.name) {
                case 'upload':
                    if (event.target.files[0] == null) return;
                    var file = event.target.files[0];
                    var valid = true;
                    if ((allowed.Extensions.length || allowed.Types.length) && file.name) {
                        var ext = file.name.split('.').pop().toLowerCase();
                        valid = (allowed.Extensions.indexOf(ext) != -1 || allowed.Types.indexOf(event.target.files[0].type.split('/')[0]) > -1);
                    }
                    if (valid) {
                        afterSelection(file);
                        file_input.assign(scope, event.target.files[0]);
                    } else {
                        scope.$apply(function() {
                            toastr.error('Sorry, that file type is not allowed.');
                            var input;
                            event.target.files[0] = null;
                            el.find('input').replaceWith(input = el.find('input').clone(true));
                            if (!scope.object.xp) scope.object.xp = {};
                            scope.object.xp[scope.Image] = null;
                        });
                    }
                    break;
            }
        }

        element.bind('change', updateModel);
    }

    return directive;
}

function avedaMultiFileUploadDirective($parse, Underscore, toastr, AvedaFilesService) {

    var directive = {
        scope: {
            object: '=',
            extensions: '@',
            invalidExtension: '@'
        },
        restrict: 'E',
        templateUrl: 'common/fileUpload/avedaMultiFiles.tpl.html',
        replace: true,
        link: link
    };

    function link(scope, element, attrs) {
        var file_input = $parse("file");
        var el = element;

        var allowed = {
            Extensions: [],
            Types: []
        };

         scope.uploadFile = function(){
            if(scope.object.Image && scope.object.Image.File){
                AvedaFilesService.Upload(scope.object.Image.File)
                    .then(function(imgData) {
                        var file = {
                            DisplayName: scope.object.Image.File.name,
                            ID: imgData.Key,
                            URL: imgData.Location
                        };
                        scope.object.Files.push(file);
                        scope.object.ImageUpdated = true;
                    });
            }
        }
        scope.removeFile = function(file){
            var confirmation = confirm("Do you wish to remove " + file.DisplayName + "?");
            if(confirmation){
                AvedaFilesService.Delete(file.ID);
                var tempFiles = [];
                angular.forEach(scope.object.Files,function(curfile){
                    if(curfile.ID != file.ID){
                        tempFiles.push(curfile);
                    }
                });
                scope.object.Files = tempFiles;
                scope.object.ImageUpdated = false;
            }
        }
        if (scope.extensions) {
            var items = Underscore.map(scope.extensions.split(','), function (ext) {
                return ext.replace(/ /g, '').replace(/\./g, '').toLowerCase()
            });
            angular.forEach(items, function (item) {
                if (item.indexOf('/') > -1) {
                    if (item.indexOf('*') > -1) {
                        allowed.Types.push(item.split('/')[0]);
                    }
                    else {
                        allowed.Extensions.push(item.split('/')[1]);
                    }
                }
                else {
                    allowed.Extensions.push(item);
                }
            });
        }

        function afterSelection(file) {
            scope.object.Image = {
                Name: file.name,
                File: file
            };
            var confirmation = confirm("Do you wish to upload " + file.name + "?");
            if(confirmation){
                scope.uploadFile();
            }
        }

        function updateModel(event) {
            switch (event.target.name) {
                case 'upload':
                    if (event.target.files[0] == null) return;
                    var file = event.target.files[0];
                    var valid = true;
                    if ((allowed.Extensions.length || allowed.Types.length) && file.name) {
                        var ext = file.name.split('.').pop().toLowerCase();
                        valid = (allowed.Extensions.indexOf(ext) != -1 || allowed.Types.indexOf(event.target.files[0].type.split('/')[0]) > -1);
                    }
                    if (valid) {
                        afterSelection(file);
                        file_input.assign(scope, event.target.files[0]);
                    } else {
                        scope.$apply(function() {
                            toastr.error('Sorry, that file type is not allowed.');
                            var input;
                            event.target.files[0] = null;
                            el.find('input').replaceWith(input = el.find('input').clone(true));
                            if (!scope.object.xp) scope.object.xp = {};
                            scope.object.xp[scope.Image] = null;
                        });
                    }
                    break;
            }
        }

        element.bind('change', updateModel);
    }

    return directive;
}