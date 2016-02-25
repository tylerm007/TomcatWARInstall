/*global kahuna */
kahuna.restlab = {
	lastProject: null,
	visited: false,
	aceReqEditor: null,
	aceRespEditor: null,
	history: [],

	RestLabCtrl : function RestLabCtrl($rootScope, $scope, $http, $resource, $routeParams, $location, $log, KahunaData, KahunaDebug, $timeout, $modal, $q) {
		var resourceRedirect = false;

		$rootScope.currentPage = 'restlab';
		$rootScope.currentPageHelp = 'docs/debugging/rest-lab';
		$scope.$evalAsync(function () {
			// helpDialog is not always ready right when this controller attempts to call it
			$rootScope.helpDialog('restlab', 'Help', localStorage['eslo-ld-learn-complete']);
		});

		$scope.currentProject = $rootScope.currentProject;
		$scope.data = {};

		// For some reason, we can't just have e.g. data.activeTab and set it to a number
		// This works reliably.
		$scope.data.activeTab = [true, false, false, false, false];
		$scope.data.listOfTables = kahuna.meta.listOfTables;
		$scope.data.listOfViews = kahuna.meta.listOfViews;
		$scope.data.allProcedures = kahuna.meta.allProcedures;
		$scope.data.allResources = kahuna.meta.allResources;
		$scope.data.allApiVersions = kahuna.meta.allApiVersions;

		// If there is no active database, we should warn the user
		kahuna.meta.getAllSchemas($rootScope.currentProject, function (data) {
			for (var i = 0; i < data.length; i++) {
				var schema = data[i];
				if (schema.active) {
					return;
				}
			}
			//alert('The current project does not have any active databases defined. The REST Lab will not function ' +
			//	'properly until a database is defined and marked as active in the Databases page.');
		});

		$scope.populateTopResources = function populateTopResources() {
			$scope.data.allResources = kahuna.meta.allResources;
			$scope.data.topResources = {};
			$scope.data.apiVersions = [];
			for (var i = 0, len = $scope.data.allApiVersions.length; i < len; i+= 1) {
				if ($scope.data.allApiVersions.hasOwnProperty(i)) {
					var tmpver = $scope.data.allApiVersions[i];
					$scope.data.apiVersions.push(tmpver.name);
				}
			}
			for (var i in $scope.data.allResources) {
				if ($scope.data.allResources.hasOwnProperty(i)) {
					var tmpres = $scope.data.allResources[i];
					if (!$scope.data.topResources.hasOwnProperty(tmpres.apiVersion)) {
						$scope.data.topResources[tmpres.apiVersion] = [];
					}
					$scope.data.topResources[tmpres.apiVersion].push(tmpres);
				}
			}
		};
		$scope.populateTopResources();
		$scope.data.restMethod = 'GET';

		$scope.apiType = {
			selected : null,
			list : [
				{ name : "Resource" },
				{ name : "Table"},
				{ name : "View" },
				{ name : "Procedure" }
			],
			getByName: function getByName(name) {
				for (var i = 0, len = $scope.apiType.list.length; i < len;  ++i) {
					if (name === $scope.apiType.list[i].name) {
						return $scope.apiType.list[i];
					}
				}
				return null;
			}
		};

		$scope.apiTypeSelected = function apiTypeSelected() {
			if ("Resource" === $scope.apiType.selected.name) {
				$scope.refreshTopResources();
				$scope.resourceSelected();
				// console.log('api type selection, triggered resource selection/refresh', angular.copy($scope.data.selectedResource));
			}
			else if ("Table" === $scope.apiType.selected.name) {
				$scope.tableSelected();
			}
			else if ("View" === $scope.apiType.selected.name) {
				$scope.viewSelected();
			}
			else if ("Procedure" === $scope.apiType.selected.name) {
				$scope.procedureSelected();
			}
		};

		$scope.initialized = false;
		$scope.initialize = _.throttle(function initialize() {
			if ($location.path() == '/') {
				return;
			}
			var deferred = $q.defer();

			if ($scope.initialized) {
				return $scope.initialized;
			}
			var tmp;
			$scope.data.selectedTable = kahuna.util.getFirstProperty(kahuna.meta.allTables);
			$scope.data.selectedView = kahuna.util.getFirstProperty(kahuna.meta.allViews);
			$scope.data.selectedProcedure = kahuna.util.getFirstProperty($scope.data.allProcedures);
			$scope.data.selectedApiVersion = kahuna.util.getLastProperty($scope.data.apiVersions);
			$scope.data.selectedResource = kahuna.util.getFirstProperty($scope.data.topResources[$scope.data.selectedApiVersion]);

			$scope.data.useHttps = kahuna.getGuiSetting($scope.currentProject, 'restlab', 'useHttps', false);

			$scope.apiType.selected = $scope.apiType.getByName("Table");
			$scope.tableSelected();

			// Read all GUI settings, and initialize them if we haven't seen them before
			kahuna.readGuiSettings($scope.currentProject);

			tmp= kahuna.getGuiSetting($scope.currentProject, 'restlab', 'apiTypeName');
			if (tmp) {
				$scope.apiType.selected = $scope.apiType.getByName(tmp) || $scope.apiType.selected;
			}

			$scope.data.restMethod = kahuna.getGuiSetting($scope.currentProject, 'restlab', 'restMethod', 'GET');

			tmp = kahuna.getGuiSetting($scope.currentProject, 'restlab', 'selectedTable');
			if (tmp) {
				if (kahuna.meta.allTables.hasOwnProperty(tmp)) {
					$scope.data.selectedTable = kahuna.meta.allTables[tmp];
				}
			}

			tmp = kahuna.getGuiSetting($scope.currentProject, 'restlab', 'selectedView');
			if (tmp) {
				if (kahuna.meta.allViews.hasOwnProperty(tmp)) {
					$scope.data.selectedView = kahuna.meta.allViews[tmp];
				}
			}

			tmp = kahuna.getGuiSetting($scope.currentProject, 'restlab', 'selectedProcedure');
			if (tmp) {
				if ($scope.data.allProcedures.hasOwnProperty(tmp)) {
					$scope.data.selectedProcedure = $scope.data.allProcedures[tmp];
				}
			}

			tmp = kahuna.getGuiSetting($scope.currentProject, 'restlab', 'selectedResourceIdent');
			if (tmp) {
				if ($scope.data.allResources.hasOwnProperty(tmp)) {
					// console.log('updating resource to selectedResourceIdent', tmp, angular.copy($scope.data));
					$scope.data.selectedResource = $scope.data.allResources[tmp].name;
					$scope.data.selectedApiVersion = $scope.data.allResources[tmp].apiVersion;
				}
			}

			$scope.useHttpsChanged();

			var potentialNewUrl = kahuna.getGuiSetting($scope.currentProject, 'restlab', 'url');
			if (potentialNewUrl && potentialNewUrl.match($scope.currentProject.url_name)) {
				console.log('attempting to update to old project url');
				$scope.data.requestUrl = kahuna.getGuiSetting($scope.currentProject, 'restlab', 'url');
			}
			if (!$scope.data.requestUrl) {
				$scope.apiTypeSelected();
			}

			$scope.refreshTopResources(false);

			$scope.initializedController = true;

			deferred.resolve();
			$scope.initialized = deferred.promise;
			return $scope.initialized;
		}, 2500);

		$scope.lockedSelection = false;
		$scope.forceLockTableSelected = function forceLockTableSelected(ms) {
			if (angular.isUndefined(ms)) {
				ms = 1500;
			}
			$scope.lockedSelection = true;
			// this does not delay a user action, there are no UI consequences
			$timeout(function () {
				$scope.lockedSelection = false;
			}, ms);
		};

		$scope.$on('aceEditorSetup', function restlab_on_aceEditorSetup() {
			var requestJsonHeight = kahuna.getGuiSetting($scope.currentProject, 'restlab', 'requestJsonHeight', 250);
			var responseJsonHeight = kahuna.getGuiSetting($scope.currentProject, 'restlab', 'responseJsonHeight', 250);

			var requestJsonText = kahuna.getGuiSetting($scope.currentProject, 'restlab', 'request', "");
			var responseJsonText = kahuna.getGuiSetting($scope.currentProject, 'restlab', 'response', "");

			$scope.$on('$destroy', $scope.saveSettings);
			$scope.aceEditorsSetup(requestJsonHeight, responseJsonHeight, requestJsonText, responseJsonText);

			if (!responseJsonText) {
				if (!$scope.data.requestUrl || !$scope.data.requestUrl.match($rootScope.currentProject.url_name)) {
					$scope.tableSelected();
				}
			}

			$scope.initializedAceEditor = true;
		});

		$scope.$on('InitialRestRequest', function restlab_on_InitialRestRequest() {
			$scope.tableSelected();
			$scope.saveSettings();
			$scope.forceLockTableSelected();
			var listener = $scope.$on('RequestUpdated', function restlab_on_RequestUpdated() {
				$scope.$evalAsync(function () {
					// console.log('dispatching init request', angular.copy($scope.data));
					$scope.sendRequest('GET');
				});
				listener();
			});
		});

		$scope.refreshTopResources = function refreshTopResources(checkResourceSelection) {
			if (angular.isUndefined(checkResourceSelection)) {
				checkResourceSelection = true;
			}
			kahuna.fetchData('@resources?projectId=' + $rootScope.currentProject.ident, null, function (resArr) {
				$scope.$evalAsync(function () {
					var resObj = _.indexBy(resArr, 'ident');

					var updatedTopResources = {};

					// if the $scope.data.topResources may be empty, conditionally populate here:
					if (!$scope.data.topResources || angular.equals($scope.data.topResources, {})) {
						if (resArr.length === 1) {
							// no top level after a project is created makes sense, it's safe to populate it
							angular.forEach($scope.data.allApiVersions, function (apiObj, index) {
								updatedTopResources[apiObj.name] = [];
							});
							angular.forEach(resArr, function (resource, index) {
								updatedTopResources[resource.apiVersion].push(resource);
							});
						}
						else {
							angular.forEach(resArr, function (el, i) {
								if (angular.isUndefined(updatedTopResources[el.apiVersion])) {
									updatedTopResources[el.apiVersion] = [];
								}
								updatedTopResources[el.apiVersion].push(el);
							});
							console.log('something is probably wrong, no top resources, check the network tab', resArr);
						}
					}
					else {
						angular.forEach($scope.data.topResources, function (resources, version) {
							updatedTopResources[version] = [];
							angular.forEach(resources, function (resource, index) {
								// var index = $scope.data.topResources[verrsion].indexOf(resource);
								updatedTopResources[version].push(resObj[resource.ident]);
							});
						});
					}
					$scope.$evalAsync(function () {
						$scope.data.topResources = updatedTopResources;
						if (resArr.length === 1 || (!$scope.data.selectedResource && resArr.length > 0)) {
							// there was only 1 resource, it must be top level, and there is no harm in selecting it
							// OR it may not be selected by default if this resource was recently created
							$scope.data.selectedResource = $scope.data.topResources[$scope.data.selectedApiVersion][0];
							if ($scope.apiType.selected && $scope.apiType.selected.name === 'Resource') {
								$scope.$evalAsync(function () {
									if (checkResourceSelection) {
										$scope.resourceSelected();
									}
									// console.log('no other resource available, programatically select the only one in the list', angular.copy($scope.data.selectedResource));
								});
							}
							else {
								if (resourceRedirect) {
									return;
								}
								$scope.$evalAsync(function () { $scope.tableSelected(); });
							}
						}
					});
				});
			});
		};

		$scope.confirmCreateResource = function confirmCreateResource() {
			var scope = $scope;
			$modal.open({
				template: '<div class="modal-body">Are you sure you want to add a new custom resource?' +
					'<br/>' +
					'<br/>' +
					'<button class="btn btn-default" ng-click="cancel();">Cancel</button> ' +
					'<button class="btn btn-primary" ng-click="createResource();">Create Resource</button>' +
					'</div>',
				controller: function ($scope, $modalInstance) {
					$scope.createResource = function () {
						scope.createResource();
						$modalInstance.close();
					};
					$scope.cancel = $modalInstance.close;
				}
			});
		};

		$scope.hasUserTakenResourceTour = localStorage['eslo-ld-learn-resource'];
		$scope.createResource = function createResource() {
			console.log($scope.data.selectedTable);
			$rootScope.syncAction.resources = {
				action: 'create',
				version: $scope.data.selectedApiVersion,
				table: $scope.data.selectedTable
			};
			$location.path('/projects/' + $rootScope.currentProject.ident + '/resources');
		};
		$scope.editResource = function editResource() {
			$rootScope.syncAction.resources = {
				action: 'edit',
				version: $scope.data.selectedApiVersion,
				resource: $scope.data.selectedResource
			};
			$location.path('/projects/' + $rootScope.currentProject.ident + '/resources');
		};

		$scope.recentResourceRefresh = false;
		$scope.$watch('data.selectedResource', function (current, previous) {
			if (!current) {
				return;
			}
			if (!$scope.recentResourceRefresh) {
				$scope.recentResourceRefresh = true;
				// this timeout does not lag the UI, it throttles programatic top level refreshes
				$timeout(function () { $scope.recentResourceRefresh = false; }, 1000);
				kahuna.fetchData(current['@metadata'].href, null, function (data) {
					$scope.$evalAsync(function () {
						if (!$scope.resourceSelected) {
							return;
						}
						$scope.data.selectedResource = data;
						$scope.$evalAsync($scope.apiTypeSelected);
					});
				});
			}
		});

		// Save all GUI settings before navigating away
		$scope.saveSettings = function saveSettings() {
			var proj = $scope.currentProject;
			kahuna.deleteGuiSetting(proj, 'restlab');
			kahuna.storeGuiSetting(proj, 'restlab', 'requestJsonHeight', $("#requestJsonDiv").height());
			kahuna.storeGuiSetting(proj, 'restlab', 'responseJsonHeight', $("#responseJsonDiv").height());
			kahuna.storeGuiSetting(proj, 'restlab', 'apiTypeName',       $scope.apiType.selected && $scope.apiType.selected.name);
			kahuna.storeGuiSetting(proj, 'restlab', 'apiKey',            $scope.data.selectedApiKey && $scope.data.selectedApiKey.ident);
			kahuna.storeGuiSetting(proj, 'restlab', 'restMethod',        $scope.data.restMethod);
			kahuna.storeGuiSetting(proj, 'restlab', 'url',               $scope.data.requestUrl);
			kahuna.storeGuiSetting(proj, 'restlab', 'useHttps',          $scope.data.useHttps);

			kahuna.storeGuiSetting(proj, 'restlab', 'selectedTable',     $scope.data.selectedTable && $scope.data.selectedTable.name);
			kahuna.storeGuiSetting(proj, 'restlab', 'selectedView',      $scope.data.selectedView && $scope.data.selectedView.name);
			kahuna.storeGuiSetting(proj, 'restlab', 'selectedProcedure', $scope.data.selectedProcedure && $scope.data.selectedProcedure.name);
			kahuna.storeGuiSetting(proj, 'restlab', 'selectedResource',  $scope.data.selectedResource && $scope.data.selectedResource.ident);

			try{
				// it is sometimes necessary to saveSettings before the editor is ready
				kahuna.storeGuiSetting(proj, 'restlab', 'request', kahuna.restlab.aceReqEditor.getValue());
				kahuna.storeGuiSetting(proj, 'restlab', 'response', kahuna.restlab.aceRespEditor.getValue());
			}
			catch (e) {
				// ignore
			}
			kahuna.saveGuiSettings(proj);
		};

		// Set up the Ace editors
		$scope.aceEditorsSetup = function aceEditorsSetup(requestJsonHeight, responseJsonHeight, requestJsonText, responseJsonText) {
			kahuna.restlab.aceReqEditor = ace.edit("requestJsonBox");
			kahuna.restlab.aceReqEditor.setTheme("ace/theme/xcode");
			kahuna.restlab.aceReqEditor.getSession().setMode("ace/mode/json");
			kahuna.restlab.aceReqEditor.setOptions({
				fontFamily: "monospace",
				fontSize: kahuna.globals.aceEditorFontSize
			});

			kahuna.restlab.aceRespEditor = ace.edit("responseJsonBox");
			kahuna.restlab.aceRespEditor.setTheme("ace/theme/xcode");
			kahuna.restlab.aceRespEditor.getSession().setMode("ace/mode/json");
			kahuna.restlab.aceRespEditor.setOptions({
				fontFamily: "monospace",
				fontSize: kahuna.globals.aceEditorFontSize
			});
			kahuna.restlab.aceRespEditor.setReadOnly(true);

			$("#requestJsonDiv").resizable({
				handles: "s",
				minHeight: 25,
				stop: function requestResizeStop(event, ui) {
					kahuna.restlab.aceReqEditor.resize(true);
				}
			});

			$("#responseJsonDiv").resizable({
				handles: "s",
				minHeight: 25,
				stop: function responseResizeStop(event, ui) {
					kahuna.restlab.aceRespEditor.resize(true);
				}
			});

			$('#requestJsonDiv').height(requestJsonHeight);
			$('#responseJsonDiv').height(responseJsonHeight);

			kahuna.restlab.aceRespEditor.resize(true);

			// Restore the request and response text if we know it
			kahuna.restlab.aceReqEditor.getSession().setValue(requestJsonText);
			kahuna.restlab.aceReqEditor.getSession().getSelection().moveCursorFileStart();

			kahuna.restlab.aceRespEditor.getSession().setValue(responseJsonText);
			$scope.getModeTypeFromContent(responseJsonText);
			kahuna.restlab.aceRespEditor.getSession().getSelection().moveCursorFileStart();

			angular.element('select,input').focus(function () {
				$scope.$apply();
			});
			$scope.$watch('data', function (current, previous) {
					var update = angular.copy(current);
					delete update.ruleEvents;
					if (!angular.equals(update, previous)) {
						angular.element('.response-header').addClass('outdated');
					}
				},
				true
			);
		};

		// When selecting a current Auth Token, API version or resource, we have to do it based
		// on the ident because this may be from the history, and the e.g. Auth Tokens in the history
		// are not the same objects as those just retrieved from the server.
		function selectApiKey(key) {
			if (key) {
				for (var i = 0; i < $scope.data.apiKeys.length; i++) {
					if ($scope.data.apiKeys[i].ident == key.ident) {
						$scope.data.selectedApiKey = $scope.data.apiKeys[i];
						return;
					}
				}
			}
			$scope.data.selectedApiKey = null;
		}

		function selectApiVersion(ver) {
			if (ver) {
				for (var i = 0; i < $scope.data.apiVersions.length; i++) {
					if ($scope.data.apiVersions[i] === ver) {
						$scope.data.selectedApiVersion = $scope.data.apiVersions[i];
						$scope.data.selectedResource = null;
						return;
					}
				}
			}
			$scope.data.selectedApiVersion = null;
		}

		function selectResource(res) {
			if (res) {
				for (var i = 0; i < $scope.data.topResources.length; i++) {
					if ($scope.data.topResources[i].ident === res.ident) {
						$scope.data.selectedResource = $scope.data.topResources[i];
						$scope.data.selectedApiVersion = selectedResource.apiVersion;
						return;
					}
				}
			}
			$scope.data.selectedResource = null;
		}

		$scope.apiVersionSelected = function restlab_apiVersionSelected() {
			var newres = null;
			for (var i in $scope.allResources) {
				if ($scope.selectedApiVersion === $scope.allResources[i].apiVersion) {
					newres = $scope.allResources[i];
					break;
				}
			}
			$scope.selectedResource = newres;
			var versionSpecificResources = _.filter($scope.data.allResources, function (res) {
				return res.apiVersion == $scope.data.selectedApiVersion;
			});
			if (versionSpecificResources) {
				$scope.data.selectedResource = _.values(versionSpecificResources)[0];
			}
		};

		function selectTab(idx, scope) {
			if (scope.$$phase) {
				for (var i = 0; i < scope.data.activeTab.length; i++) {
					scope.data.activeTab[i] = false;
				}
				scope.data.activeTab[idx] = true;
			}
			else {
				scope.$apply(function () {
					for (var i = 0; i < scope.data.activeTab.length; i++) {
						scope.data.activeTab[i] = false;
					}
					scope.data.activeTab[idx] = true;
				});
			}
		}

		$scope.copyToRequestJson = function copyToRequestJson() {
			var selectedText = kahuna.restlab.aceRespEditor.session.getTextRange(kahuna.restlab.aceRespEditor.getSelectionRange());
			if ( ! selectedText || selectedText.length == 0) {
				selectedText = kahuna.restlab.aceRespEditor.getSession().getValue();
			}
			$scope.data.requestJson = selectedText;
			kahuna.restlab.aceReqEditor.setValue(selectedText);
			selectTab(0, $scope);
		};

		$scope.createUrl = function createUrl(endpoint) {
			$scope.$broadcast('RegenerateUrl', endpoint);
		};

		$scope.resourceSelected = function restlab_resourceSelected() {
			if ($scope.data.selectedResource && !$scope.lockedSelection) {
				$scope.createUrl($scope.data.selectedResource.name);
				$scope.$broadcast('ResourceSelected');
			}
		};

		$scope.tableSelected = function restlab_tableSelected() {
			if (resourceRedirect) {
				return;
			}
			if ($scope.data.selectedTable && !$scope.lockedSelection) {
				$scope.clearRequestFilters();
				$scope.createUrl($scope.data.selectedTable.name);
			}
		};

		$scope.viewSelected = function restlab_viewSelected() {
			if ($scope.data.selectedView && !$scope.lockedSelection) {
				$scope.createUrl($scope.data.selectedView.name);
			}
		};

		$scope.procedureSelected = function restlab_procedureSelected() {
			if ($scope.data.selectedProcedure && !$scope.lockedSelection) {
				$scope.createUrl($scope.data.selectedProcedure.name);
			}
		};

		$scope.$on('RegenerateUrl', function restlab_on_RegenerateUrl(event, endpoint) {
			if (angular.isUndefined(endpoint)) {
				// this is probably a refresh called after the connect wizard
				endpoint = $scope.data.selectedTable.name;
			}
			$scope.$evalAsync(function () {
				var encodedEndpoint = endpoint ? encodeURIComponent(endpoint) : "<not selected>";
				if ($scope.data.selectedApiVersion) {
					$scope.data.requestUrl = kahuna.serverUrl +
						kahuna.globals.currentAccount.url_name + '/' +
						$scope.currentProject.url_name + '/' +
						($scope.data.selectedApiVersion || "<na>") + '/' +
						encodedEndpoint;
					$scope.httpsFixup();

					// console.log($scope.data.requestUrl, angular.copy($scope.currentProject), $scope);
				}
				$scope.$broadcast('RequestUpdated');
			});
		});

		var collapsedSize = 25;
		$scope.collapseJsonUp = function collapseJsonUp() {
			var topHeight = $("#requestJsonDiv").height();
			var bottomHeight = $("#responseJsonDiv").height();

			var restlabParamRowsHeight = 190;
			var mainHeight = $('#MainView').height() - restlabParamRowsHeight;

			$("#requestJsonDiv").height(collapsedSize);
			$("#responseJsonDiv").height(mainHeight - collapsedSize);
			kahuna.restlab.aceReqEditor.resize(true);
			kahuna.restlab.aceRespEditor.resize(true);
		};

		$scope.collapseJsonMiddle = function collapseJsonMiddle() {
			var topHeight = $("#requestJsonDiv").height();
			var bottomHeight = $("#responseJsonDiv").height();

			var restlabParamRowsHeight = 190;
			var mainHeight = $('#MainView').height() - restlabParamRowsHeight;

			console.log(mainHeight);
			var newHeight = mainHeight / 2;

			$("#requestJsonDiv").height(newHeight);
			$("#responseJsonDiv").height(newHeight);
			kahuna.restlab.aceReqEditor.resize(true);
			kahuna.restlab.aceRespEditor.resize(true);
		};

		$scope.collapseJsonDown = function collapseJsonDown() {
			var topHeight = $("#requestJsonDiv").height();
			var bottomHeight = $("#responseJsonDiv").height();

			var restlabParamRowsHeight = 190;
			var mainHeight = $('#MainView').height() - restlabParamRowsHeight;

			$("#responseJsonDiv").height(10);
			$("#requestJsonDiv").height(mainHeight - collapsedSize);
			kahuna.restlab.aceReqEditor.resize(true);
			kahuna.restlab.aceRespEditor.resize(true);
		};

		$scope.useHttpsChanged = function useHttpsChanged() {
			$scope.httpsFixup();
		};

		$scope.httpsFixup = function httpsFixup() {
			// If the app is run over https, then we *have* to use
			// https, otherwise the request will fail.
			if ( 'https' == $location.protocol()) {
				$scope.data.useHttps = true;
			}

			var regex = $scope.data.useHttps ? /^\s*http:/i : /^\s*https:/i;
			var subst = $scope.data.useHttps ? "https:" : "http:";

			if ($scope.data.requestUrl && $scope.data.requestUrl.match(regex)) {
				$scope.data.requestUrl = $scope.data.requestUrl.replace(regex, subst);
			}
		};

		// Determine whether the debug checkbox should be disabled
		$scope.debugDisabled = function restlab_debugDisabled() {
			return kahuna.globals.currentAccountOptions[4] == null || kahuna.globals.currentAccountOptions[4].option_value != 'true';
		};

		/**
		 * doDebugger checks if the a deprecated debugging feature is active and sets a flag for API Server.
		 * For now it should universally be ignored
		 */
		$scope.doDebugger = function doDebugger(func) {
			console.log('debuggerRoute');
			if ($scope.data.debuggerActive) {
				console.log('deprecated debugging action');
				if ($scope.data.requestUrl.indexOf('debug=true') == -1) {
					if ($scope.data.requestUrl.indexOf('?') == -1) {
						$scope.data.requestUrl += "?debug=true";
					}
					else {
						$scope.data.requestUrl += "&debug=true";
					}
				}
				if ( ! kahuna.debug.socket) {
					// console.log("RestLab is starting debugger");
					KahunaDebug.startDebugger($scope, func);
				}
				else {
					func && func();
				}
			}
			else {
				if (kahuna.debug.socket) {
					console.log("RestLab: doDebugger is stopping debugger");
					KahunaDebug.stopDebugger();
				}
				var debugIdx = $scope.data.requestUrl.indexOf('debug=true');
				if (debugIdx > -1) {
					$scope.data.requestUrl = $scope.data.requestUrl.substring(0, debugIdx) +
							$scope.data.requestUrl.substring(debugIdx + 10);
				}
				func && func();
			}
		};

		function checkJsonRequest() {
			var requestJson = kahuna.restlab.aceReqEditor.getValue();
			if (requestJson && /,\s*$/.test(requestJson)) {
				var idx = requestJson.lastIndexOf(",");
				requestJson = requestJson.substring(0, idx);
				kahuna.restlab.aceReqEditor.setValue(requestJson);
			}
		}

		$scope.removeOutdated = function restlab_removeOutdated() {
			angular.element('.response-header').removeClass('outdated');
		};

		$scope.isAllowableRequest = function isAllowableRequest() {
			var isAllowable = true;
			if (!$scope.data.selectedApiKey) {
				isAllowable = false;
			}
			return isAllowable;
		};
		
	$scope.isRuleSummaryOutput = false;
	// angular restlab.html scope is out of sync with the args area, manually update:
	$scope.updateRuleSummaryOutput = function updateRuleSummaryOutput(a, b) {
		$scope.isRuleSummaryOutput = !$scope.isRuleSummaryOutput;
	};
	$scope.formatData = function formatData(type, data) {
		var formatted = angular.copy(data);
		if (type == 'json') {
			if (!$scope.isRuleSummaryOutput) {
				delete formatted.rulesummary;
			}
			formatted = kahuna.util.formatToJson(formatted);
		}
		
		return formatted;
	};

		// ace editor 'modeType' given a response type of json, csv, xml
		$scope.getModeTypeFromResponseType = function getModeTypeFromResponseType(responseType) {
			switch (responseType || 'json') {
			case 'csv':
				return 'text';
			case 'json':
				return 'json';
			case 'xml':
				return 'xml';
			default:
				return responseType || 'json';
			}
		};

		$scope.getResponseTypeFromHeaders = function getResponseTypeFromHeaders(headersObject) {
			// improperly formatted content type, possible but unlikely, ignore and output type as json
			var responseType = (headersObject && headersObject['content-type'] && headersObject['content-type'].split('/')[1]) || 'json';

			var modeType = $scope.getModeTypeFromResponseType(responseType);

			kahuna.restlab.aceReqEditor.getSession().setMode("ace/mode/" + modeType);
			kahuna.restlab.aceRespEditor.getSession().setMode("ace/mode/" + modeType);

			return responseType;
		};

		$scope.getModeTypeFromContent = function getModeTypeFromContent(content) {
			var modeType;
			switch ((content && content.charAt(0)) || '') {
			case '<':
				modeType = 'xml';
				break;
			case '[':
			case '{':
				modeType = 'json';
				break;
			default:
				// not obviously anything, assume CSV
				modeType = 'text';
				break;
			}

			kahuna.restlab.aceReqEditor.getSession().setMode("ace/mode/" + modeType);
			kahuna.restlab.aceRespEditor.getSession().setMode("ace/mode/" + modeType);
			return modeType;
		};

		$scope.sendRequest = function restlab_sendRequest(verb) {
			if (!$scope.isAllowableRequest()) {
				kahuna.util.error('Please select an Auth Token before making requests.');
				return;
			}
			if ( 'https' == $location.protocol()) {
				$scope.data.useHttps = true;
				$scope.httpsFixup();
			}

			$scope.data.restMethod = verb;

			var apiVersion = $scope.data.selectedApiVersion;

			// if an initial get is being called, the api version may be out of sync, prefer the selected resource version name
			if ($scope.data.selectedResource && ($scope.data.selectedResource.apiVersion != $scope.data.selectedApiVersion)) {
				apiVersion = $scope.data.selectedResource.apiVersion;
			}

			$scope.removeOutdated();
			if ( ! $scope.data.selectedApiKey) {
				// Sometimes Auth Token takes a second to be fetched
				// call it again after a digest cycle
				$scope.$evalAsync(function () { $scope.sendRequest(verb); });
				return;
			}
			var historyRecord = {
				request: {
					url: $scope.data.requestUrl,
					useHttps: $scope.data.useHttps,
					resource: $scope.data.selectedResource,
					table: $scope.data.selectedTable,
					view: $scope.data.selectedView,
					procedure: $scope.data.selectedProcedure,
					apiTypeName: $scope.apiType.name,
					apiKey: $scope.data.selectedApiKey,
					apiVersion: apiVersion,
					debug: $scope.data.debuggerActive
				}
			};

			$scope.data.txSummary = null;
			try {
				kahuna.restlab.aceRespEditor.getSession().setValue("// in progress");
			}
			catch (e) {
			}
			$scope.removeOutdated();

			var filterAppend = '';
			if ($scope.data.showFiltering) {
				filterAppend = '?' + $scope.refreshFilters();
			}

			switch ($scope.data.restMethod) {
			default:
			case "GET":
				$scope.collapseJsonUp();
				if ("GET" !== $scope.data.restMethod) {
					$scope.data.restMethod = "GET";
				}

				$scope.doDebugger(function performGet() {
					var requestUrl = $scope.data.requestUrl;
					if (requestUrl.match(/\?/)) {
						filterAppend = filterAppend.replace(/\?/, '&');
					}
					KahunaData.queryWithKey(requestUrl + filterAppend, null, $scope.data.selectedApiKey, function (data, status, headers) {
						$scope.removeOutdated();

						var headerObject = headers && headers();
						responseType = $scope.getResponseTypeFromHeaders(headerObject);

						var formattedData = $scope.formatData(responseType, data);
						kahuna.restlab.aceRespEditor.getSession().setValue(formattedData);
						kahuna.restlab.aceRespEditor.getSession().getSelection().moveCursorFileStart();

						KahunaDebug.stopDebugger();

						$scope.data.txSummary = null;
						showRuleSummary(null);

						historyRecord.request.method = "GET";
						historyRecord.response = {
							data: formattedData
						};

						kahuna.restlab.history.push(historyRecord);
						if (kahuna.restlab.history.length > 4) {
							kahuna.restlab.history.shift();
						}

						$scope.saveSettings();
					}, function (res, data) {
						if (data == 400) {
							alert('The server responded with a 400 error, you mostly likey have an impoperly formatted URL');
						}
						else {
							alert(res.errorMessage || res);
						}
					});
				});
				break;

			case "POST":
				checkJsonRequest();
				$scope.collapseJsonMiddle();
				$scope.doDebugger(function performPost() {
					KahunaData.createWithKey($scope.data.requestUrl, kahuna.restlab.aceReqEditor.getValue(), { rulesummary: true },
							$scope.data.selectedApiKey, function (data, status, headers) {
						$scope.removeOutdated();

						var headerObject = headers && headers();
						responseType = $scope.getResponseTypeFromHeaders(headerObject);

						var formattedData = $scope.formatData(responseType, data);
						kahuna.restlab.aceRespEditor.getSession().setValue(formattedData);
						kahuna.restlab.aceRespEditor.getSession().getSelection().moveCursorFileStart();

						KahunaDebug.stopDebugger();

						$scope.data.txSummary = data.txsummary;
						$scope.data.rulesummary = data.rulesummary;
						showRuleSummary(data.rulesummary);

						historyRecord.request.method = "POST";
						historyRecord.request.data = kahuna.restlab.aceReqEditor.getValue();
						historyRecord.response = {
							data: formattedData,
							txsummary: data.txsummary,
							rulesummary: data.rulesummary
						};

						kahuna.restlab.history.push(historyRecord);
						if (kahuna.restlab.history.length > 4) {
							kahuna.restlab.history.shift();
						}

						$scope.saveSettings();
					});
				});
				break;

			case "PUT":
				checkJsonRequest();
				$scope.collapseJsonMiddle();
				$scope.doDebugger(function performPut() {
					KahunaData.updateWithKey($scope.data.requestUrl, kahuna.restlab.aceReqEditor.getValue(), { rulesummary: true },
							$scope.data.selectedApiKey, function (data, status, headers) {
						$scope.removeOutdated();

						var headerObject = headers && headers();
						responseType = $scope.getResponseTypeFromHeaders(headerObject);

						var formattedData = $scope.formatData(responseType, data);
						kahuna.restlab.aceRespEditor.getSession().setValue(formattedData);
						kahuna.restlab.aceRespEditor.getSession().getSelection().moveCursorFileStart();
						kahuna.restlab.aceRespEditor.resize(true);

						KahunaDebug.stopDebugger();

						$scope.data.txSummary = data.txsummary;
						$scope.data.rulesummary = data.rulesummary;
						showRuleSummary(data.rulesummary);

						historyRecord.request.method = "PUT";
						historyRecord.request.data = kahuna.restlab.aceReqEditor.getValue();
						historyRecord.response = {
							data: formattedData,
							txsummary: data.txsummary,
							rulesummary: data.rulesummary
						};

						kahuna.restlab.history.push(historyRecord);
						if (kahuna.restlab.history.length > 4) {
							kahuna.restlab.history.shift();
						}

						$scope.saveSettings();
					});
				});
				break;

			case "DELETE":
				$scope.collapseJsonUp();
				$scope.doDebugger(function performDelete() {
					KahunaData.deleteWithKey($scope.data.requestUrl, { rulesummary: true },
							$scope.data.selectedApiKey, function (data, status, headers) {
						$scope.removeOutdated();

						var headerObject = headers && headers();
						responseType = $scope.getResponseTypeFromHeaders(headerObject);

						var formattedData = $scope.formatData(responseType, data);
						kahuna.restlab.aceRespEditor.getSession().setValue(formattedData);
						kahuna.restlab.aceRespEditor.getSession().getSelection().moveCursorFileStart();

						KahunaDebug.stopDebugger();

						$scope.data.txSummary = data.txsummary;
						$scope.data.rulesummary = data.rulesummary;
						showRuleSummary(data.rulesummary);

						historyRecord.request.method = "DELETE";
						historyRecord.request.data = kahuna.restlab.aceReqEditor.getValue();
						historyRecord.response = {
							data: formattedData,
							txsummary: data.txsummary,
							rulesummary: data.rulesummary
						};

						kahuna.restlab.history.push(historyRecord);
						if (kahuna.restlab.history.length > 4) {
							kahuna.restlab.history.shift();
						}

						$scope.saveSettings();
					});
				});
				break;
			}
		};

		$scope.formatTxSummary = function restlab_formatTxSummary(obj) {
			return kahuna.util.formatToJson(obj);
		};

		$scope.getTxSummaryItemClass = function (obj) {
			switch (obj) {
				case 'INSERT': return "TxSummaryItemInsert";
				case 'UPDATE': return "TxSummaryItemUpdate";
				case 'DELETE': return "TxSummaryItemDelete";
			}
		};

		// Rule summary

		function rulesummaryClicked(row) {
			$(".LogicTreeRow").removeClass("LogicTreeRowSel");
			$(this).addClass("LogicTreeRowSel");
			var detailsTable = formatEvent($scope.data.ruleEvents[$(this).attr('id')]);
			$("#eventDetails").html(detailsTable);
		}

		function showRuleSummary(rulesummary) {
			if ( ! rulesummary) {
				$("#eventsTree").html("");
				$scope.data.ruleEvents = null;
				return;
			}
			var tree = "<table class='LogicTree'>\n";
			var treeLevel = 0;
			var treeIndent = 0;
			var eventId = 1;
			$scope.data.ruleEvents = {};
			var eventTypes = {
					"AFTER_PARENT_COPY": {name: "Parent copy", clsName: "ParentCopy", symbol: "P"},
					"AFTER_FORMULA": {name: "Formula", clsName: "Formula", symbol: "F"},
					"AFTER_AGGREGATE": {name: "Aggregate", clsName: "Aggregate", symbol: "A"},
					"AFTER_CONSTRAINT": {name: "Validation", clsName: "Validation", symbol: "V"},
					"BEFORE_ACTION": {name: "Begin event", clsName: "BeginEvent", symbol: "E"},
					"AFTER_ACTION": {name: "End event", clsName: "AfterEvent", symbol: "E"},
					"AFTER_MANAGED_PARENT": {name: "After managed parent", clsName: "AfterManagedParent", symbol: "M"},
					"BEFORE_COMMIT": {name: "Before commit", clsName: "BeforeCommit", symbol: "C"},
					"AFTER_COMMIT": {name: "After commit", clsName: "AfterCommit", symbol: "C"},
					"LOGIC_RUNNER": {name: "Begin", clsName: "Begin", symbol: ">"}
			};
			for (var i = 0; i < rulesummary.length; i++) {
				var rowData = "";
				treeIndent = 0;
				var evt = rulesummary[i];
				evt.shortName = eventTypes[evt.type].name;
				evt.symbol = eventTypes[evt.type].symbol;
				$scope.data.ruleEvents['evt' + eventId] = evt;
				if (evt.type == "LOGIC_RUNNER") {
					if (evt.subtype.substring(0, 5) == "BEGIN") {
						treeIndent = 1;
						rowData += "Begin logic for " + evt.pk;
					}
					else if (evt.subtype.substring(0, 3) == "END") {
						rowData += "End logic for " + evt.pk;
						treeLevel--;
						evt.symbol = "<";
					}
				}
				else if (evt.type == "BEFORE_COMMIT" || evt.type == "AFTER_COMMIT") {
					rowData += evt.shortName;
				}
				else {
					rowData += evt.shortName + ": " + (evt.CopyAttribute?evt.CopyAttribute:"") + " " + evt.pk;
				}
				var row = "<tr class='LogicTreeRow' id='evt" + (eventId++) + "'><td class='LogicTreeRowCell'>";
				for (var j = 0; j < treeLevel; j++)
					row += "<span class='LogicTreeSpacer'>&nbsp;</span>";
				row += "<span class='LogicTreeEvent LogicTree" + eventTypes[evt.type].clsName + "'>" + evt.symbol + "</span>";
				row += rowData + "</td></tr>\n";
				tree += row;
				treeLevel += treeIndent;
			}
			tree += "</table>";
			$("#eventsTree").html(tree);
			$(".LogicTreeRow").click(rulesummaryClicked);

			// Select the first item
			if (rulesummary.length > 0) {
				rulesummaryClicked.call($("#evt1"));
			}
		}

		// Given an event, return HTML containing a table that describes the event.
		function formatEvent(evt) {
			var res = "<table class='EventPropTable'>\n";
			res += "<tr><td class='EventPropName'>Event type</td><td class='EventPropValue'>" + evt.type + "</td></tr>\n";
			res += "<tr><td class='EventPropName'>Entity</td><td class='EventPropValue'>" + evt.entity + " " + evt.pk + "</td></tr>\n";
			if (evt.CopyAttribute) {
				res += "<tr><td class='EventPropName'>Attribute</td><td class='EventPropValue'>" + evt.CopyAttribute + "</td></tr>\n";
			}
			if (evt.ruleId) {
				res += "<tr><td class='EventPropName'>Rule ID</td><td class='EventPropValue'>" + evt.ruleId + "</td></tr>\n";
			}
			if (evt.expression) {
				res += "<tr><td class='EventPropName'>Expression</td><td class='EventPropValue'>: " + evt.expression + "</td></tr>\n";
			}
			if (evt.predicate) {
				res += "<tr><td class='EventPropName'>Predicate</td><td class='EventPropValue'>" + evt.predicate + "</td></tr>\n";
			}
			if (evt.roleName) {
				res += "<tr><td class='EventPropName'>Role name</td><td class='EventPropValue'>" + evt.roleName + "</td></tr>\n";
			}
			if (evt.summedAttribute) {
				res += "<tr><td class='EventPropName'>Summed attribute</td><td class='EventPropValue'>" + evt.summedAttribute + "</tr></tr>\n";
			}
			if (evt.watchedAttribute) {
				res += "<tr><td class='EventPropName'>Watched attribute</td><td class='EventPropValue'>" + evt.watchedAttribute + "</td></tr>\n";
			}
			if (evt.properties) {
				for (var prop in evt.properties) {
					res += "<tr><td class='EventPropName'>" + prop + "</td><td class='EventPropValue'>" + evt.properties[prop] + "</td></tr>\n";
				}
			}
			res += "</table>\n";
			return res;
		}

		// Show history

		function showHistoryItem(oldReq, initial) {
			if (!oldReq.request.url.match($scope.currentProject.url_name)) {
				return;
			}
			$scope.$apply(function () {
				$scope.data.requestUrl = oldReq.request.url;
				$scope.data.restMethod = oldReq.request.method;

				if ( ! initial) {
					console.log("showHistoryItem: not initial");
					selectApiKey(oldReq.request.apiKey);
					selectApiVersion(oldReq.request.apiVersion);
					selectResource(oldReq.request.resource);
				}

				$scope.data.selectedTable = oldReq.request.table;
				$scope.data.selectedView = oldReq.request.view;
				$scope.data.selectedProcedure = oldReq.request.procedure;
				$scope.data.debuggerActive = oldReq.request.debug;
				$scope.data.useHttps = oldReq.request.useHttps;

				$scope.data.txSummary = oldReq.response.txsummary;
				$scope.data.rulesummary = oldReq.response.rulesummary;
				showRuleSummary(oldReq.response.rulesummary);
			});
			if (oldReq.request.data) {
				kahuna.restlab.aceReqEditor.setValue(oldReq.request.data);
			}
			else {
				// kahuna.restlab.aceReqEditor.setValue("");
			}
			kahuna.restlab.aceReqEditor.getSession().getSelection().moveCursorFileStart();
			if (oldReq.response.data) {
				kahuna.restlab.aceRespEditor.setValue(oldReq.response.data);
			}
			else {
				kahuna.restlab.aceRespEditor.setValue("");
			}
			kahuna.restlab.aceRespEditor.getSession().getSelection().moveCursorFileStart();

			// There is a bug in the Ace editor: if you set the value of the editor, and it's
			// in a non-shown tab, it will not be refreshed properly until someone scrolls or
			// causes a refresh. We trigger this by showing tab 1 for a short time. This causes
			// a bit of flicker, but it's the only way I have found so far to make this work.
			$scope.$apply(function () {
				selectTab(1, $scope);
			});
			setTimeout(function () { $scope.$apply(function () { selectTab(0, $scope); }); }, 50);

			$("#urlHistory").val(oldReq.request.url);
			$("#urlHistory").focus();
		}

		// Set up the combo for the URL
		setTimeout(function () {
			kahuna.restlab.urlControl = $("#urlHistory").autocomplete({
				minLength: 0,
				source: function (req, resp) {
					console.log("Building autocomplete list");
					var res = [];
					for (var i = 0; i < kahuna.restlab.history.length; i++) {
						var entry = {
							label: kahuna.restlab.history[i].request.method + " " + kahuna.restlab.history[i].request.url,
							value: i
						};
						res.push(entry);
					}
					resp(res);
					},
				select: function (event, ui) {
					var oldReq = kahuna.restlab.history[ui.item.value];
					showHistoryItem(oldReq, false);
					return false;
				}
			});
			if (kahuna.restlab.history.length > 0) {
				showHistoryItem(kahuna.restlab.history[kahuna.restlab.history.length - 1], true);
			}
		}, 500);

		$scope.showUrlHistory = function () {
			kahuna.restlab.urlControl.autocomplete("search", "");
		};

		// Grid

		// var cellEditableTemplate = "<input ng-class=\"'colt' + col.index\" ng-input=\"COL_FIELD\" ng-model=\"COL_FIELD\" ng-change=\"updateEntity(row.entity)\"/>";

		$scope.updateEntity = function (column, row) {
			console.log(row);
		};

		$scope.totalServerItems = 0;
		$scope.pagingOptions = {
			pageSizes: [20, 50, 100],
			pageSize: 20,
			currentPage: 1
		};

		$scope.colDefs = [];
		$scope.gridOptions = { data: 'gridData',
				enableCellSelection: true,
				enableCellEdit: false,
				enableRowSelection: false,
				multiSelect: false,
				showSelectionCheckbox: false,
				enablePaging: true,
				showFilter: true,
				showFooter: true,
				totalServerItems: 'totalServerItems',
				pagingOptions: $scope.pagingOptions,
				columnDefs: 'colDefs',
				rowTemplate: '<div style="height: 100%" ng-class="getGridRowStyle(row)">' +
					'<div ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell ">' +
					'<div ng-cell></div>' +
					'</div>' +
					'</div>'
		};

		// This gets called whenever something is "edited", even if no change is actually made
		// We compare the current value with the original value and set the __action to update if
		// any attribute is different.
		$scope.$on('ngGridEventEndCellEdit', function (evt) {
			console.log('Grid edited.');
			var currentRow = evt.targetScope.row.entity;
			var oldRow = evt.targetScope.row.entity["__original"];
			if ( ! oldRow) {
				// In the case of inserted rows
				return;
			}
			for (var i = 0; i <  kahuna.restlab.currentTableDetails.columns.length; i++) {
				var column = kahuna.restlab.currentTableDetails.columns[i];
				var oldValue = oldRow[column.name];
				var newValue = currentRow[column.name];
				if (oldValue != newValue) {
					evt.targetScope.row.entity["@metadata"].action = "UPDATE";
					return;
				}
			}
			evt.targetScope.row.entity["@metadata"].action = "";
		});

		$scope.getPagedDataAsync = function (pageSize, page) {
		};

		// Watch for changes in pagination
		$scope.$watch('pagingOptions', function (newVal, oldVal) {
			if (newVal !== oldVal && newVal.currentPage !== oldVal.currentPage) {
				$scope.getPagedDataAsync($scope.pagingOptions.pageSize, $scope.pagingOptions.currentPage);
			}
		}, true);

		// Return the text for the action button for each row
		$scope.formatGridActionColumn = function (row) {
			var body = "";
			var action = row.entity["@metadata"].action;
			if (!action) {
				body = "DELETE";
			}
			else if (action == 'UPDATE') {
				body = "REVERT";
			}
			else if (action == 'DELETE') {
				body = "UNDELETE";
			}
			else if (action == 'INSERT') {
				body = "REMOVE";
			}
			return body;
		};

		// Style the rows
		$scope.getGridRowStyle = function (row) {
			var action = row.entity["@metadata"].action;
			if (!action) {
				return "";
			}
			if (action == 'DELETE') {
				return "gridDeletedRow";
			}
			if (action == 'INSERT') {
				return "gridInsertedRow";
			}
			if (action == 'UPDATE') {
				return "gridUpdatedRow";
			}
			return "";
		};

		// Called when the action button is clicked for a row.
		$scope.gridActionClicked = function (row) {
			var idx = row.rowIndex;
			console.log("Action for index: " + idx);
			var action = row.entity["@metadata"].action;
			if ( ! action) {
				row.entity["@metadata"].action = 'DELETE';
			}
			else if (action == 'UPDATE') {
				for (var i = 0; i < kahuna.restlab.currentTableDetails.columns.length; i++) {
					var attName = kahuna.restlab.currentTableDetails.columns[i].name;
					row.entity[attName] = row.entity["__original"][attName];
				}
				row.entity["@metadata"].action = null;
			}
			else if (action == 'DELETE') {
				row.entity["@metadata"].action = null;
			}
			else if (action == 'INSERT') {
				$scope.gridData.splice(row.rowIndex, 1);
			}
		};

		$scope.gridInsertRow = function gridInsertRow() {
			var newRow = {};
			for (var i = 0; i < kahuna.restlab.currentTableDetails.columns.length; i++) {
				newRow[kahuna.restlab.currentTableDetails.columns[i].name] = "";
			}
			newRow["@metadata"] = {action: "INSERT"};
			$scope.gridData.push(newRow);
		};

		// Get the table details and set up the columns accordingly
		$scope.getTableDetails = function getTableDetails(f) {
			kahuna.meta.getTableDetails($scope.data.selectedTable.name, function (tblDetails) {
				// console.log(tblDetails);
				kahuna.restlab.currentTableDetails = tblDetails;
				var colDefs = [{
					displayName: "Action",
					enableCellEdit: false,
					enableCellSelection: false,
					groupable: false,
					cellTemplate: "<div class='ngCellText' ng-class='col.colIndex()'>" +
						"<button class='btn btn-mini btn-link' ng-click='gridActionClicked(row)'>{{formatGridActionColumn(row)}}</button></div>"
				},
				{
					field: '@metadata',
					visible: false
				}];

				for (var i = 0; i < tblDetails.columns.length; i++) {
					var width = "**";
					switch (tblDetails.columns[i].type) {
						case "BIGINT": width = "*"; break;
						case "BIT": width = "*"; break;
						case "BOOLEAN": width = "*"; break;
						case "CLOB": width = "****"; break;
						case "NCLOB": width = "****"; break;
						case "DATE": width = "**"; break;
						case "DECIMAL": width = "*"; break;
						case "DOUBLE": width = "*"; break;
						case "FLOAT": width = "*"; break;
						case "INTEGER": width = "*"; break;
						case "NUMERIC": width = "*"; break;
						case "REAL": width = "*"; break;
						case "SMALLINT": width = "*"; break;
						case "TIME": width = "*"; break;
						case "TIMESTAMP": width = "**"; break;
						case "TINYINT": width = "*"; break;
						case "CHAR":
						case "LONGNVARCHAR":
						case "LONGVARCHAR":
						case "NCHAR":
						case "NVARCHAR":
						case "VARCHAR":
							if (tblDetails.columns[i].size < 5) {
								width = "*";
							}
							else if (tblDetails.columns[i].size < 10) {
								width = "**";
							}
							else if (tblDetails.columns[i].size < 20) {
								width = "***";
							}
							else {
								width = "****";
							}
							break;
						default: width = "*";
					}
					colDefs.push({
						field: tblDetails.columns[i].name,
						displayName: tblDetails.columns[i].name,
						enableCellEdit: true,
						width: width
					});
				}
				$scope.colDefs = colDefs;

				f && f();
			});
		};

		// Retrieve a page of data from the server.
		$scope.getGridData = function getGridData() {
			KahunaData.queryWithKey($scope.data.requestUrl, null, $scope.data.selectedApiKey, function (data2, status, headers) {
				for (var i = 0; i < data2.length; i++) {
					// delete cleanedData[i]["@metadata"];
					for (var attName in data2[i]) {
						// Remove all arrays, e.g. links
						if (attName == "@metadata") {
							continue;
						}
						if (Array.isArray(data2[i][attName])) {
							delete data2[i][attName];
						}
					}
					// Make a copy so we can compare
					data2[i]["__original"] = kahuna.util.cloneObject(data2[i]);
				}
				$scope.gridData = data2;
				// $scope.$apply();
			});
		};

		// This gets called when the Fetch Data button is clicked
		$scope.fetchGridData = function fetchGridData() {
			$scope.getTableDetails($scope.getGridData);
		};

		// This gets called when the Save Changes button is clicked
		$scope.saveGridChanges = function saveGridChanges() {
			var dataToSave = [];

			for (var i = 0; i < $scope.gridData.length; i++) {
				if ( ! $scope.gridData[i]["@metadata"].action) {
					continue;
				}
				dataToSave.push($scope.gridData[i]);
			}

			KahunaData.updateWithKey($scope.data.requestUrl, JSON.stringify(dataToSave), { rulesummary: true },
					$scope.data.selectedApiKey, function (data2, status, headers) {

				if (data2.errorCode) {
					alert(data2.errorMessage);
					return;
				}

				for (var j = 0; j < $scope.gridData.length; j++) {
					if ($scope.gridData[j]["@metadata"].action == "INSERT") {
						$scope.gridData.splice(j, 1);
						j--;
					}
				}

				var numInserted = 0;
				var numUpdated = 0;
				var numDeleted = 0;
				var numShown = 0;
				for (var i = 0; i < data2.txsummary.length; i++) {
					var newObj = data2.txsummary[i];
					switch (newObj['@metadata']) {
					default:
						break;
					case 'INSERT':
						numInserted++;
						break;
					case 'UPDATE':
						numUpdated++;
						break;
					case 'DELETE':
						numDeleted++;
						break;
					}
				}

			LoopOverTxSummary:
				for (var i = 0; i < data2.txsummary.length; i++) {
					var newObj = data2.txsummary[i];
					if (newObj["@metadata"].resource != $scope.data.selectedTable.name) {
						continue;
					}
					var foundIdx = -1;
					for (var j = 0; j < $scope.gridData.length; j++) {
						if ($scope.gridData[j]["@metadata"].href == newObj["@metadata"].href) {
							foundIdx = j;
							if (newObj["@metadata"].verb == "DELETE") {
								$scope.gridData.splice(j, 1);
								continue LoopOverTxSummary;
							}
							$scope.gridData[j] = newObj;
							newObj["__original"] = kahuna.util.cloneObject(newObj);
							numShown++;
							break;
						}
					}
					if (foundIdx == -1) {
						// Not found -- it's a new row
						newObj["__original"] = kahuna.util.cloneObject(newObj);
						$scope.gridData.push(newObj);
						numShown++;
					}
				}
				var msg = "" + data2.txsummary.length + " object(s) affected: " +
					numInserted + " inserted, " + numUpdated + " updated, " + numDeleted + " deleted.";
				if (numShown != (numInserted + numUpdated + numDeleted)) {
					msg += "\nOnly " + numShown + " object(s) are shown here.";
				}
				kahuna.util.info(msg);
			});
		};

		// Fetch all Auth Tokens for the current project
		if ($scope.currentProject) {
			KahunaData.query('AllApiKeys', { pagesize: 100, sysfilter: 'equal(project_ident:' + $scope.currentProject.ident + ')' }, function (data) {
				$scope.data.apiKeys = data;
				if (data.length == 0) {
					return;
				}

				$scope.data.selectedApiKey = data[0];

				var lastApiKeyIdent = kahuna.getGuiSetting($scope.currentProject, 'restlab', 'apiKey');
				if (lastApiKeyIdent) {
					for (var i = 0; i < data.length; i++) {
						if (data[i].ident == lastApiKeyIdent) {
							$scope.data.selectedApiKey = data[i];
							break;
						}
					}
				}
			});
		}

		$scope.isInitialRequestReady = function isInitialRequestReady() {
			if ($location.search().wizard && $scope.initializedApiKey && $scope.initializedAceEditor && $scope.initializedController) {
				return true;
			}
			return false;
		};

		$scope.initializedApiKey = false;
		$scope.$watch('data.selectedApiKey', function restlab_watch_data_selectedApiKey(current) {
			if (current) {
				$scope.initializedApiKey = true;
			}
		});

		$scope.$watch('initializedApiKey', function restlab_watch_initializedApiKey() {
			if ($scope.isInitialRequestReady()) {
				$rootScope.$broadcast('InitialRestRequest');
			}
		});

		$scope.$watch('initializedController', function restlab_watch_initializedController(current) {
			if ($scope.isInitialRequestReady()) {
				$rootScope.$broadcast('InitialRestRequest');
			}
		});

		// the ace editor may be initialized already, depending on how quickly the dom loaded
		if (angular.isUndefined($scope.initializedAceEditor)) {
			$scope.initializedAceEditor = false;
		}

		$scope.$watch('initializedAceEditor', function restlab_wath_initializedAceEditor() {
			if ($scope.isInitialRequestReady()) {
				$rootScope.$broadcast('InitialRestRequest');
			}
		});

		$scope.viewDocs = function viewDocs() {
			var url = location.href;

			// If the URL contains "/index.html", we need to get rid of it
			// and everything that follows.
			var indices = /\/index\.html/.exec(url);
			if (indices) {
				url = url.substring(0, indices.index);
			}

			if (url.indexOf('#') > 0) {
				url = url.substring(0, url.indexOf('#'));
			}
			if (url.indexOf('?') > 0) {
				url = url.substring(0, url.indexOf('?'));
			}
			if (url.charAt(url.length - 1) != '/') {
				url += '/';
			}
			if (url.substring(0, 22) == ("http://localhost:8080/")) {
				url = "http://localhost:8080/APICreator/";
			}
			var srcUrl = url + "../rest/" + kahuna.globals.currentAccount.url_name + "/" +
				$rootScope.currentProject.url_name + "/" + $scope.data.selectedApiVersion + "/@docs";
			if (url.substring(0, 22) == ("http://localhost:8080/")) {
				srcUrl = kahuna.hostUrl + "/rest/" + kahuna.globals.currentAccount.url_name + "/" +
				$rootScope.currentProject.url_name + "/" + $scope.data.selectedApiVersion + "/@docs";
			}

			if (!$scope.data.selectedApiKey) {
				return;
			}

			$('#docsView').attr('src', url + 'swagger-ui-2.1.4/index.html?url=' + srcUrl + "&key=" + $scope.data.selectedApiKey.apikey);
		};

		$scope.data.showFiltering = false;
		$scope.filterUrlFragment = '';
		
		
		// defaultValue set to true means
		$scope.filterTypes = {
			"GET": [
				{ name: 'sysfilter', structured: true, format: 'complex', defaultValue: "equal(ColumnName:'columnValue')", complex: true },
				{ name: 'sysorder', structured: true, format: 'text', defaultValue: "(ColumnName:asc_uc)", complex: true },
				{ name: 'userfilter', structured: true, format: 'text', defaultValue: "namedFilter(ColumnName:'value')", complex: true },
				{ name: 'userorder', structured: true, format: 'text', defaultValue: "namedFilter(ColumnName:asc_uc)", complex: true },
				{ name: 'pagesize', format: 'numeric', defaultValue: true },
				{ name: 'nometa', format: 'numeric', defaultValue: true },
				{ name: 'responseformat', format: 'text', defaultValue: true },
				{ name: 'As Defined', defineArg: true, format: 'complex', complex: true }
				// { name: 'offset', format: 'numeric' },
			]
		};

		$scope.genericFilters = {
			pagesize: null,
			nometa: 'false',
			responseformat: 'default'
		};
		
		$scope.getIndexOfFilterType = function getIndexOfFilterType(type) {
			var index = null;
			_.each($scope.filterTypes['GET'], function (e, i) {
				if (e.name == type) {
					index = i;
				}
			});
			
			return index;
		};
		$scope.updatePageSize = function updatePageSize() {
			$scope.removeRequestFiltersByType('pagesize');
			$scope.addRequestFilter({
				type: $scope.filterTypes['GET'][$scope.getIndexOfFilterType("pagesize")],
				value: $scope.genericFilters.pagesize
			});
		};
		$scope.updateResponseFormat = function updateResponseFormat() {
			$scope.removeRequestFiltersByType('responseformat');
			
			if ($scope.genericFilters.responseformat == 'default') { return; }
			$scope.addRequestFilter({
				type: $scope.filterTypes['GET'][$scope.getIndexOfFilterType("responseformat")],
				value: $scope.genericFilters.responseformat
			});
		};
		
		$scope.responseTypes = [
		    { name: 'default' },
			{ name: 'csv' },
			{ name: 'json' },
			{ name: 'jsonObject' },
			{ name: 'xml' }
		];
		
		$scope.updateNoMeta = function updateNoMeta() {
			$scope.removeRequestFiltersByType('nometa');
			
			$scope.addRequestFilter({
				type: $scope.filterTypes['GET'][$scope.getIndexOfFilterType("nometa")],
				value: $scope.genericFilters.nometa
			});
			
			$scope.refreshFilters();
		};
		
		$scope.requestFilters = [];
		$scope.removeRequestFiltersByType = function removeRequestFiltersByType(type) {
			var deletions = [];
			_.each($scope.requestFilters, function (e, i) {
				if (e.type.name == type) {
					e.splice = true;
					$scope.removeRequestFilter(i);
				}
			});
			
			return;
			$scope.requestFilters = _.reject($scope.requestFilters, function (obj) {
				return obj.splice;
			});
		};
		$scope.addRequestFilter = function addRequestFilter(filterObj) {
			if (angular.isUndefined(filterObj)) {
				filterObj = {
					type: $scope.filterTypes['GET'][0],
					value: undefined
				};
			}
			if (filterObj.type.defaultValue && !filterObj.value) {
				if (filterObj.type.defaultValue == true) {
					filterObj.value = $scope.genericFilters[filterObj.type.name];
				}
				else {
					filterObj.value = filterObj.type.defaultValue;
				}
			}
			var index = $scope.requestFilters.push(filterObj);
			console.log($scope.requestFilters);
			return index;
		};

		$scope.clearRequestFilters = function clearRequestFilters() {
			$scope.requestFilters = [];
		};

		$scope.removeRequestFilter = function removeRequestFilter(index) {
			var res = $scope.requestFilters.splice(index, 1);
		};

		$scope.oldRequestFilters = angular.copy($scope.requestFilters);
		$scope.copyOldFilters = function copyOldFilters() {
			$scope.oldRequestFilters = angular.copy($scope.requestFilters);
		};

		$scope.refreshFilters = function refreshFilters() {
			$scope.filterUrlFragment = '';
			angular.forEach($scope.requestFilters, function (filter, index) {
				var previous = $scope.oldRequestFilters[index];
				var filterName = filter.type.name;

				if (previous && previous.type.name != filter.type.name) {
					if (filter.type.defaultValue == true) {
						filter.value = $scope.genericFilters[filter.type.name];
					}
					else {
						filter.value = filter.type.defaultValue || '';
					}
				}

				// before structured filters, we handled it this way
				if (angular.isDefined(filter.value) && !filter.type.structured) {
					if (filter.type.defineArg) {
						filterName =filter.filterName;
					}
					$scope.filterUrlFragment += filterName + '=' + filter.value;
					$scope.filterUrlFragment += '&';
				}

				// after structured filters Creator makes them methodized
				if (angular.isDefined(filter.value) && filter.type.structured) {
					if (filter.type.defineArg) {
						filterName =filter.filterName;
					}
					$scope.filterUrlFragment += filterName + '=' + filter.value;
					$scope.filterUrlFragment += '&';
				}
			});
			$scope.filterUrlFragment = $scope.filterUrlFragment.substring(0, $scope.filterUrlFragment.length - 1);
			$scope.filterOutput = $scope.filterUrlFragment;

			$scope.oldRequestFilters = angular.copy($scope.requestFilters);
			return $scope.filterUrlFragment;
		};

		$scope.$watch('requestFilters', function restlab_watch_requestFilters(current, previous) {
			if (!current || !current.length) {
			}
			$scope.refreshFilters();
		}, true);

		$scope.setSampleFilters = function setSampleFilters() {
			$scope.addRequestFilter({
				type: $scope.filterTypes['GET'][1],
				value: 5
			});
			$scope.addRequestFilter({
				type: $scope.filterTypes['GET'][2],
				value: 5
			});
		};

		$scope.$watch('apiType.selected.name', function restlab_watch_apiType_selected_name(current, previous) {
			if (current === 'Procedure') {
				$scope.data.showFiltering = false;
			}
		});

		kahuna.meta.getAllResources($rootScope.currentProject, function () {
			$scope.initialize();
		});

		if ($rootScope.selectedSubResource) {
			$scope.initialize().then(function () {
				resourceRedirect = true;
				var versions = _.indexBy($scope.data.allApiVersions, 'ident');
				if ($rootScope.selectedSubResource.apiversion_ident && versions[$rootScope.selectedSubResource.apiversion_ident]) {
					$scope.data.selectedApiVersion = versions[$rootScope.selectedSubResource.apiversion_ident].name;
				}
				else {
					$scope.data.selectedApiVersion = 'v1';
				}
				$scope.apiTypeSelected();
				$scope.activeResourceFromResources = angular.copy($rootScope.selectedSubResource);
				// the api type has to digest before we can then select a resource
				$scope.$evalAsync(function () {
					$scope.apiType.selected = $scope.apiType.list[0];
					var useResIdent = $scope.activeResourceFromResources.container_ident || $scope.activeResourceFromResources.ident;
					var resList = _.indexBy($scope.data.topResources[$scope.data.selectedApiVersion], 'ident');
					var selectResourceIndex = $scope.data.topResources[$scope.data.selectedApiVersion].indexOf(resList[useResIdent]);
					$scope.saveSettings();

					// listen for a resource change selection
					var listener = $scope.$on('RequestUpdated', function () {
						// @todo this should not be necessary, but the auth token is very often not yet set
						$timeout(function () {
							$scope.data.selectedResource = $scope.data.topResources[$scope.data.selectedApiVersion][selectResourceIndex];
							// refresh again for good measure
							$scope.resourceSelected();

							// console.log('2nd selection from resource test', angular.copy($scope.data.selectedResource));
							$scope.$evalAsync(function () {
								$scope.sendRequest('GET');
								resourceRedirect = false;
								// console.log('///////////////AT REQUEST, resource was::', angular.copy($scope.data.selectedResource));
							});
						}, 0);
						listener();
					});

					// initiate the change
					$scope.resourceSelected();
					// console.log('1st selection from resource test', angular.copy($scope.data.selectedResource));
				});
				$rootScope.selectedSubResource = null;
			});
		}
	}
};
