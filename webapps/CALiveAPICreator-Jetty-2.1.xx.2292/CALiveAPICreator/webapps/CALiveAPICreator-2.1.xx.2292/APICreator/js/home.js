var kahuna;
kahuna.home = {
	HomeCtrl: function HomeCtrl($rootScope, $scope, $http, $resource, $route, $routeParams, $location, $modal, $log, $sce, Storage,
			KahunaData, jqueryUI, $timeout, Project, $window, $q) {
		/**
		 * @ngdoc property
		 * @name Refactor.onRouteChange.HomeCtrl
		 * @description Most routes set a $rootScope currentPage and currentPageHelp, configurables that fit neatly in the route object.
		 * Here there is also a contextHelpPage. onRouteChange event should read this from the route object, and set before the controller fires
		 */
		$rootScope.currentPage = 'home';
		$rootScope.currentPageHelp = 'docs';
		$rootScope.contextHelpPage = 'help/index.html';

		// set global brand/product designations in scope
		$rootScope.brandFullName = kahuna.globals.brandFullName;
		$rootScope.brandPrefixName = kahuna.globals.brandPrefixName;
		$rootScope.productFullName = kahuna.globals.productFullName;
		$rootScope.productSlimName = kahuna.globals.productSlimName;
		$rootScope.productDataExplorer = kahuna.globals.productDataExplorer;
		$rootScope.productAPIServer = kahuna.globals.productAPIServer;
		$rootScope.productAdminDB = kahuna.globals.productAdminDB;

		$scope.goToDb = function goToDb() {
			$location.path('/projects/' + $rootScope.currentProject.ident + '/databases');
		};

		$scope.broadcastConnectTour = function broadcastConnectTour() {
			$rootScope.$broadcast('ConnectTour');
		};

		$rootScope.refreshTourGoalStatus = function () {
			$rootScope.isConnectTourFinished = !!Storage.get('eslo-ld-learn-connect');
			$rootScope.isEventTourFinished = !!Storage.get('eslo-ld-event-info');
			$rootScope.isHomeTourFinished = !!Storage.get('eslo-ld-home-tab');
			$rootScope.isIntegrateTourFinished = !!Storage.get('eslo-ld-learn-integrate');
			$rootScope.isDataExplorerTourFinished = !!Storage.get('eslo-ld-learn-lb');
			$rootScope.isLogicTourFinished = !!Storage.get('eslo-ld-learn-logic');
			$rootScope.isResourceTourFinished = !!Storage.get('eslo-ld-learn-resource');
			$rootScope.isRestLabTourFinished = !!Storage.get('eslo-ld-learn-restlab');
			$rootScope.isSecurityTourFinished = !!Storage.get('eslo-ld-learn-security');
			$rootScope.isSelectedTopicTourFinished = !!Storage.get('eslo-ld-learn-selectedTopic');
			$rootScope.isCompletedTourFinished = !!Storage.get('eslo-ld-learn-complete');
		};
		$rootScope.refreshTourGoalStatus();

		$scope.goToProjectPage = function goToProjectPage(project, path) {
			$rootScope.lockProject = false;
			var modal = $rootScope.projectSelected(project, false, 0);

			modal.result['finally'](function () {
				var pathAppend = '';
				if (!path) {
					return;
				}
				else {
					if (path !== true) {
						pathAppend = '/' + project.ident + '/' + path;
					}
				}

				$location.path('/projects' + pathAppend);
			});
		};

		$rootScope.wait = function rootScope_wait(callback, delay) {
			$rootScope.isWelcomeDismissed = false;
			$timeout(function () {
				$rootScope.$broadcast('showWelcomeModal');
			}, delay);
		};
		if (angular.isUndefined($rootScope.isWelcomeDismissed)) {
			$rootScope.isWelcomeDismissed = false;
		}

		$rootScope.showWelcomeScreen = _.throttle(function throttled_showWelcomeScreen() {
			// $location.path('/');

			if ($rootScope.isLoginModalOpen || $scope.isWelcomeModalOpen || $rootScope.isWelcomeDismissed) {
				// modal was already opened, or it was previously closed during this session
				return;
			}

			var modal = $modal.open({
				templateUrl: 'components/welcome-tabs.html',
				windowClass: 'full-screen-modal',
				scope: $rootScope.$new(false, $scope),
				controller: [
					'$scope', '$modalInstance', '$rootScope',
					function ($scope, $modalInstance, $rootScope) {
						$rootScope.isWelcomeModalOpen = true;
						$scope.close = function closeWelcomeModal() {
							$rootScope.isWelcomeDismissed = true;
							$modalInstance.close();
						};

						if (Storage.get('permanentlyDismissedWelcome')) {
							$scope.isPermanentlyDismissed = true;
						}

						$scope.closeForever = function closeWelcomeModalForever() {
							Storage.put('permanentlyDismissedWelcome', true);
							$rootScope.isWelcomeDismissed = true;
							$modalInstance.close();
						};
					}
				],
				backdrop: 'static',
				keyboard: true,
				size: 'large'
			});

			modal.result['finally'](function () {
				if ($('#welcome-tabs').length) {
					return;
				}
				$rootScope.isWelcomeModalOpen = false;
				$scope.helpDialog('home', 'Start');
				// from learning.js, checks if the tour should fire
				if ($rootScope.isNorthwindDerby) {
					$rootScope.$broadcast('resumeTour');
				}
			});

			$scope.welcomeModal = modal;

			return $scope.welcomeModal;
		}, 1000);

		$rootScope.$on('closeWelcomeModal', function on_home_closeWelcomeModal() {
			if (!$scope.welcomeModal) {
				return;
			}
			$scope.welcomeModal.close();
		});

		$rootScope.$on('showWelcomeModal', function on_home_showWelcomeModal() {
			$rootScope.showWelcomeScreen();
		});

		if (!Storage.get('permanentlyDismissedWelcome') && !$rootScope.isWelcomeDismissed) {
			$rootScope.showWelcomeScreen();
		}

		// data container for actions we want to pass between controllers
		$rootScope.syncAction = {};

		$rootScope.elDebug = function elDebug(variable) {
			console.log(variable);
		};

		$rootScope.openDataExplorerExternal = function openDataExplorerExternal(project) {
			var serverName = $scope.$eval('dataExplorerUrl');
			if (project) {
				serverName = kahuna.getDataExplorerUrl(project);
			}
			window.open(
				'../DataExplorer/index.html#/?serverName=' + serverName + '&forceLogin=true',
				'_blank'
			);
		};

		$rootScope.reloadSchema = function reloadSchema() {
			kahuna.meta.getAllSchemas($rootScope.currentProject, function (dbSchemas) {
				angular.forEach(dbSchemas, function (dbschema, i) {
					var numsteps = 5;
					$rootScope.rescanStepsRemaining = numsteps;
					dbschema.status = 'R';
					KahunaData.update(dbschema, function (data) {
						// changing scope variables outside of a digest cycle
						$rootScope.$evalAsync(function () {
							kahuna.util.info("Database schema rescan started.");
							kahuna.meta.getAllTables($rootScope.currentProject, stepComplete, stepComplete);
							kahuna.meta.getAllViews($rootScope.currentProject, stepComplete, stepComplete);
							kahuna.meta.getAllProcedures($rootScope.currentProject, stepComplete, stepComplete);
							kahuna.meta.getAllApiVersions($rootScope.currentProject, stepComplete, stepComplete);
							kahuna.meta.getAllResources($rootScope.currentProject, stepComplete, stepComplete);
						});
						Project.refreshCurrentProject();
					}, function errCallback(data, status, url) {
					});
				});
			});

			function stepComplete(a, b, c) {
				$rootScope.rescanStepsRemaining -= 1;
				$rootScope.$digest();
				if (0 == $rootScope.rescanStepsRemaining) {
					kahuna.applyFunctionInScope($rootScope, function () {
						var msg = "Database rescan completed - " + _.size(kahuna.meta.allTables) + " tables, " + _.size(kahuna.meta.allViews) + " views, " + _.size(kahuna.meta.allProcedures) + " procedures.";
						kahuna.setDataExplorerUrl($rootScope, $rootScope.currentProject);
						$rootScope.updateProblems();
						kahuna.util.info(msg);
					});
				}
			}
		};

		$rootScope.params = {};
		$rootScope.params.evalMode = !Storage.get('evalMode');
		$rootScope.$watch('params.evalMode', function (current) {
			$scope.$evalAsync(function () {
				// ensure jquery available
				if (!$) {
					$('#evalModeInput').scope().params = { evalMode: current };
				}
			});
		});

		$rootScope.toggleEvalMode = function toggleEvalMode() {
			$rootScope.params.evalMode = !$rootScope.params.evalMode;
			Storage.put('evalMode', !$rootScope.params.evalMode);
		};

		$rootScope.updateDataExplorerUrl = function updateDataExplorerUrl() {
			kahuna.setDataExplorerUrl($rootScope, $rootScope.currentProject);
		};

		/**
		 * @ngdoc property
		 * @name Refactor.FutureService.alerts
		 * @description mdh: I believe $rootScope.alerts is set here because this controller runs before everything else.
		 * In that case, this is probably more useful as a service.
		 */
		$rootScope.alerts = [];

		// Keep track of problems for the entire API
		$rootScope.problemCount = null;
		$rootScope.problems = {};

		// Handle tabs properly
		$scope.data = {
			tabStates: {
				welcome: true,
				architecture: false
			}
		};

		$scope.$watch("data.tabStates", function tabStatesChanged(oldState) {
			var selectedTab = null;
			for (p in $scope.data.tabStates) {
				if ($scope.data.tabStates[p]) {
					selectedTab = p;
					break;
				}
			}
			localStorage['eslo-ld-home-tab'] = selectedTab;
		}, true);

		if (localStorage['eslo-ld-home-tab']) {
			for (p in $scope.data.tabStates) {
				$scope.data.tabStates[p] = (p == localStorage['eslo-ld-home-tab']);
			}
		}

		$rootScope.$watch('currentProject', function (current, previous) {
			if (current) {
				setTimeout(function () { Storage.put('CurrentProject', current); }, 500);
			}
		});

		// child OR parent relationships weighted as 1, child AND parent weighted as (childRels+1) * (parentRels+1)
		// so a resource with one parent and one child weighted as 4
		// and a resource with 4 children/no parents is also weighted 4
		$scope.parseTablesConnectivity = function parseTablesConnectivity(tables) {
			var connectivityObj = {};

			angular.forEach(kahuna.meta.allTables, function (table, name) {
				var childRels = 0;
				var parentRels = 0;

				if (table.children.length) {
					childRels = table.children.length;
				}

				if (table.parents.length) {
					parentRels = table.parents.length;
				}

				// if either type of relationship is 0, weight them by a simple relationship count
				if (!childRels || !parentRels) {
					connectivityObj[name] = childRels + parentRels;
				}
				else {
					// else, multiply them
					connectivityObj[name] = (childRels + 1) * (parentRels + 1);
				}
			});

			return connectivityObj;
		};
		$scope.getMostConnectedTable = function getMostConnectedTable(connectivityObj) {
			var weightedTable = null;
			var highestWeight = 0;
			angular.forEach(connectivityObj, function (weight, tableName) {
				if (weight > highestWeight) {
					weightedTable = kahuna.meta.allTables[tableName];
					highestWeight = weight;
				}
			});
			return weightedTable;
		};

		// methods and objects that can be re-structured into services
		$scope.helpers = {};

		// expects table definition object and a new resource object with a name attribute
		// ex: $scope.helpers.createTableResource(kahuna.meta.allTables['tableName'], {name: 'NewResourceName'});
		// returns $q promise on success
		// #TODO abstract resource creation in the kahuna.resourcesCtrl
		$scope.helpers.createTableResource = function helperCreateSubResource(table, resource) {
			var deferred = $q.defer();
			if (!table) {
				deferred.reject();
				return deferred.promise;
			}
			var apiIdent = kahuna.meta.allApiVersions[0].ident;
			var _defaults = {
				apiversion_ident: apiIdent,
				resource_type_ident: 1,
				prefix: table.prefix,
				table_name: table.entity,
				root_ident: null,
				is_collection: "Y",
				container_ident: null
			};

			resource = angular.extend({}, _defaults, resource);

			KahunaData.create("AllResources", resource, function (data) {
				var resourceObj = kahuna.util.getFirstProperty(kahuna.util.findInTxSummary(data.txsummary, 'AllResources', 'INSERT'));
				kahuna.resource.allResources[resourceObj.ident] = resourceObj;
				deferred.resolve(resourceObj);
			});

			return deferred.promise;
		};

		// expects relationship to be the relationship as defined by the parent
		// expects parent and child to be a table metadata object
		$scope.helpers.getJoinFragment = function getJoinFragment(definition) {
			var table, columns, column;
			var fragment = '';

			if (definition.child_table) {
				// this is a child table
				table = kahuna.meta.allTables[definition.child_table];
				columns = _.indexBy(table.columns, "name");

				angular.forEach(definition.child_columns, function (element, index) {
					column = columns[element];
					if (index > 0) {
						fragment += ' AND ';
					}
					fragment = column.dbName + ' = [' + definition.parent_columns + ']';
				});
			}
			else {
				// this is a parent table
				table = kahuna.meta.allTables[definition.parent_table];
				columns = _.indexBy(table.columns, "name");

				angular.forEach(definition.parent_columns, function (element, index) {
					column = columns[element];
					if (index > 0) {
						$scope.relationships.sqlFragment += ' AND ';
					}
					fragment = column.dbName + ' = [' + definition.child_columns + ']';
				});
			}

			return fragment;
		};

		// This controller regenerates all listeners on any navigation back to #/
		$rootScope.registeredConnectWizardSuccessListener = false;
		if (!$rootScope.registeredConnectWizardSuccessListener) {
			$rootScope.$on('ConnectWizardSuccess', function (event) {
				// the welcome tabs must not reappear when routing to HomeController
				$rootScope.isWelcomeDismissed = true;

				if (!$rootScope.createSampleElements) {
					// console.log('no sample resources or rules desired');
					return;
				}

				// The ConnectWizardSuccess event can be received multiple times at once
				if ($rootScope.creatingDefaultObjects) {
					var timeDiff = new Date() - $rootScope.creatingDefaultObjects;
					if (timeDiff > 15000) {
						console.log('We DO need to create default objects - last time was a while ago');
					}
					else {
						console.log('No need to create default objects - already in progress');
						return;
					}
				}
				console.log('ConnectWizardSuccess - Creating default objects');
				$rootScope.creatingDefaultObjects = new Date();
				var connectivityObj = $scope.parseTablesConnectivity(kahuna.meta.allTables);
				var newResourceTable = $scope.getMostConnectedTable(connectivityObj);
				if (newResourceTable) {
					var maxTopLevelParents = 2;
					var maxTopLevelChildren = 2;
					// save the resource
					$scope.helpers.createTableResource(newResourceTable, {name: newResourceTable.entity + 'Object'})
						.then(function (resource) {
							// save 1st layer of child relationships
							angular.forEach(newResourceTable.children, function (relationship, index) {
								if (maxTopLevelChildren-1 > 0) {
									maxTopLevelChildren--;
									var relationshipTable = kahuna.meta.allTables[relationship.child_table];
									$scope.helpers.createTableResource(relationshipTable, {
										name: relationshipTable.entity + 'Child',
										root_ident: resource.ident,
										container_ident: resource.ident,
										is_collection: 'Y',
										description: 'Generated sample resource',
										join_condition: $scope.helpers.getJoinFragment(relationship)
									})
										.then(function (res) {
											if (!res) {
												return;
											}
											// save 2nd layer of child relationships
											angular.forEach(relationshipTable.children, function (rel, i) {
												if (i < 2) {
													var relTable = kahuna.meta.allTables[rel.child_table];
													$scope.helpers.createTableResource(relTable, {
														name: relTable.entity + 'Grandchild',
														root_ident: res.ident,
														container_ident: res.ident,
														is_collection: 'Y',
														description: 'Generated sample resource',
														join_condition: $scope.helpers.getJoinFragment(rel)
													});
												}
											});
										})
										.then(function (res) {
											if (!res) {
												return;
											}
											// save a layer of parents for these child relationships which are NOT the current parent table
											var parentCount = 0;
											angular.forEach(relationshipTable.parents, function (rel, i) {
												if (rel.parent_table != newResourceTable.name && parentCount < 2) {
													parentCount++;
													var relTable = kahuna.meta.allTables[rel.parent_table];
													$scope.helpers.createTableResource(relTable, {
														name: rel.name,
														root_ident: res.ident,
														container_ident: res.ident,
														is_collection: 'N',
														description: 'Generated sample resource',
														join_condition: $scope.helpers.getJoinFragment(rel)
													});
												}
											});
										});
								}
							});

							// save 1st layer of parent relationships
							angular.forEach(newResourceTable.parents, function (relationship, index) {
								if (maxTopLevelParents-1 > 0) {
									maxTopLevelParents--;
									var relationshipTable = kahuna.meta.allTables[relationship.parent_table];
									$scope.helpers.createTableResource(relationshipTable, {
										name: relationshipTable.entity + 'Parent',
										root_ident: resource.ident,
										container_ident: resource.ident,
										is_collection: 'N',
										description: 'Generated sample resource',
										join_condition: $scope.helpers.getJoinFragment(relationship)
									})
										.then(function (res) {
											if (!res) {
												return;
											}
											var childCount = 0;
											// save a layer of children to this parent that is NOT the root resource table
											angular.forEach(relationshipTable.children, function (rel, i) {
												if (rel.child_table != newResourceTable.name && childCount < 2) {
													var relTable = kahuna.meta.allTables[rel.parent_table];
													$scope.helpers.createTableResource(relTable, {
														name: rel.name,
														root_ident: res.ident,
														container_ident: res.ident,
														is_collection: 'Y',
														description: 'Generated sample resource',
														join_condition: $scope.helpers.getJoinFragment(rel)
													});
												}
											});
										}, function (error) {console.log('err', error);})
										.then(function (res) {
											if (!res) {
												return;
											}
											// save 2nd layer of parent relationships
											angular.forEach(relationshipTable.parents, function (rel, i) {
												if (i < 2) {
													var relTable = kahuna.meta.allTables[rel.parent_table];
													$scope.helpers.createTableResource(relTable, {
														name: relTable.entity + 'Grandparent',
														root_ident: res.ident,
														container_ident: res.ident,
														is_collection: 'N',
														description: 'Generated sample resource',
														join_condition: $scope.helpers.getJoinFragment(rel)
													});
												}
											});
										});
								}
							});
						});
					// end of saving resources

					var ruleTable = $scope.getUseableRuleTable();
					if (ruleTable && !$rootScope.currentProject.name.match(/Northwind/)) {
						console.log($rootScope.currentProject);
						// create sample event rule
						var eventRule = {
							ruletype_ident: 7,
							active: true,
							entity_name: ruleTable.name,
							name: 'Sample Event Rule',
							verbs: 'UPDATE,',
							prop4: 'javascript',
							project_ident: $rootScope.currentProject.ident,
							comments: 'This is a sample event rule created for new projects.',
							rule_text1: 'if (oldRow.' + ruleTable.ruleableColumns[0].name + ' != row.' + ruleTable.ruleableColumns[0].name + ') {\n' +
								'    log.debug("Sample Event Rule for ' + ruleTable.entity + ' table:  ' + ruleTable.ruleableColumns[0].name +
								' column updated to " + row.' + ruleTable.ruleableColumns[0].name + ');\n' +
								'}\n' +
								'else {\n' +
								'    log.debug("Sample Event Rule for ' + ruleTable.entity + ' table: ' + ruleTable.ruleableColumns[0].name + ' column unchanged.");\n' +
								'}'
						};
						KahunaData.create("AllRules", eventRule, function (data) {
							console.log('created sample event rule', data);
						});

						// create sample validation rule
						var validationRule = {
							ruletype_ident: 5,
							active: true,
							entity_name: ruleTable.name,
							name: 'Sample validation Rule',
							verbs: null,
							prop4: 'javascript',
							project_ident: $rootScope.currentProject.ident,
							comments: 'This is a sample validation rule created for new projects.',
							rule_text1: 'return "ForbiddenValue" !== row.' + ruleTable.ruleableColumns[0].name + '; // example of a validation boolean'
						};
						KahunaData.create("AllRules", validationRule, function (data) {
							console.log('created sample validation rule', data);
						});
					}
				}
			});
			$rootScope.registeredConnectWizardSuccessListener = true;
		}

		// loops through tables, returns a copy of a table with at least one column that is not a key,
		$scope.getUseableRuleTable = function getUseableRuleTable() {
			var candidate = null;
			angular.forEach(kahuna.meta.allTables, function (table, index) {
				if (candidate) {
					return;
				}
				if (table.columns.length > 2) {
					candidate = angular.copy(table);
					var columnsByName = _.indexBy(candidate.columns, 'name');
					angular.forEach(candidate.keys, function (keyObj, i) {
						delete columnsByName[keyObj.name];
					});

					// all the columns were keys, this may be a linking table, and will probably be uninteresting
					if (!_.values(columnsByName).length) {
						candidate = null;
					}
					else {
						candidate.ruleableColumns = _.values(columnsByName);
					}
				}
			});

			return candidate;
		};

		$rootScope.lockProject = false;
		// $scope.espressoMgmtServer = "https://mgmt.t.espressologic.com:8080";  // TODO use the correct URL
		// Set things up when a new project is selected
		$rootScope.projectSelected = function projectSelected(project, doNotSetPath, lockMilliSeconds) {
			// when programmatically selecting a project based on events, it may be preferred to suspend projectSelected() calls
			if ($rootScope.lockProject) {
				return;
			}
			if (lockMilliSeconds) {
				$rootScope.lockProject = true;
				// this does not lag the UI, it prevents the project from being programatically altered
				$timeout(function () { $rootScope.lockProject = false; }, lockMilliSeconds);
			}

			if (angular.isDefined(project)) {
				$rootScope.currentProject = project;
			}
			var currentProject = $rootScope.currentProject;

			var loadingModal = $modal.open({
				template: "<div class='loading-schema-modal' ng-click='close();' style='padding: 25px; font-size: 18px;'>Now loading the database schema, please wait...</div>",
				controller: ['$scope', '$timeout', '$modalInstance', function ($scope, $timeout, $modalInstance) {
					$scope.actTimedOut = false;

					// this timeout allows users to dismiss this otherwise indefinitely hanging modal
					$timeout(function () {
						$scope.actTimedOut = true;
					}, 20000);

					$scope.close = function loadingModel_close() {
						if ($scope.actTimedOut) {
							$modalInstance.close();
							return true;
						}
						return false;
					};

					// make close-able by clicking on the backdrop too
					$('body').click(function (event) {
						var $thisModal = $('.loading-schema-modal');

						// check that we're catching events for the right modal
						if ($thisModal.length) {
							var successfulClose = $scope.close();
							if (successfulClose) {
								$(this).off(event);
							}
						}
					});
				}],
				backdrop: 'static',
				keyboard: true,
				size: 'large'
			});
			function hideLoadingDialog(value) {
				if (loadingModal) {
					try {
						loadingModal.dismiss();
					}
					catch(e) {
						console.log('the modal was already closed');
					}
				};
			}
			kahuna.meta.getAllTables(currentProject, hideLoadingDialog, hideLoadingDialog);
			kahuna.meta.getAllViews(currentProject);
			kahuna.meta.getAllProcedures(currentProject);
			kahuna.meta.getAllApiVersions(currentProject, function (data) {
				kahuna.applyFunctionInScope($scope, function () {
					kahuna.setDataExplorerUrl($rootScope, currentProject);
				});
			});
			kahuna.meta.getAllResources(currentProject);

			if (kahuna.restlab) {
				kahuna.restlab.history = [];
			}

			// Grab the project's options so we can enable/disable features accordingly
			if (currentProject) {
				kahuna.fetchData(kahuna.baseUrl + 'admin:projectoptions', {sysfilter: 'equal(project_ident:' + currentProject.ident + ')'}, function (data) {
					kahuna.globals.projectOptions = {};
					for (var i = 0; i < data.length; i++) {
						kahuna.globals.projectOptions[data[i].projectoptiontype_ident] = data[i].option_value;
					}
				});
			}

			// Get all the problems for this project
			if (currentProject) {
				kahuna.fetchData(kahuna.baseUrl + 'ProjectProblems',
					{
						userfilter: 'openProblems(project_ident:' + $rootScope.currentProject.ident + ")"
					},
					function (data) {
						$rootScope.problems = {};
						for (var i = 0; i < data.length; i++) {
							$rootScope.problems[data[i].ident] = data[i];
						}

						if (data.length == 0) {
							kahuna.putInScope('problemCount', '');
						}
						else {
							kahuna.putInScope('problemCount', data.length);
						}

						if ($rootScope.initial_path) {
							$location.path($rootScope.initial_path);
						}
						else if ( ! doNotSetPath) {
							if ($location.path() == '/projects') {
								$route.reload();
							}
							else {
								$location.path('/projects');
							}
						}

						$rootScope.$apply();
					},
					function () {
					}
				);
			}

			return loadingModal;
		};

		$scope.$on('$viewContentLoaded', function on_home_$viewContentLoaded() {
			var isWindows = navigator.userAgent.match(/Windows/i);
			var isTouch = navigator.userAgent.match(/Touch/i);
			if (isWindows && isTouch) {
				$('.home-view').click(function (event) {
					var $element = $(event.target);
					var $map = $element.closest('map');
					if ($map.length) {
						event.stopPropagation();
						event.preventDefault();
					}
				});
			}
		});

		function checkNorthwindAccessibility() {
			if (!kahuna.baseUrl) {
				return;
			}

			if ('undefined' === typeof kahuna.northwindChecked) {
				kahuna.northwindChecked = true;
			}
			else {
				return;
			}

			var jettyNorthwindInfo = {
					special : 'northwind',
					dbtype : 'Derby',
					url : 'jdbc:derby:Northwind',
					host : null,
					port : null,
					sid : null,
					prefix : 'nw',
					catalog : null,
					schema : null,
					username : 'Northwind',
					password : 'Some Password',
					actual_password : 'NorthwindPassword!'
				};

			var config = {
				cache: false,
				timeout: 3000,
				headers: {
					"Authorization": "CALiveAPICreator " + kahuna.globals.apiKeyValue + ":1"
				}
			};

			var url = kahuna.baseUrl + '@database_test';
			$http.post(url, jettyNorthwindInfo, config)
				.then(function northwindTestSuccess(data) {
					// possible success: check data.errorMessage
					if (data.data.errorMessage) {
					}
					else {
						$rootScope.isTourPossible = true;
						$rootScope.isNorthwindDerby = true;
					}
				}, function northwindTestError(data, status) {
				}
			);
		};

		// Fetch the current account
		kahuna.fetchInitialData = kahuna.fetchInitialData || function fetchInitialData() {
			if (kahuna.initialDataFetched) {
				return;
			}
			if (!kahuna.globals.accountIdent) {
				return;
			}

			checkNorthwindAccessibility();

			kahuna.fetchData('AccountsWithOptions', {sysfilter: 'equal(ident:' + kahuna.globals.accountIdent + ')'}, function (accountData) {
				kahuna.globals.currentAccount = accountData[0];
				kahuna.globals.currentAccountOptions = {};
				for (var i = 0; i < accountData[0].Options.length; i++) {
					var option = accountData[0].Options[i];
					kahuna.globals.currentAccountOptions[option.accountoptiontype_ident] = option;
					if (option.accountoptiontype_ident == 2) {
						kahuna.globals.fullJavascriptAllowed = (option.option_value == 'true');
					}
				}
				$rootScope.$apply(function () {
					$rootScope.currentAccount = accountData[0];
				});

				if ( ! kahuna.globals.projects || kahuna.globals.projects.length == 0) {
					kahuna.fetchData('AllProjects', { pagesize: 200 }, function (allProjectsData) {
						$scope.allProjects = allProjectsData;
						kahuna.globals.projects = allProjectsData;
						$rootScope.$apply(function () {
							$rootScope.allProjects = allProjectsData;
						});
					});
				}
			});

			// Retrieve the IP address of the server. This of course assumes only one server...
			kahuna.fetchData(kahuna.baseUrl + "@serverinfo", null, function fetchServerInfoCb(serverInfoData) {
				$rootScope.serverIp = serverInfoData.publicAddress;
			});

			kahuna.fetchData(kahuna.baseUrl + "@license", null, function (licenseData) {
				if (licenseData.error) {
					$rootScope.license = {
						company: "No valid license found"
					};
					alert('This server does not have a proper license: ' + licenseData.error +
							"\nThis server is now in read-only mode: existing projects will continue to run normally, " +
							"but you cannot change anything until a valid license has been installed.");
					return;
				}
				$rootScope.license = licenseData;
			});

			// this function hasn't been declared yet;
			$scope.$evalAsync(function () { $scope.updateAuthProvidersTab() });
		};

		$rootScope.logout = function logout() {
			// logging out alerted 'Error 0' because asynchronous requests made when attempting ANY type of javascript reload
			// hide and permit no request
			$('body').html('');
			$ = null;

			var performLogout = function performLogout() {
				// forget EVERYTHING!
				kahuna.clearSetting('login.showPassword');
				kahuna.clearSetting('login.lastUsername');
				Storage.remove('authSession');
				Storage.remove('CurrentProject');

				// pretending this never happened
				$window.location.reload();
			};

			var authSession = Storage.get('authSession');
			if (!angular.isDefined(authSession)
					|| !authSession
					|| !authSession.server
					|| !authSession.apikey) {
				setTimeout(performLogout);
				return;
			}

			var authReq = $http.post(authSession.server + '/rest/abl/admin/v2/@authentication', {"apikey": authSession.apikey, "disable": true });
			authReq
				.success(function () {
						setTimeout(performLogout);
					}
				)
				.error(function () {
						setTimeout(performLogout);
					}
				);
		};

		$scope.connectWizard = function connectWizard() {
			Project.connectWizard();
		};
		$rootScope.connectWizard = angular.copy($scope.connectWizard);

		$rootScope.importNewProject = function importNewProject() {
			Project.importPrompt();
		};
		$rootScope.importNewProject = angular.copy($scope.importNewProject);

		$rootScope.refreshProjects = function refreshProjects() {
			kahuna.globals.projects = null;
			kahuna.fetchInitialData();
		};


		$rootScope.verifyProject = function verifyProject(callback) {
			kahuna.util.info('Verifying Project ...');
			var project = angular.copy($rootScope.currentProject);

			project.status = 'V';
			project['@metadata'].checksum = 'override';

			KahunaData.update(project, function (data) {
				kahuna.applyFunctionInScope($rootScope, function () {
					for (var i = 0; i < data.txsummary.length; i++) {
						var modObj = data.txsummary[i];
						if (modObj['@metadata'].resource === 'AllProjects' && modObj.ident === $rootScope.currentProject.ident) {
							// TODO this is not really right, but we'll leave for now.
							modObj.Tables = { href : kahuna.baseUrl + "@tables?projectId=" + modObj.ident };
							modObj.Views = { href : kahuna.baseUrl + "@views?projectId=" + modObj.ident };
							modObj.Procedures = { href : kahuna.baseUrl + "@procedures?projectId=" + modObj.ident };
							modObj.Resources = { href : kahuna.baseUrl + "@resources?projectId=" + modObj.ident };
							$rootScope.currentProject = modObj;
							kahuna.util.replaceInArray($rootScope.allProjects, modObj);
							continue;
						}
					}
				});

				$rootScope.updateProblems(callback);
			});
		};

		$rootScope.updateProblems = function updateProblems(callback) {
			KahunaData.queryWithFilter('ProjectProblems', 'userfilter', 'openProblems(project_ident:' + $rootScope.currentProject.ident + ")", function (problems) {
				kahuna.applyFunctionInScope($rootScope, function () {
					$rootScope.problemCount = problems.length;
					$rootScope.problems = problems;
				});
				if (problems.length === 0) {
					kahuna.util.info('No problem detected in this project.');
				}
				else {
					kahuna.util.warning('One or more problem was detected in this project.');
				}

				callback && callback();
			});
		};

		$rootScope.importFileSelected = function importFileSelected(elem) {
			console.log('importFile');
			if (!elem.files[0]) {
				return;
			}
			$rootScope.importFileName = elem.files[0].name;
			$rootScope.$digest();
		};

		// Still in use, but this should be migrated into Project.js
		$rootScope.importProject = function importProject() {
			console.log('Begin import project from file: ' + document.getElementById('importFile').files[0]);
			if (!document.getElementById('importFile').files[0]) {
				alert("Please select a JSON file to import");
				return;
			}
			if (window.File && window.FileReader && window.FileList && window.Blob) {
				var importFile = document.getElementById('importFile').files[0];
				var reader = new FileReader();
				reader.onloadend = function onloadend(e) {
					var json = e.target.result;
					for (var i = 0; i < json.length; i++) {
						var c = json.charAt(i);
						if (c == ' ' || c == '\n' || c == '\r' || c == '\t') {
							continue;
						}
						if (c != '{' && c != '[') {
							alert("This file does not contain valid JSON.");
							return;
						}
						break;
					}

					var proj = null;
					try {
						proj = JSON.parse(json);
					}
					catch (e2) {
						alert('Your JSON file contains an error: ' + e2);
						return;
					}

					$scope.importMessage = "Import in progress...";
					var progressDialog = $modal.open({
						templateUrl: 'partials/modals/ProjectImportProgress.html',
						controller: kahuna.home.HomeCtrl,
						size: 'sm',
						backdrop: 'static',
						keyboard: false,
						scope: $scope
					});

					try {
						KahunaData.create("ProjectExport", proj, function (data) {
							if (data.txsummary && data.txsummary.length > 0) {
								// We have to re-fetch the project because what we get in the txsummary is a ProjectExport,
								// not a AllProjects, which is what we require in $rootScope.allProjects
								for (var i = 0; i < data.txsummary.length; i++) {
									if (data.txsummary[i]['@metadata'].resource === 'ProjectExport') {
										kahuna.fetchData('AllProjects', {
											sysfilter: 'equal(ident:' + data.txsummary[i].ident + ')'
										}, function (fetchData) {
											$rootScope.allProjects.push(fetchData[0]);
											$rootScope.projectSelected($rootScope.allProjects[$rootScope.allProjects.length-1]);
											kahuna.util.info('Your project has been imported, API Creator is refreshing');
											$location.path('/projects');
											$('.modal-backdrop').hide();
										});
										break;
									}
								}
							}
							$scope.importMessage = "Import was successful. Don't forget to reset the database and user passwords!";
							(function (dlg) {
								$timeout(function () {
									dlg.close();
								}, 4000);
							})(progressDialog);
						}, function (e2) {
							var errMsg = JSON.stringify(e2);
							if (e2.errorMessage) {
								errMsg = e2.errorMessage;
							}
							$scope.importMessage = "Import failed: " + errMsg;
							(function (dlg) {
								$timeout(function () {
									dlg.close();
								}, 10000);
							})(progressDialog);
							kahuna.util.error('Your project could not be imported: ' + errMsg);
						});
					}
					catch (e3) {
						var errMsg = JSON.stringify(e3);
						if (e3.errorMessage) {
							errMsg = e3.errorMessage;
						}
						console.log('Exception thrown during project import: ' + errMsg);
						$scope.importMessage = "Import did not succeed: " + errMsg;
						(function (dlg) {
							$timeout(function () {
								dlg.close();
							}, 10000);
						})(progressDialog);
					}
				};
				reader.readAsText(importFile);
			}
			else {
				alert('Sorry -- your browser does not support this function.');
			}
		};

		// Set up the help area
		$rootScope.helpDialog = function helpDialog(groupName, itemName, doNotShowHelpPane) {
			$rootScope.contextHelpPage = "help/" + groupName + "/" + itemName + ".html";

			if (doNotShowHelpPane) {
				return;
			}

			// open if the help window is opened AND this is a window event on an element .ContextHelpButton
			if (kahuna.layout.east.state && kahuna.layout.east.state.isClosed && (window.event && window.event.type && $(window.event.target).hasClass('ContextHelpButton'))) {
				kahuna.layout.open('east');
				kahuna.helpLayout.open('north');
			}

		};

		$rootScope.helpDialog('home', 'Help', localStorage['eslo-ld-learn-complete']);

		$rootScope.log = function log(log) { console.log(log); };

		// Resize the help pane so everything fits nicely
		setTimeout(function () {
			kahuna.layout.sizePane('east', 349);
			// console.log('Resize here');
		}, 2000);

		$rootScope.hideContextHelp = function hideContextHelp() {
			$('#helpDiv').height(24);
		};

		// Remember GUI positions and settings per screen in this object,
		// which is put in localStorage but could also be stored in the database.
		kahuna.readGuiSettings = function readGuiSettings(project) {
			if (!$rootScope.gui || project.ident !== $rootScope.guiProjectIdent) {
				$rootScope.guiProjectIdent = project.ident;
				$rootScope.gui = {};
				var theName = 'espressoGui_' + project.ident;
				var guiJson = localStorage[theName];
				console.log("localStorage READ - " + theName);
				if (guiJson) {
					try {
						$rootScope.gui = JSON.parse(guiJson);
					}
					catch (e) {
						console.log('Error parsing GUI settings - resetting them');
					}
				}
			}
		};

		// Store a GUI setting.
		kahuna.storeGuiSetting = function storeGuiSetting(project, pageName, settingName, value) {
			if (project.ident !== $rootScope.guiProjectIdent) {
				console.log("ERROR gui project ident, not same as requested " + project.ident + " $rootScope.guiProjectIdent=" + $rootScope.guiProjectIdent);
				return;
			}
			$rootScope.gui[pageName] = $rootScope.gui[pageName] || {};
			$rootScope.gui[pageName][settingName] = value;
		};

		kahuna.saveGuiSettings = function saveGuiSettings(project) {
			if (project.ident !== $rootScope.guiProjectIdent) {
				console.log("ERROR gui project ident, not same as requested " + project.ident + " $rootScope.guiProjectIdent=" + $rootScope.guiProjectIdent);
				return;
			}

			if (!('localStorage' in window) || !window['localStorage']) {
				return;
			}
			var theName = 'espressoGui_' + $rootScope.guiProjectIdent;
			var theValue = JSON.stringify($rootScope.gui);
			localStorage[theName] = theValue;
			// console.log("localStorage SAVED - " + theName);
		};

		/**
		 * Delete the gui setting for the page name.
		 * Normally done before storing all and then saving
		 */
		kahuna.deleteGuiSetting = function deleteGuiSetting(project, pageName) {
			if (project.ident !== $rootScope.guiProjectIdent) {
				console.log("ERROR gui project ident, not same as requested " + project.ident + " $rootScope.guiProjectIdent=" + $rootScope.guiProjectIdent);
				return;
			}
			delete $rootScope.gui[pageName];
		};

		kahuna.getGuiSetting = function getGuiSetting(project, pageName, settingName, defaultValue) {
			if (project.ident !== $rootScope.guiProjectIdent) {
				console.log("ERROR gui project ident, not same as requested " + project.ident + " $rootScope.guiProjectIdent=" + $rootScope.guiProjectIdent);
				return defaultValue;
			}
			return ($rootScope.gui[pageName] && $rootScope.gui[pageName][settingName]) || defaultValue;
		};

		/////////////////////////////////////////////////////////
		// Login stuff

		$scope.loginValues = {
			serverName: '',
			userName: '',
			password: '',
			showPassword: false
		};

		$scope.loginDialogOpts = {
			backdrop: 'static',
			keyboard: false, // Can't close with escape
			windowClass: 'full-screen-modal',
			// show: true,
			templateUrl: 'partials/login-dialog.html',
			controller: 'kahuna.home.LoginDialogController',
			resolve: {loginValues: function () { return $scope.loginValues; }}
		};

		$scope.showLogin = function showLogin() {

			var urlServer = kahuna.getURLParam('serverName');
			if (urlServer) {
				if (/#\/$/.test(urlServer)) {
					urlServer = urlServer.substring(0, urlServer.length - 2);
				}
			}
			var urlUserName = kahuna.getURLParam('userName');
			if (urlUserName) {
				if (/#\/$/.test(urlUserName)) {
					urlUserName = urlUserName.substring(0, urlUserName.length - 2);
				}
			}

			// var urlApiKey = kahuna.getURLParam('apiKey');
			// if (urlApiKey && /#\/$/.test(urlApiKey)) {
			//     urlApiKey = urlApiKey.substring(0, urlApiKey.length - 2);
			// }

			// this is broken, also need accountIdent and lots of security issues
			// this was used for providing a link from auto registration emails.
			// if (urlServer && urlUserName && urlApiKey) {
			//     kahuna.setBaseUrl(urlServer);
			//     kahuna.setApiKey(urlApiKey);
			//     $rootScope.currentServer = urlServer;
			//     $rootScope.currentUserName = urlUserName;
			//
			//     kahuna.saveSetting('login.lastServer', $scope.loginValues.serverName);
			//     kahuna.saveSetting('login.lastUsername', $scope.loginValues.userName);
			//     kahuna.saveSetting('login.showPassword', $scope.loginValues.showPassword);
			//
			//     kahuna.fetchInitialData();
			//     return;
			// }

			$rootScope.isLoginModalOpen = true;

			var modal = $modal.open($scope.loginDialogOpts);

			modal.result['finally'](function () {
				$rootScope.isLoginModalOpen = false;
				if ($scope.welcomeModal && !Storage.get('permanentlyDismissedWelcome')) {
					$rootScope.$broadcast('showWelcomeModal');
				}
			});
		};

		if (!kahuna.serverUrl) {
			$scope.showLogin();
		}
		else {
			// console.log('Fetching initial data from HomeCtrl ...');
			// kahuna.fetchInitialData();
		}

		// Communication with other frames

		// We set this up so that the Getting Started Guide, which is in an iframe,
		// can message us when it wants to show a video.
		window.showPopupVideo = function showPopupVideo(url) {
			// The next two lines are required for Safari, otherwise the popup video fails horribly
			if (url.indexOf('?') > 0) {
				url = url.substring(0, url.indexOf('?'));
			}
			console.log('Popup video:' + url);
			$("#popupVideoLink").magnificPopup({
				items: {
					src: url,
					type: 'iframe',
					mainClass: 'mfp-fade',
					removalDelay: 160,
					preloader: false,
					fixedContentPos: false
				}
			});
			$("#popupVideoLink").click();
		};
		window.showVideo = window.showPopupVideo;

		function msgListener(event) {
			if (!event.data) {
				return;
			}

			// Is it a request for a popup video?
			if (typeof(event.data) == "string" && event.data.match(/^https?:\/\/.*/)) {
				window.showPopupVideo(event.data);
				return;
			}

			if (event.data.action == 'getDemoLoginInfo') {
				var loginInfo = {
						username: "demo",
						password: "Pass" + "word1" // WTF? If it's not split in two, it gets stripped out at build time
					};
				// console.log('LOGGING IN 1');
				$http.post(kahuna.serverUrl + kahuna.globals.currentAccount.url_name + '/' + $rootScope.currentProject.url_name + '/v1/@authentication', loginInfo)
					.success(function (response) {
						var theUrl = kahuna.baseUrl;
						var extraParamIdx = theUrl.indexOf("?forceLogin");
						if (extraParamIdx > 0) {
							theUrl = theUrl.substring(0, extraParamIdx);
						}
						var message = {
								action: "setDemoLoginInfo",
								host: kahuna.topScope().dataExplorerUrl,
								userName: "demo",
								apiKey: response.apikey,
								adminHost: theUrl,
								adminUserName: "admin",
								adminApiKey: kahuna.globals.apiKeyValue
						};
						var iframe = document.getElementById('dataExplorerIframe');
						iframe.contentWindow.postMessage(message, '*');
					}).error(function (data) {
						console.log($rootScope.productFullName + ' failed to get an Auth Token for Data Explorer as user demo');
					});

				return;
			}
		}

		if (window.addEventListener) {
			addEventListener("message", msgListener, false);
		}
		else {
			attachEvent("onmessage", msgListener);
		}

		// AUTH PROVIDER SECTION
		// auth providers tab
		$scope.updateAuthProvidersTab = function updateAuthProvidersTab() {
			$rootScope.data = {};
			$rootScope.data.authTypes = [];
			$rootScope.data.authProviders = [];
			$rootScope.authByIdent = {};
			$rootScope.fetchAuthProviders = function fetchAuthProviders() {
				if (!$scope.currentProject) {
					return;
				}
				KahunaData.query('admin:authproviders', {
					pagesize: 100,
					sysfilter: 'equal(account_ident:' + $rootScope.currentAccount.ident + ')',
					sysorder: '(name:asc_uc,name:desc)'
				}, function (data) {
					kahuna.applyFunctionInScope($rootScope, function () {
						for (var i = 0; i < data.length; i += 1) {
							$rootScope.authByIdent[data[i].ident] = data[i];
							data[i].isChanged = false;
							$rootScope.data.authProviders.push(data[i]);
						}
						if (data.length > 0) {
							$rootScope.data.currentAuthProvider = $rootScope.data.authProviders[0];
							authProviderSelected();
						}
					});
				});
			}

			$rootScope.fetchAuthTypes = function fetchAuthTypes() {
				KahunaData.query('admin:auth_types', {
					pagesize: 100
				}, function (data) {
					kahuna.applyFunctionInScope($rootScope, function () {
						$rootScope.data.authTypes.splice(0, $rootScope.data.authTypes.length);
						for (var i = 0; i < data.length; i += 1) {
							$rootScope.data.authTypes.push(data[i]);
						}
					});
				});
			}

			$rootScope.fetchAuthTypes();
			$timeout(function () {
				$rootScope.fetchAuthProviders();
			}, 500);

			function findAuthType(ident) {
				for (var i = 0; i < $rootScope.data.authTypes.length; i += 1) {
					if (ident === $rootScope.data.authTypes[i].ident) {
						return $rootScope.data.authTypes[i];
					}
				}
				return null;
			}

			function fetchAuthProviders(forceRefresh) {
				if (!$rootScope.selectedProj && !forceRefresh) {
					return;
				}
				$rootScope.data.authProviders = [];
				KahunaData.query('admin:authproviders', {
					pagesize: 100,
					sysfilter: 'equal(account_ident:' + $rootScope.currentAccount.ident + ')',
					sysorder: '(name:asc_uc,name:desc)'
				}, function query_admin_authproviders_success(data) {
					kahuna.applyFunctionInScope($rootScope, function () {
						for (var i = 0; i < data.length; i += 1) {
							data[i].isChanged = false;
							$rootScope.data.authProviders.push(data[i]);
						}
						if (data.length > 0) {
							$rootScope.data.currentAuthProvider = $rootScope.data.authProviders[0];
							if ($rootScope.selectedProj) {
								authProviderSelected();
							}
						}
					});
				});
			}
			$scope.refreshAuthProviders = fetchAuthProviders;

			function fetchAuthTypes() {
				KahunaData.query('admin:auth_types', {
					pagesize : 100
				}, function (data) {
					kahuna.applyFunctionInScope($rootScope, function () {
						$rootScope.data.authTypes.splice(0, $rootScope.data.authTypes.length);
						for (var i = 0; i < data.length; i += 1) {
							$rootScope.data.authTypes.push(data[i]);
						}
					});
				});
			}

			fetchAuthTypes();
			$timeout(fetchAuthProviders, 500);

			function authTypeSelected() {
				var prov = $rootScope.data.currentAuthProvider;
				if (! $rootScope.data.currentAuthProvider) {
					return;
				}
				prov.isChanged = true;
				prov.auth_type_ident = $rootScope.data.currentAuthType.ident;
				prov.class_name = $rootScope.data.currentAuthType.class_name;
				prov.param_map = null;
				$rootScope.data.currentAuthProviderConfiguration = null;
				if (!$rootScope.data.currentAuthType.config_name) {
					prov.bootstrap_config_value = null;
					$rootScope.data.currentAuthProviderConfiguration = null;
				}

				saveAndConfigureAuthProvider($rootScope.data.currentAuthProvider);
			}
			$rootScope.authTypeSelected = authTypeSelected;

			function authProviderSelected() {
				if ($rootScope.data.currentAuthProvider) {
					$rootScope.data.currentAuthType = findAuthType($rootScope.data.currentAuthProvider.auth_type_ident);
					configureAuthProvider();
				}
				else {
					$rootScope.data.currentAuthType = null;
				}
			}
			$rootScope.authProviderSelected = authProviderSelected;

			function deleteAuthProvider(provider) {
				if (null === provider) {
					return;
				}

				for (var i = 0; i < $rootScope.data.authProviders.length; i+= 1) {
					if (provider === $rootScope.data.authProviders[i]) {
						var foundIndex = i;
						if (null === provider.ident) {
							$rootScope.data.authProviders.splice(foundIndex, 1);
							if ($rootScope.data.currentAuthProvider === provider) {
								var newidx = Math.min(foundIndex, $rootScope.data.authProviders.length - 1);
								if (newidx < 0) {
									$rootScope.data.currentAuthProvider = null;
								}
								else {
									$rootScope.data.currentAuthProvider = $rootScope.data.authProviders[newidx];
								}
							}
						}
						else {
							var toDelete = {
								ident: provider.ident,
								'@metadata': provider['@metadata']
							};
							KahunaData.remove(toDelete, function (deldata) {
								kahuna.applyFunctionInScope($scope, function () {
									$rootScope.data.authProviders.splice(foundIndex, 1);
									if ($rootScope.data.currentAuthProvider === provider) {
										var newidx = Math.min(foundIndex, $rootScope.data.authProviders.length - 1);
										if (newidx < 0) {
											$rootScope.data.currentAuthProvider = null;
										}
										else {
											$rootScope.data.currentAuthProvider = $rootScope.data.authProviders[newidx];
										}
									}
								});
							});
						}
					}
				}
			}
			$rootScope.deleteAuthProvider = deleteAuthProvider;

			function createAuthProvider() {
				$rootScope.data.currentAuthType = $rootScope.data.authTypes[0];
				var newauthprovider = {
					isChanged: true,
					ident: null,
					name: "New Provider (" + new Date().toUTCString() + ")",
					auth_type_ident: $rootScope.data.currentAuthType.ident,
					class_name: $rootScope.data.currentAuthType.class_name,
					account_ident: $rootScope.currentAccount.ident
				};

				$rootScope.data.authProviders.push(newauthprovider);
				$rootScope.data.currentAuthProvider = newauthprovider;
				saveAndConfigureAuthProvider(newauthprovider);
			}
			$rootScope.createAuthProvider = createAuthProvider;

			function saveAuthProvider(provider, fun) {
				if (!provider) {
					return;
				}
				var newprovider = {
					ident: provider.ident,
					name: provider.name,
					comments: provider.comments,
					auth_type_ident: provider.auth_type_ident,
					class_name: provider.class_name,
					class_location: "",
					bootstrap_config_value: provider.bootstrap_config_value,
					param_map: provider.param_map,
					account_ident: provider.account_ident
				};

				if (!provider.ident) {
					KahunaData.create("admin:authproviders", newprovider, function (newresult) {
						kahuna.applyFunctionInScope($scope, function () {
							for (var i = 0; i < newresult.txsummary.length; i++) {
								var modObj = newresult.txsummary[i];
								if (modObj['@metadata'].resource === 'admin:authproviders' && modObj['@metadata'].verb === 'INSERT') {
									provider.ident = modObj.ident;
									provider.isChanged = false;
									provider["@metadata"] = modObj["@metadata"];
								}
							}
						});
						kahuna.util.info("Created Authentication Provider - " + provider.name);
						fun && fun();
					});
				}
				else {
					newprovider["@metadata"] = provider["@metadata"];
					KahunaData.update(newprovider, function (newresult) {
						kahuna.applyFunctionInScope($rootScope, function () {
							for (var i = 0; i < newresult.txsummary.length; i++) {
								var modObj = newresult.txsummary[i];
								if (modObj['@metadata'].resource === 'admin:authproviders' && modObj.ident === provider.ident) {
									provider["@metadata"] = modObj["@metadata"];
								}
							}
							provider.isChanged = false;
						});
						kahuna.util.info("Saved Authentication Provider - " + provider.name);
						fun && fun();
					});
				}
			}
			$rootScope.saveAuthProvider = saveAuthProvider;

			function revertAuthProvider(provider) {
				if (!provider) {
					return;
				}
				for (var i = 0; i < $rootScope.data.authProviders.length; i += 1) {
					if ($rootScope.data.authProviders[i] === provider) {
						if (null === provider.ident) {
							$rootScope.data.authProviders.splice(i, 1);
							if (provider === $rootScope.data.currentAuthProvider) {
								$rootScope.data.currentAuthProvider = null;
							}
						}
						else {
							var foundIndex = i;
							KahunaData.query("admin:authproviders",
								{
									pagesize: 100,
									sysfilter: 'equal(ident:' + provider.ident + ')'
								}, function (oldauth) {
									kahuna.applyFunctionInScope($rootScope, function () {
										if (0 === oldauth.length) {
											$rootScope.data.authProviders.splice(foundIndex, 1);
											if (provider === $rootScope.data.currentAuthProvider) {
												$rootScope.data.currentAuthProvider = null;
											}
										}
										else {
											oldauth[0].isChanged = false;
											$rootScope.data.authProviders[foundIndex] = oldauth[0];
											if (provider === $scope.data.currentAuthProvider) {
												$rootScope.data.currentAuthProvider = oldauth[0];
											}
										}
									});
							});
						}
					}
				}
			}
			$rootScope.revertAuthProvider = revertAuthProvider;

			function configureAuthProvider() {
				$rootScope.data.currentAuthProviderConfiguration = null;
				$rootScope.data.authProviderConfigurationError = "Fetching";
				KahunaData.query('@auth_provider_info/' + $rootScope.data.currentAuthProvider.ident, {projectId: $scope.currentProject.ident}, function configSuccessCallback(authconfiginfo) {
					kahuna.applyFunctionInScope($rootScope, function () {
						$rootScope.data.authProviderConfigurationError = null;
						$rootScope.data.currentAuthProviderConfiguration = authconfiginfo;
					});
				}, function configErrorCallback(data, status, url) {
					$log.info("auth provider info returned error " + JSON.stringify(data));
					var msg = data.errorMessage;
					var internalError = "Internal Server Error:";
					if (0 == (msg.toLowerCase()).indexOf(internalError.toLowerCase())) {
						msg = msg.substring(internalError.length);
					}
					$rootScope.data.authProviderConfigurationError = msg;
				});
			}
			$rootScope.configureAuthProvider = configureAuthProvider;

			function saveAndConfigureAuthProvider() {
				saveAuthProvider($rootScope.data.currentAuthProvider, configureAuthProvider);
			}
			$rootScope.saveAndConfigureAuthProvider = saveAndConfigureAuthProvider;

			function authConfigValueChanged() {
				var prov = $rootScope.data.currentAuthProvider;
				prov.isChanged = true;
				var parms = "";
				var fields = $rootScope.data.currentAuthProviderConfiguration.fields;
				var values = $rootScope.data.currentAuthProviderConfiguration.current;
				for (var i = 0; i < fields.length; i+= 1) {
					if (i > 0) {
						parms = parms + ",";
					}
					parms = parms + encodeURIComponent(fields[i].name) + "=" + encodeURIComponent(values[fields[i].name] || "");
				}
				prov.param_map = parms;
			}
			$rootScope.authConfigValueChanged = authConfigValueChanged;

			function authProviderValueChanged() {
				$rootScope.data.currentAuthProvider.isChanged = true;
			}
			$rootScope.authProviderValueChanged = authProviderValueChanged;

			function bootstrapConfigValueChanged() {
				$rootScope.data.currentAuthProvider.isChanged = true;
			}
			$rootScope.bootstrapConfigValueChanged = bootstrapConfigValueChanged;
		};
	},

	/////////////////////////////////////////////////////////////////////////////////////
	// Login dialog

	LoginDialogController: function LoginDialogController($scope, $location, $rootScope, $http, $modalInstance, $timeout, Storage,
			KahunaData, loginValues, $modal) {

		// expects:
		//  auth.server
		//  auth.apikey
		//  auth.email
		//  auth.username
		//  auth.expiration
		//  auth.showPassword
		//  auth.accountIdent
		// returns a promise for auth request.
		// If insufficient info to login, returns null;
		$scope.initAuth = function initAuth() {
			kahuna.setBaseUrl(null);
			kahuna.setApiKey(null);

			var authSession = Storage.get('authSession');
			if (!angular.isDefined(authSession)
					|| !authSession
					|| !authSession.server
					|| !authSession.username
					|| !authSession.email
					|| !authSession.apikey
					|| !authSession.accountIdent
					|| !authSession.expiration) {
				Storage.remove('authSession');
				return null;
			}

			var nowTime = new Date().getTime();
			var expiryTime = new Date(authSession.expiration).getTime();
			if (expiryTime < nowTime + 30 * 60 * 1000) {
				// expires in less than 1/2 hour
				Storage.remove('authSession');
				return null;
			}

			var authReq = $http.post(authSession.server + '/rest/abl/admin/v2/@authentication', {"apikey": authSession.apikey })
				.success(function reauthenticateSuccess(data) {
					kahuna.setApiKey(authSession.apikey);
					kahuna.setBaseUrl(authSession.server);
					$rootScope.currentServer = authSession.server;
					$rootScope.currentUserName = authSession.username;

					kahuna.saveSetting('login.lastServer', authSession.server);
					kahuna.saveSetting('login.lastUsername', authSession.username);
					kahuna.saveSetting('login.showPassword', authSession.showPassword);

					authSession.expiration = data.expiration;
					kahuna.globals.accountIdent = authSession.accountIdent;

					// in case the login modal is open
					try { $modalInstance.close(); } catch (e) { /* Ignore */ }

					var newAuthSession = {
						apikey: authSession.apikey,
						expiration: authSession.expiration,
						accountIdent: authSession.accountIdent,
						username: authSession.username,
						email: authSession.email,
						server: authSession.server,
						showPassword: authSession.showPassword
					};

					Storage.put('authSession', newAuthSession);

					kahuna.fetchInitialData();
				})
				.error(function (data, res) {
					Storage.remove('authSession');
					console.log(data, res);
				}
			);
			return authReq;
		};

		$scope.saUploadLicensePrompt = _.debounce(function debounced_saUploadLicensePrompt() {
			$modal.open({
				template: "<div style='padding: 25px; font-size: 18px;'><h2>System Administration Login</h2><p>The only suggested use of the System Admin account is to upload a license:</p><a class='btn btn-primary' href='#/' ng-click='close();'>Upload License</a></div>",
				keyboard: true,
				size: 'large',
				controller: function ($scope, $modalInstance, $timeout) { $scope.close = function saModalClose() {
					$modalInstance.close();
					$timeout(function () { $('#license-tab').mouseover().click(); }, 1000);
				}; }
			});
		}, 1000);

		$scope.sendAuthentication = function sendAuthentication(info) {
			if (!$scope.authReq) {
				$scope.authReq = $http.post($scope.loginValues.serverName + '/rest/abl/admin/v2/@authentication', info)
				.success(function authenticateSuccess(response) {
					kahuna.setBaseUrl($scope.loginValues.serverName);
					kahuna.setApiKey(response.apikey);

					kahuna.globals.accountIdent = +response.accountIdent;

					$rootScope.currentServer = $scope.loginValues.serverName;
					$rootScope.currentUserName = $scope.loginValues.userName;

					kahuna.saveSetting('login.lastServer', $scope.loginValues.serverName);
					kahuna.saveSetting('login.lastUsername', $scope.loginValues.userName);
					kahuna.saveSetting('login.showPassword', $scope.loginValues.showPassword);

					var authSession = {
						apikey: response.apikey,
						expiration: response.expiration,
						accountIdent: +response.accountIdent,
						username: $scope.loginValues.userName,
						email: response.email,
						server: $scope.loginValues.serverName,
						showPassword: $scope.loginValues.showPassword
					};

					Storage.put('authSession', authSession);

					try { $modalInstance.close(); } catch (e) { /* Ignore */ }

					kahuna.fetchInitialData();

					if ($scope.loginValues && 1 == kahuna.globals.accountIdent) {
						$scope.saUploadLicensePrompt();
					}
					$timeout(function () { $scope.authReq = false; }, 1000);
				})
				.error(function (data, status) {
					$scope.authReq = false;
					if (status == 401) {
						$scope.errorMessage = "Login failed: invalid user ID or password";
					}
					else {
						$scope.errorMessage = "Unable to connect to server";
						if (data && data.errorMessage) {
							$scope.errorMessage += " : " + data.errorMessage;
						}
					}
				});
			}
			return $scope.authReq;
		};

		$scope.login = function login() {
			$scope.errorMessage = null;
			var serverName = $scope.loginValues.serverName;
			if (serverName.charAt(serverName.length - 1) === '/') {
				$scope.loginValues.serverName = serverName.substring(0, serverName.length - 1);
			}

			var loginInfo = {
				username: $scope.loginValues.userName,
				password: $scope.loginValues.password
			};

			return $scope.sendAuthentication(loginInfo).success(function () {});
		};

		$scope.loginValues = loginValues;

		var serverUrl = kahuna.readSetting('login.lastServer', '');
		$scope.loginValues.userName = kahuna.readSetting('login.lastUsername');
		$scope.loginValues.showPassword = !!kahuna.readSetting('login.showPassword', false);

		$scope.serverAddressChanged = function serverAddressChanged() {
			function validateURL(url) {
				var parser = document.createElement('a');
				try {
					parser.href = url;
					return !!parser.hostname;
				}
				catch (ignoreEx) {
					return false;
				}
			}

			var url = $("#serverName").val();
			if (angular.isUndefined(url)) {
				// an oustanding event updating to undefined is never correct
				$scope.loginValues.serverURLmessage = "Empty URL";
				return;
			}

			if ( ! validateURL(url)) {
				$scope.licensePreMsg = "";
				$scope.licenseMsg = "";
				$scope.loginValues.serverURLmessage = "Invalid URL";
				return;
			}
			if ( ! /\/$/.test(url)) {
				url += "/";
			}

			var fullUrl = url + "rest/abl/admin/v2/@license";
			KahunaData.rawGet(fullUrl, function getLicenseCallback(data) {
				if (data.error) {
					console.log("Bad or no license: " + data.error);
					$scope.licensePreMsg = "License error: " + data.error;
					if ("no license has been installed" === data.error) {
						$scope.licenseMsg = "You need to enter a license to use this server.";
						alert('This server does not have a license installed. Please log in as user "sa" and add a license.');
					}
					else {
						$scope.licenseMsg = "This server will run in read-only mode until a valid license is entered.";
					}
					$scope.loginValues.serverURLmessage = "URL does not point to a Live API Creator server";
				}
				else {
					$scope.license = data;
					$scope.licensePreMsg = "This server is licensed to: ";
					$scope.licenseMsg = data.company;
					if (data.organization) {
						$scope.licenseMsg += " (" + data.organization + ")";
					}
					if (data.location) {
						$scope.licenseMsg += " - " + data.location;
					}
					$scope.loginValues.serverURLmessage = null;

					// If the server has not yet been set up, bypass authentication
					KahunaData.rawGet(url + "rest/abl/admin/v2/@login_info", function getLoginInfoCallback(loginData) {
						if (loginData.setup_required) {
							console.log("NO LOGIN REQUIRED");
							$scope.sendAuthentication({username:'sa', password:'foo'});
							$rootScope.initial_path = "/install";
						}
					});
				}
			}, function getLicenseErrorCallback() {
				$scope.licensePreMsg = "";
				$scope.licenseMsg = "";
				$scope.loginValues.serverURLmessage = "URL does not point to a Live API Creator server";
			});
		};
		$timeout($scope.serverAddressChanged, 1000);

		// Was a server specified in the URL?
		var urlServer = kahuna.getURLParam('serverName');
		if (urlServer) {
			if (/#\/$/.test(urlServer)) {
				urlServer = urlServer.substring(0, urlServer.length - 2);
			}
			serverUrl = urlServer;
		}
		$scope.loginValues.serverName = serverUrl;

		if (!serverUrl) {
			var urlByHashSplit = window.location.href.split('#');
			var urlByAppSplit = urlByHashSplit[0].split('APICreator');
			if (urlByAppSplit[0]) {
				$scope.loginValues.serverName = urlByAppSplit[0].replace(/\/\/$/g, "/");
			}

			// Server name was not found anywhere, default to this server\
			if (!$scope.loginValues.serverName) {
				$scope.loginValues.serverName = $location.protocol() + "://" + $location.host();
			}
		}

		var urlUserName = kahuna.getURLParam('userName');
		if (urlUserName) {
			if (/#\/$/.test(urlUserName)) {
				urlUserName = urlUserName.substring(0, urlUserName.length - 2);
			}
			$scope.loginValues.userName = urlUserName;
		}

		// Try to put the cursor in the most appropriate input
		setTimeout(function () {
			$rootScope.$broadcast('closeWelcomeModal');
			if ( ! $scope.loginValues.serverName) {
				$("#serverName").focus();
			}
			else if ( ! $scope.loginValues.userName) {
				$("#userName").focus();
			}
			else {
				$("#password").focus();
			}
		}, 400);

		// attempt auto-login
		var authReq = $scope.initAuth();
		if (authReq) {
			authReq.success(function () { $rootScope.$emit('AutoLogin'); });
		}
		else {
			console.log("insufficient or stale information to attempt auto login");
		}
		$rootScope.appInitialized = true;
	},

	////////////////////////////////////////////////////////////////////////////////////////////
	// Controller for left nav bar

	NavCtrl: function NavCtrl($scope, $location, $rootScope, $http, $timeout) {
		$scope.learnContinue = function learnContinue() {
			console.log('Lab finished: ' + $rootScope.navMaskStep);
			$rootScope.navMaskEnabled = false;
		};

		//this forces a $rootScope digest
		$rootScope.$on('refreshTourGoalStatus', function () {
			$timeout(function (event) {
				$rootScope.refreshTourGoalStatus();
			});
		});
	}
};
