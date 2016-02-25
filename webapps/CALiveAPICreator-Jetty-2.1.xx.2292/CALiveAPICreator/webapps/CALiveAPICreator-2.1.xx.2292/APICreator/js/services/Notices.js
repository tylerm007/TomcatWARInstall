/**
 * @ngdoc service
 * @name Notices
 * @description
 * A service for prompting and alerting users.
 */
kahuna.app.service('Notices', [
	'$rootScope', 'jqueryUI', '$q', 'Delta', '$compile',
	function ($rootScope, jqueryUI, $q, Delta, $compile) {
		var Service = {
			confirmUnsaved: function () {
				var deferred = $q.defer();
				var options = {
					modal : true,
					buttons : {
						"Save Changes and Continue" : function () {
							$rootScope.$apply();
							deferred.resolve(true);
							$(this).dialog("close");
							$rootScope.$apply();
						},
						"Go Back and Review Changes" : function () {
							$rootScope.$apply();
							deferred.reject(false);
							$(this).dialog("close");
							$rootScope.$apply();
						},
						"Ignore and Lose Changes" : function () {
							$rootScope.$apply();
							Delta.reset();
							deferred.resolve(false);
							$(this).dialog("close");
							$rootScope.$apply();
						}
					}
				};
				jqueryUI.wrapper('#unsavedPrompt', 'dialog', options);
				return deferred.promise;
			},
			requireName: function () {
				angular.element('#requireName input').val('');
				var deferred = $q.defer();
				var options = {
					modal: true,
					buttons: {
						Cancel: function () {
							console.log(angular.element('#requireName input').val());
							$rootScope.$apply();
							deferred.reject();
							$(this).dialog("close");},
						Create: function () {
							$rootScope.$apply();
							deferred.resolve(angular.element('#requireName input').val());
							$(this).dialog("close");
						}
					}
				};
				jqueryUI.wrapper('#requireName', 'dialog', options);
				return deferred.promise;
			},
			prompt: function (params) {
				var _params = {
					template: '',
					height: 320,
					width: 320,
					title: ''
				};

				params = _.extend(_params, params);
				var deferred = $q.defer();
				var options = {
					modal: true,
					height: params.height,
					title: params.title,
					position: { my: "top", at: "top", of: $('#MainView') },
					resizable: false,
					draggable: true,
					width: params.width,
					close: function () {
						$rootScope.$broadcast('promptClosed');
						$rootScope.$apply();
						deferred.resolve(false);
					},
					buttons: {
						Close: function () {
							$rootScope.$broadcast('promptClosed');
							$rootScope.$apply();
							deferred.resolve(true);
							$(this).dialog("close");
						}
					}
				};
				console.log(params, options);
				jqueryUI.wrapper($compile(params.template)($rootScope.$new(true)), 'dialog', options);
				return deferred.promise;
			}
		};
		return Service;
	}
]);
