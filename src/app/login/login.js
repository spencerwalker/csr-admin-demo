angular.module('orderCloud.login', ['ui.router'])
	.config(LoginConfig)
	.controller( 'LoginCtrl', LoginController)
;

function LoginConfig($stateProvider, $urlMatcherFactoryProvider) {
	$urlMatcherFactoryProvider.strictMode(false);
	$stateProvider.state( 'login', {
		url: '/login/:token',
		templateUrl: 'login/templates/login.tpl.html',
		controller: 'LoginCtrl',
		controllerAs: 'login',
		data: {pageTitle: 'Login'}
	});
}


function LoginController($state, $stateParams, $exceptionHandler, toastr, OrderCloudSDK, LoginService, TokenRefresh, ocRolesService, clientid, buyerid, scope) {
    var vm = this;
    vm.credentials = {
        Username: null,
        Password: null
    };
    vm.token = $stateParams.token;
    vm.form = vm.token ? 'reset' : 'login';
    vm.setForm = function(form) {
        vm.form = form;
    };
    vm.rememberStatus = false;


    vm.resetPasswordToken = $stateParams.token;

	vm.submit = function(creds) {

        vm.loading =  OrderCloudSDK.Auth.Login(vm.credentials.Username, vm.credentials.Password, clientid, scope, buyerid)
            .then(function(data){
                OrderCloudSDK.SetToken(data.access_token);
                vm.rememberStatus ? TokenRefresh.SetToken(data.refresh_token) : angular.noop();
                var roles = ocRolesService.Set(data.access_token);
                if (roles.length == 1 && roles[0] == 'PasswordReset') {
                    vm.token = data.access_token;
                    vm.form = 'resetByToken';
                } else {
                    $state.go('base.dashboard');
                }

            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            });
	};

	vm.setForm = function(form) {
		vm.form = form;
	};

	vm.forgotPassword = function(emailAddress) {
		vm.forgotPasswordMessage = null;
		LoginService.SendVerificationCode(emailAddress)
			.then(function() {
				vm.forgotPasswordMessage = 'Verification sent';
				vm.forgotPasswordEmail = null;
			})
			.catch(function(ex) {
				console.log(ex);
			});
	};

	vm.resetPassword = function(resetPasswordCreds) {
		LoginService.ResetPassword(resetPasswordCreds, vm.resetPasswordToken)
			.then(function() {
				toastr.success('Password successfully changed', 'Success!');
				vm.resetPasswordToken = null;
			})
			.catch(function(message) {
				toastr.error(message, 'Error');
				vm.resetPasswordCredentials = {
					Username: null,
					Password: null,
					ConfirmPassword: null
				};
			});
	};


    vm.resetPasswordByToken = function() {
        vm.loading = OrderCloudSDK.Me.ResetPasswordByToken({NewPassword:vm.credentials.NewPassword})
            .then(function(data) {
                vm.setForm('resetSuccess');
                vm.credentials = {
                    Username:null,
                    Password:null
                }
            })
            .catch(function(ex) {
                $exceptionHandler(ex);
            })
    };
}
