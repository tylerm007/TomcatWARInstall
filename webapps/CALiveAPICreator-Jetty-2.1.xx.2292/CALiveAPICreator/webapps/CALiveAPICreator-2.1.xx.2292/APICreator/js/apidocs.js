kahuna.apidoc = {

	ApiDocCtrl : function ($rootScope, $scope, $http, $resource, $routeParams, $location, KahunaData) {

		$rootScope.currentPage = 'apidocs';
		$rootScope.currentPageHelp = 'docs/logic-designer/security/authentication';
		$rootScope.helpDialog('apidocs', 'Help', localStorage['eslo-ld-learn-complete']);

		$scope.data = {};
		$scope.data.serverUrl = kahuna.serverUrl;

		var ssIdx = kahuna.serverUrl.indexOf("//");
		var sIdx = kahuna.serverUrl.indexOf("/", ssIdx + 2);
		$scope.data.hostname = kahuna.serverUrl.substring(ssIdx + 2, sIdx);

		$scope.data.allTables = kahuna.meta.allTables;
		$scope.data.tableDetails = {};
		$scope.data.tableNames = [];
		$scope.data.tableAccordion = [];
		$scope.data.resourceDetails = {};

		// Gets called when a table accordion is open
		function showTableDetails(idx) {
			var tblName = $scope.data.tableNames[idx];
			if ($scope.data.tableDetails[tblName]) {
				return;
			}
			KahunaData.query('@tables/' + tblName, {projectId: $scope.currentProject.ident}, function (data) {
				var dtl = "<table>";
				for (var i = 0; i < data.columns.length; i++) {
					dtl += "<tr><td>" + data.columns[i].name + "</td><td>" + data.columns[i].type + "</td></tr>";
				}
				dtl += "</table>";
				if ($scope.$$phase) {
					$scope.data.tableDetails[tblName] = dtl;
				}
				else {
					$scope.$apply(function () {
						$scope.data.tableDetails[tblName] = dtl;
					});
				}
			});
		}

		// Sort the tables
		$scope.data.tableNames = [];
		for (var tblName in kahuna.meta.allTables) {
			if ( ! kahuna.meta.allTables.hasOwnProperty(tblName)) {
				continue;
			}
			$scope.data.tableNames.push(tblName);
		}
		$scope.data.tableNames.sort();

		// Watch tables accordion
		$scope.$watch(function watch_apidocs_tables() {
			var openFlags = '';
			for (var i = 0; i < $scope.data.tableNames.length; i++) {
				openFlags += $scope.data.tableAccordion[i] ? 'Y' : 'N';
			}
			return openFlags;
		}, function (idx) {
			var numOpen = 0;
			for (var i = 0; i < idx.length; i++) {
				if (idx.charAt(i) == 'Y') {
					numOpen++;
					showTableDetails(i);
				}
			}
			if ( ! numOpen) {
				console.log("No table is open");
			}
		}, true);

		function showResourceDetails(idx) {
			var res = $scope.data.topResources[idx];
			if ( ! res.accordionOpen) {
				return;
			}
			if ($scope.data.resourceDetails[idx]) {
				return;
			}

			var resIdent = res.ident;
			KahunaData.query('AllResources', {sysfilter: 'equal(ident:' + resIdent + ')'}, function (data) {
				var resource = data[0];
				$scope.data.resourceDetails[resource.ident] = resource;
				$scope.data.debugMsg = resource;
			});
		}

		KahunaData.query('admin:apiversions', {sysfilter: 'equal(project_ident:' + $scope.currentProject.ident + ')', sysorder: '(ident:desc)'}, function (data) {
			$scope.data.newestApiVersion = null;
			if (data.length == 0) {
				return;
			}
			$scope.data.apiVersions = data;
			// kahuna.setInScope($scope, 'apiVersions', data);
			if ($scope.data.apiVersions.length > 0) {
				$scope.data.selectedApiVersion = data[0];
			}
			else {
				$scope.data.selectedApiVersion = null;
			}

			KahunaData.query('AllTopResources', {pagesize: 100,
						sysfilter: 'equal(apiversion_ident:' + $scope.data.selectedApiVersion.ident + ')',
						sysorder: '(name)'}, function (topResourcesData) {
				$scope.data.topResources = topResourcesData;
				var resourceNames = [];
				// for (var tblName in kahuna.meta.allTables) {
				//   if ( ! kahuna.meta.allTables.hasOwnProperty(tblName)) {
				//     continue;
				//   }
				//   resourceNames.push(tblName);
				// }
				for (var i = 0; i < topResourcesData.length; i++) {
					resourceNames.push(topResourcesData[i].name);
				}
				// resourceNames.sort();
				$scope.data.resourceNames = resourceNames;
				if (resourceNames.length > 0) {
					$scope.data.selectedResourceName = resourceNames[0];
				}
				else {
					$scope.data.selectedResourceName = "MyResource";
				}

				// Set a watch for the accordions
				$scope.$watch(function apidocs_watch_AllTopResources() {
					var openFlags = '';
					for (var i = 0; i < topResourcesData.length; i++) {
						openFlags += topResourcesData[i].accordionOpen ? 'Y' : 'N';
					}
					return openFlags;
				}, function (idx) {
					var numOpen = 0;
					for (var i = 0; i < idx.length; i++) {
						if (idx.charAt(i) == 'Y') {
							numOpen++;
							showResourceDetails(i);
						}
					}
					if ( ! numOpen) {
						console.log("No resource is open");
					}
				}, true);
			});
		});

		$scope.getJsonForTable = function getJsonForTable(tbl) {
			if ($scope.data.tableJson[tbl.name]) {
				return;
			}
			kahuna.meta.getTableDetails(tbl.name, function (data) {
				var apiVersionName = "?";
				if ($scope.data.selectedApiVersion) {
					apiVersionName = $scope.data.selectedApiVersion.name;
				}
				var json = "{\n";
				json += "    \"@metadata\": {\n";
				json += "        \"href\": \"" + $scope.data.serverUrl + $scope.currentAccount.url_name + "/" +
						$scope.currentProject.url_name + "/" + apiVersionName + "/" + tbl.name + "\"\n";
				json += "        \"checksum\": \"abcdef0123456789\"\n";
				json += "    }";
				//for (var i = 0; i < )
				json += "\n}\n";
				$scope.data.tableJson[tbl.name] = json;
			});
		};

		KahunaData.query('AllApiKeys', {
					pagesize: 1000,
					sysfilter: 'equal(project_ident:' + $scope.currentProject.ident + ', status:\'A\', origin:null)',
					sysorder: '(name)'},
				function (data) {
			$scope.data.apiKeys = data;

			// Add empty key
			$scope.data.apiKeys.unshift({name: "[no authentication]", apikey: null});

			$scope.data.selectedApiKey = data[0];
			if (data.length > 1) {
				$scope.data.selectedApiKey = data[1];
			}
		});

		$scope.refreshDebug = function refreshDebug() {
			$scope.debugMsg = "$scope.data.resources[1].accordionOpen=" + $scope.data.resources[1].accordionOpen;
		};

		// This gets called when the Swagger iframe has loaded, and when the user clicks
		// the Refresh button.
		$scope.refreshDocs = function(){
			var authParam = "";
			if ($scope.data.selectedApiKey && $scope.data.selectedApiKey.apikey) {
				authParam = "?auth=" + $scope.data.selectedApiKey.apikey + ":1";
			}

			$scope.data.docsUrl = kahuna.serverUrl + kahuna.globals.currentAccount.url_name +
				"/" + $scope.currentProject.url_name +
				"/" + $scope.data.selectedApiVersion.name + "/@docs";
			document.getElementById('docsView').contentWindow.postMessage(
					{url: $scope.data.docsUrl + authParam}, '*');
		};
	}
};

// This gets called when the iframe for Swagger has loaded.
function swaggerIframeLoaded() {
	$('#docsView').scope().refreshDocs();
}
