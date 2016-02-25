/**
 * @ngdoc service
 * @name Project
 * @description A service wrapping some project interactions from different controllers. CRUD project behaviors will hopefully belong here.
 */
kahuna.app.service('Project', [
	'$rootScope', '$location', 'KahunaData', 'jqueryUI', '$modal',
	function ($rootScope, $location, KahunaData, jqueryUI, $modal) {
		$scope = $rootScope.$new();

		// This is a utility function
		// It should probably belong to some form helper services
		$rootScope.maskedClickThrough = function (selector) {
			setTimeout(function () {
				var $el = angular.element(selector);
				$el.click();
			}, 50);
		};

		// Set up the automated help. Whenever the user goes to certain pages, we show
		// the default help (Help.html) for that page.
		// Admittedly, this doesn't really belong in this service, but I didn't want to create
		// a whole new service for this.
		var defaultHelpMappings = {
			resources: "resource",
			roles: "roles",
			rules: "rule"
		};
		$rootScope.$on("$routeChangeSuccess", function (event, current, previous) {
			var currentUrl = $location.path();
			var lastPartIdx = currentUrl.lastIndexOf("/");
			if (lastPartIdx == -1)
				return;
			var lastPartOfURL = currentUrl.substring(lastPartIdx + 1);
			if (defaultHelpMappings[lastPartOfURL]) {
				$rootScope.helpDialog(defaultHelpMappings[lastPartOfURL], 'Help', localStorage['eslo-ld-learn-complete']);
			}
		});


		var projectModule = {
			refreshCurrentProject: function refreshCurrentProject() {

				kahuna.fetchData('AllProjects', { pagesize : 200 }, function (projects) {
					var projectsByIdent = _.indexBy(projects, 'ident');
					$rootScope.currentProject = projectsByIdent[$rootScope.currentProject.ident];
				});
			},
			connectWizard: function connectWizard() {

				var dialogOpts = {
					backdrop: 'static',
					keyboard: false, // Can close with escape
					templateUrl:  'partials/connectwizard.html',
					controller: 'kahuna.ConnectWizardController',
					resolve: { result : function () { return true; }}
				};
				$modal.open(dialogOpts);
			},

			/**
			 * @ngdoc method
			 * @name Project.methods.importPrompt
			 * @description Prompts a user with a dialog that allows them to upload an exported project file.
			 * TODO $rootScope.importProject() does all the work
			 */
			importPrompt: function () {
				$rootScope.importFileName = null;
				var options = {
					modal : true,
					buttons : {
						OK : function () {
							$(this).dialog("close");
							$rootScope.$apply();
							$rootScope.importProject();
							$rootScope.importFileName = null;
							$('.upload-form input').val("");
						},
						Cancel : function () {
							$(this).dialog("close");
							$rootScope.importFileName = null;
							$rootScope.$apply();
							$('.upload-form input').val("");
						}
					},
					width: 500,
					height: 280
				};
				jqueryUI.wrapper('#newImportDialog', 'dialog', options);
			},

			/**
			 * @ngdoc method
			 * @name Project.methods.destroy
			 * @description window.confirm()'s a project for deletion
			 */
			destroy: function projectDestroy(project) {
				var projName = project.name;

				var dialogOpts = {
					backdrop: 'static',
					keyboard: false, // Can close with escape
					template:  "<div style='padding:15px 20px 45px 20px;'>Are you ABSOLUTELY SURE you want to delete this project (" + projName +
						")? This will delete all rules, resources, and everything else associated with this project. This cannot be undone." +
						"<br/><div class='pull-right'><button class='btn btn-danger' ng-click='proceedWithDelete();'>Delete</button>" +
						"<button class='btn btn-blank' ng-click='close();'>Cancel</button></div></div>",
					controller: ['$modalInstance', '$scope', '$rootScope', function ($modalInstance, $scope, $rootScope) {
						$scope.close = function close() {
							$modalInstance.close();
						};
						$scope.proceedWithDelete = function proceedWithDelete() {
							KahunaData.remove(project, function (data) {
								$rootScope.$evalAsync(function () {
									var modObj = kahuna.util.getFirstProperty(kahuna.util.findInTxSummary(data.txsummary, 'AllProjects', 'DELETE'));
									if (modObj) {
										var idx = $rootScope.allProjects.indexOf(project);
										$rootScope.allProjects.splice(idx, 1);
										$rootScope.currentProject = $rootScope.allProjects[0];
									}
									setTimeout(function () {
										kahuna.util.info('Project ' + projName + ' was deleted.');
									}, 50);
									$location.path('/');
								});
							}, function (d, s, u) {
								kahuna.util.info('Project ' + projName + ' was not deleted - ' + ((d && d.error) || s));
							});
							$modalInstance.close();
						};
					}],
				};
				$modal.open(dialogOpts);
			}
		};
		return projectModule;
	}
]);
