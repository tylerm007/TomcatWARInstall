kahuna.authTokens = {

	AuthTokensCtrl : function ($rootScope, $scope, $http, $resource, $routeParams, $location, KahunaData) {

//		$( "#EditorTabs" ).tabs();
		$rootScope.currentPage = 'auth-tokens';
		$rootScope.currentPageHelp = 'docs/logic-designer/security/authentication';
		$rootScope.helpDialog('apikey', 'Help', localStorage['eslo-ld-learn-complete']);

		$scope.fetchApiKeys = function fetchApiKeys() {
			// Fetch all Auth Tokens for the current project
			var sysFilters = [];

			sysFilters.push('equal(project_ident:' + $scope.currentProject.ident + ')');

			if (!$scope.showAutoKeys) {
				sysFilters.push('equal(origin:null)');
			}

			if ($scope.apiKeySearch) {
				sysFilters.push('like_uc(name:\'%' + $scope.apiKeySearch + '%\')');
			}

			KahunaData.query('AllApiKeys'
				, {
					pagesize: 10000,
					sysfilter: sysFilters
				}
				, function (data) {
					$scope.apiKeys = data;
					if (data.length == 0) {
						return;
					}
					$scope.selectedApiKeys = [data[0]];

					// Grab all the roles, we'll need them later
					KahunaData.query('admin:roles'
						, {
							pagesize: 10000,
							sysfilter: 'equal(project_ident:' + $scope.currentProject.ident + ')'
						}
						, function (rolesData) {
							$scope.roles = {};
							rolesData.forEach(function (role) {
									role.checked = false;
									$scope.roles[role.ident] = role;
								}
							);
							$scope.apiKeySelected();
						}
					);
				}
			);
		};

		$scope.fetchApiKeys();

		$('#apiKeyExpiration').datepicker({
		});

		var findApiKeyIndex = function findApiKeyIndex(apiKey) {
			if ( ! $scope.apiKeys) {
				return -1;
			}
			for (var idx = 0; idx < $scope.apiKeys.length; idx++) {
				if ($scope.apiKeys[idx].ident == apiKey.ident) {
					return idx;
				}
			}
		};

		$scope.loggers = {
				admini: {name: "Administration", level: "FINE"},
				buslog: {name: "Business logic extensions", level: "FINE"},
				depend: {name: "Dependency analysis", level: "FINE"},
				generl: {name: "General", level: "FINE"},
				persis: {name: "Database access", level: "FINE"},
				engine: {name: "Rules engine", level: "FINE"},
				resrcs: {name: "Resources", level: "FINE"},
				securi: {name: "Security", level: "FINE"},
				sysdbg: {name: "System debug", level: "FINE"},
				ulogic: {name: "User logic", level: "FINE"}
		};

		$scope.$watch("showAutoKeys", $scope.fetchApiKeys);

		$scope.$watch("apiKeySearch", $scope.fetchApiKeys);

		$scope.apiKeySelected = function apiKeySelected() {
			// Set up the roles
			for (var roleIdent in $scope.roles) {
				$scope.roles[roleIdent].checked = false;
			}
			if ($scope.selectedApiKeys.length != 1) {
				$scope.selectedApiKey = null;
				return;
			}
			$scope.selectedApiKey = $scope.selectedApiKeys[0];
			for (var i = 0; i < $scope.selectedApiKeys[0].ApiKeyRoles.length; i++) {
				var keyRole = $scope.selectedApiKeys[0].ApiKeyRoles[i];
				if (keyRole['@metadata'].action == 'DELETE')
					continue;
				$scope.roles[keyRole.role_ident].checked = true;
			}

			// Set up logging info
			if ($scope.selectedApiKey.logging) {
				var logOptions = $scope.selectedApiKeys[0].logging.split(',');
				for (var i = 0; i < logOptions.length; i++) {
					var optionParts = logOptions[i].split("=");
					if (optionParts[0] == "*") {
						for (var logName in $scope.loggers) {
							$scope.loggers[logName].level = optionParts[1];
						}
					}
					else {
						if ($scope.loggers[optionParts[0]]) {
							// Avoid tripping on old, invalid logger names
							$scope.loggers[optionParts[0]].level = optionParts[1];
						}
					}
				}
			}
			else {
				for (var logName in $scope.loggers)
					$scope.loggers[logName].level = 'OFF';
			}
		};

		$scope.createApiKey = function createApiKey() {
			var newApiKeyName = 'New Auth Token';
			if ($scope.apiKeys) {
				for (var i = 1; i < 10000; i++) {
					var tentativeName = 'New Auth Token ' + i;
					if ($scope.apiKeys.some(function (apiKey) { return apiKey.name == tentativeName; })) {
						continue;
					}
					newApiKeyName = 'New Auth Token ' + i;
					break;
				}
			}

			var newApiKey = {
					project_ident: $scope.currentProject.ident,
					name: newApiKeyName,
					apikey: "?", // ? will cause a random key to be generated
					status: "A",
					logging: "*=FINE"
				};

			KahunaData.create("AllApiKeys", newApiKey, function (data) {
					for (var i = 0; i < data.txsummary.length; i++) {
						var modObj = data.txsummary[i];
						if (modObj['@metadata'].resource === 'AllApiKeys' && modObj['@metadata'].verb === 'INSERT') {
							modObj.ApiKeyRoles = [];
							$scope.apiKeys.push(modObj);
							$scope.selectedApiKey = modObj;
							$scope.selectedApiKeys = [modObj];
						}
					}
				}
			);
		};

		$scope.deleteApiKey = function deleteApiKey() {
			if ($scope.selectedApiKeys.length > 1) {
				if ( ! confirm("Are you sure you want to delete these " + $scope.selectedApiKeys.length + " Auth Tokens?")) {
					return;
				}
			}
			else {
				if ( ! confirm("Are you sure you want to delete this Auth Token (" + $scope.selectedApiKey.name + ")?")) {
					return;
				}
			}

			var numToDelete = $scope.selectedApiKeys.length;
			var originalNumToDelete = $scope.selectedApiKeys.length;
			for (var i = 0; i < $scope.selectedApiKeys.length; i++) {
				KahunaData.remove($scope.selectedApiKeys[i], function (data) {
					for (var i = 0; i < data.txsummary.length; i++) {
						var modObj = data.txsummary[i];
						if (modObj["@metadata"].resource == "AllApiKeys") {
							var deletedIndex = findApiKeyIndex(modObj);
							$scope.apiKeys.splice(deletedIndex, 1);
							if ($scope.apiKeys.length > 0) {
								$scope.selectedApiKey = $scope.apiKeys[0];
								$scope.selectedApiKeys[0] = $scope.apiKeys[0];
							}
							else {
								$scope.selectedApiKey = null;
								$scope.selectedApiKeys = [];
							}
						}
					}
					numToDelete--;
					if (numToDelete == 0) {
						$scope.fetchApiKeys();
						if (originalNumToDelete <= 1)
							kahuna.util.info('Auth Token was deleted');
						else
							kahuna.util.info('' + originalNumToDelete + ' Auth Tokens were deleted');
					}
				});
			}
		};

		$scope.saveApiKey = function saveApiKey() {
			if ($scope.selectedApiKeys.length != 1) {
				alert('Please select one Auth Token');
				return;
			}
			KahunaData.update($scope.selectedApiKeys[0], function (data) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj["@metadata"].resource == "AllApiKeys" && modObj.ident == $scope.selectedApiKeys[0].ident) {
						var updatedIndex = findApiKeyIndex(modObj);
						modObj.ApiKeyRoles = $scope.apiKeys[updatedIndex].ApiKeyRoles;
						$scope.apiKeys[updatedIndex] = modObj;
						$scope.selectedApiKeys[0] = modObj;
					}
					else if (modObj["@metadata"].resource == "AllApiKeys.ApiKeyRoles" && modObj["@metadata"].verb == 'INSERT') {
						for (var i = 0; i < $scope.selectedApiKeys[0].ApiKeyRoles.length; i++) {
							if ($scope.selectedApiKeys[0].ApiKeyRoles[i].ident == modObj.ident) {
								$scope.selectedApiKeys[0].ApiKeyRoles[i]['@metadata'].checksum = modObj.checksum;
								break;
							}
						}
					}
					else if (modObj["@metadata"].resource == "AllApiKeys.ApiKeyRoles" && modObj["@metadata"].verb == 'DELETE') {
						var delIdx = -1;
						for (var i = 0; i < $scope.selectedApiKeys[0].ApiKeyRoles.length; i++) {
							if ($scope.selectedApiKeys[0].ApiKeyRoles[i].ident == modObj.ident) {
								delIdx = i;
								break;
							}
						}
						$scope.selectedApiKeys[0].ApiKeyRoles.splice(delIdx, 1);
					}
				}
				kahuna.util.info('Auth Token was saved');
			});
		};

		$scope.saveLogging = function saveLogging() {
			var logVals = [];
			for (var logName in $scope.loggers)
				logVals.push(logName + '=' + $scope.loggers[logName].level);
			$scope.selectedApiKeys[0].logging = logVals.join(',');
			$scope.saveApiKey();
		};

		$scope.roleCheckClicked = function roleCheckClicked(role) {
			var roleIdent = role.ident;
			var keyRole = null;
			for (var i = 0; i < $scope.selectedApiKeys[0].ApiKeyRoles.length; i++) {
				var kr = $scope.selectedApiKeys[0].ApiKeyRoles[i];
				if (kr.role_ident != roleIdent) {
					continue;
				}
				keyRole = kr;
				break;
			}
			if (keyRole) {
				if (role.checked) {
					if (keyRole['@metadata'].action == 'DELETE') {
						delete keyRole['@metadata'].action;
					}
				}
				else {
					if (keyRole['@metadata'].action == 'INSERT') {
						var idx = $scope.selectedApiKeys[0].ApiKeyRoles.indexOf(keyRole);
						$scope.selectedApiKeys[0].ApiKeyRoles.splice(idx, 1);
					}
					else if ( ! keyRole['@metadata'].action) {
						keyRole['@metadata'].action = 'DELETE';
					}
				}
			}
			else {
				if (role.checked) {
					keyRole = {
						'@metadata': {action: 'INSERT'},
						apikey_ident: $scope.selectedApiKey.ident,
						role_ident: role.ident
					};
					$scope.selectedApiKeys[0].ApiKeyRoles.push(keyRole);
				}
			}
		};
	}
};
