// Main code for Admin
var kahuna = {

	globals: {
		apiKeyValue: '',
		projects: [],
		currentAccountOptions: [],
		email: '',
		brandFullName: 'CA Technologies', // for stand alone brand mentions or formal product descriptions
		brandPrefixName: 'CA', // expected use: prefixing product names
		productFullName: 'Live API Creator', // the full product name, maybe prefixed
		productSlimName: 'API Creator', // a more informal reference, maybe prefixed
		productDataExplorer: 'Data Explorer',
		productAPIServer: 'API Server',
		productAdminDB: 'Admin Database',
		aceEditorFontSize: "14px"
	},

	cache: {},

	layout: null,

	setBaseUrl: function setBaseUrl(url) {
		if (!url) {
			kahuna.serverUrl = null;
			kahuna.rootUrl = null;
			kahuna.baseUrl = null;
			kahuna.wsUrl = null;
			kahuna.urlEnd = null;
			return;
		}

		// For e.g. WebSockets, we need to know the URL part after the hostname, including port
		var ssIdx = url.indexOf('//');
		var slashIdx = url.indexOf('/', ssIdx + 2);
		if (slashIdx == -1) {
			slashIdx = url.length;
		}
		var colIdx = url.indexOf(':', ssIdx);
		if (colIdx == -1 || colIdx > slashIdx) {
			kahuna.urlEnd = url.substring(slashIdx);
		}
		else {
			kahuna.urlEnd = url.substring(colIdx);
		}

		kahuna.hostUrl = url;
		kahuna.serverUrl = url + '/rest/';
		kahuna.rootUrl = url + '/rest/abl/admin/';
		kahuna.baseUrl = url + '/rest/abl/admin/v2/';
		if (url.substring(0, 5) == 'https') {
			kahuna.wsUrl = 'wss' + url.substring(5) + "/";
		}
		else {
			kahuna.wsUrl = 'ws' + url.substring(4) + "/";
		}
	},

	setApiKey: function setApiKey(apiKey) {
		if (apiKey) {
			kahuna.globals.apiKeyValue = apiKey;
			kahuna.services.kahunaHeaders = {Authorization: "CALiveAPICreator " + apiKey + ":1"};
		}
		else {
			kahuna.globals.apiKeyValue = null;
			kahuna.services.kahunaHeaders = null;
		}
	},

	clearSetting: function clearSetting(name) {
		if (('localStorage' in window) && window['localStorage']) {
			delete localStorage[name];
		}
	},

	saveSetting: function saveSetting(name, value) {
		if (('localStorage' in window) && window['localStorage']) {
			localStorage[name] = JSON.stringify(value);
		}
	},

	readSetting: function readSetting(name, defaultValue) {
		var value = defaultValue;
		if (('localStorage' in window) && window['localStorage']) {
			if (localStorage.hasOwnProperty(name)) {
				var readvalue = localStorage[name];
				if (readvalue) {
					value = JSON.parse(readvalue);
				}
			}
		}
		return value;
	},

	setDataExplorerUrl: function setDataExplorerUrl(rootScope, project) {
		if (!kahuna.globals.currentAccount || angular.isUndefined(kahuna.globals.currentAccount)) {
			console.log('unspecified account, still initializing ...');
			return;
		}
		var accountUrlName = kahuna.globals.currentAccount.url_name;
		var projectUrlFrag = project.url_name;
		var apivers = kahuna.meta.allApiVersions;
		var apiversion = kahuna.util.getLastProperty(apivers);
		apiversion = (apiversion && apiversion.name) || "[none]";
		rootScope.dataExplorerUrl = kahuna.serverUrl + accountUrlName + "/" + projectUrlFrag + "/" + apiversion + "/";
		rootScope.fullDataExplorerUrl = "../DataExplorer/index.html#/?serverName=" + kahuna.serverUrl + accountUrlName + "/" + projectUrlFrag + "/" + apiversion + "/?forceLogin=true";
	},

	getDataExplorerUrl: function getDataExplorerUrl(project) {
		var accountUrlName = kahuna.globals.currentAccount.url_name;
		var projectUrlFrag = project.url_name;
		var apivers = kahuna.meta.allApiVersions;
		var apiversion = kahuna.util.getLastProperty(apivers);
		var dataExplorerUrl, fullDataExplorerUrl;
		apiversion = (apiversion && apiversion.name) || "[none]";
		dataExplorerUrl = kahuna.serverUrl + accountUrlName + "/" + projectUrlFrag + "/" + apiversion + "/";
		fullDataExplorerUrl = "../DataExplorer/index.html#/?serverName=" + kahuna.serverUrl + accountUrlName + "/" + projectUrlFrag + "/" + apiversion + "/?forceLogin=true";
		return dataExplorerUrl;
	},

	// Generalized function to fetch data from the server
	// This is used to get data outside of AngularJS.
	fetchData: function fetchData(url, params, doneFunction, errorFunction) {
		var statusId = kahuna.startFetch();
		$.ajaxSetup({
			contentType: "application/json"
		});

		if (url.substring(0, 4) != 'http') {
			url = kahuna.baseUrl + url;
		}
		jQuery.support.cors = true;

		var defaultErrorFunction = function defaultErrorFunction(jqXHR, textStatus, errorThrown) {
			kahuna.endFetch(statusId);
			if (jqXHR && jqXHR.responseText) {
				errorThrown = jqXHR.responseText;
				if (errorThrown.substring(0, 1) == "{") {
					try {
						errorThrown = JSON.parse(errorThrown).errorMessage;
					}
					catch(e2) {
					}
				}
			}
			console.log("Ajax error:" + errorThrown, url, params);
		};
		errorFunction = errorFunction || defaultErrorFunction;

		$.ajax({
			type: 'GET',
			url: url,
			headers: {"Authorization": "CALiveAPICreator " + kahuna.globals.apiKeyValue + ":1"},
			data: params,
			cache: false,
			dataType: "json",
			async: true,
			timeout: 180000,
			error: errorFunction
		}).done(function fetchData_ajax_done(data) {
			kahuna.endFetch(statusId);
			doneFunction && doneFunction(data);
		}).fail(function fetchData_ajax_fail(xhr, statusText, errorThrown) {
			if (xhr.status == 401 && xhr.statusText == "Unauthorized") {
				kahuna.promptForLogin();
			}
			else {
				console.log('Error in kahuna.fetchData: ' + statusText);
				errorFunction && errorFunction(statusText);
			}
		});
	},

	promptForLogin: _.throttle(function throttled_promptForLogin() {
		if (!$('.modal-backdrop').length) {
			$('#relogin').modal();
		}
		else {
			console.log('re-login prompt already open');
		}
	}, 2000),

	topScope: function topScope() {
		return angular.element($('#MainView')).scope();
	},

	// Put an object in the root AngularJS scope
	putInScope: function putInScope(name, obj) {
		var scope = kahuna.topScope();
		if (scope.$$phase) {
			scope[name] = obj;
		}
		else {
			scope.$apply(function () {
				scope[name] = obj;
			});
		}
	},

	// Remove an object from the root scope
	removeFromScope: function removeFromScope(name) {
		var scope = kahuna.topScope();
		if (scope.$$phase) {
			delete scope[name];
		}
		else {
			scope.$apply(function () {
				delete scope[name];
			});
		}
	},

	// Get a value from the AngularJS scope
	getFromScope: function getFromScope(name) {
		var scope = kahuna.topScope();
		return scope[name];
	},

	// Set a value in the given scope, forcing it in if necessary
	setInScope: function setInScope(scope, name, obj) {
		// applyFunctionInScope(scope, function () { scope[name] = obj; });
		if (scope.$$phase) {
			scope[name] = obj;
		}
		else {
			scope.$apply(function () {
				scope[name] = obj;
			});
		}
	},

	// Set a value in the given scope, forcing it in if necessary
	applyFunctionInScope: function applyFunctionInScope(scope, fun) {
		if (fun) {
			if (scope.$$phase) {
				fun();
			}
			else {
				scope.$apply(fun);
			}
		}
	},

	setLocation: function setLocation(scope, location, url) {
		if (scope.$$phase) {
			location.path(url);
		}
		else {
			scope.$apply(function () {
				location.path(url);
			});
		}
	},

	fetchId: 0,
	fetches: {},

	startFetch: function startFetch(msg) {
		var img = '<img src="images/ajax-loader.gif" width="16" height="11"/>';
		var fullMessage = 'Fetching ' + img;
		if (msg) {
			fullMessage = msg + ' ' + img;
		}
		kahuna.fetchId++;
		kahuna.fetches[kahuna.fetchId] = fullMessage;
		// make sure jquery is available
		$ && $('#statusBarStatus').html(fullMessage);
		return kahuna.fetchId;
	},

	endFetch: function endFetch(id) {
		if ( ! kahuna.fetches[id]) {
			console.log("Error: unknown id in endFetch: " + id);
			return;
		}
		delete kahuna.fetches[id];
		var keys = Object.keys(kahuna.fetches);
		if (keys.length > 0) {
			// make sure jquery is available
			$ && $('#statusBarStatus').html(kahuna.fetches[keys[keys.length - 1]]);
		}
		else {
			// make sure jquery is available
			$ && $('#statusBarStatus').html('OK');
		}
	},

	// Get the value of a parameter from the URL. Returns null if no such parameter.
	getURLParam: function getURLParam(name) {
		var args = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
		for (var i = 0; i < args.length; i++) {
			var paramParts = args[i].split('=');
			if (paramParts.length >= 1 && paramParts[0] == name) {
				return paramParts.length >= 2 ? decodeURIComponent(paramParts[1]) : null;
			}
		}
		return null;
	},

	toggleLeftNav: function toggleLeftNav(state) {
		// Ensure jQuery available -- it might not be during logout
		if (!$) {
			return;
		}

		if (kahuna.layout.state.west.isClosed || state === 'open') {
			localStorage.isSidebarOpen = 'yes';
			kahuna.layout.open('west');
		}
		else {
			localStorage.isSidebarOpen = 'no';
			kahuna.layout.close('west');
		}

		if (state === 'close') {
			kahuna.layout.close('west');
		}
	},

	// Keep track of which JS has already been dynamically loaded
	dynamicallyLoadedFiles: {},

	loadRemoteFile: function loadRemoteFile(filename, filetype) {
		if (kahuna.dynamicallyLoadedFiles[filename]) {
			return;
		}

		var fileref = null;
		if (filetype == "js") {
			fileref = document.createElement('script');
			fileref.setAttribute("type", "text/javascript");
			fileref.setAttribute("src", filename);
		}
		else if (filetype == "css") {
			fileref = document.createElement("link");
			fileref.setAttribute("rel", "stylesheet");
			fileref.setAttribute("type", "text/css");
			fileref.setAttribute("href", filename);
		}
		else {
			throw "Unknown type for loadRemoteFile: " + filetype;
		}
		if (fileref) {
			document.getElementsByTagName("head")[0].appendChild(fileref);
		}
		kahuna.dynamicallyLoadedFiles[filename] = true;
	}
};


// Start AngularJS
kahuna.app = angular.module('admin', ['ngResource',
                                      'ngRoute',
                                      'ngAnimate',
                                      'ngSanitize',
                                      'AdminServices',
                                      'ui.bootstrap',
                                      'ui.utils',
                                      'Storage',
                                      'ngLocale',
                                      'mgo-angular-wizard',
                                      'ui.select'
                                      ],
		function ($routeProvider, $locationProvider, $httpProvider, $compileProvider) {
			$routeProvider
				.when('/', {templateUrl: 'partials/home.html', controller: kahuna.home.HomeCtrl, eventHandle:'HomeCtrl'})
				.when('/account', {templateUrl: 'partials/account.html', controller: kahuna.account.AccountCtrl, eventHandle:'AccountCtrl'})
				.when('/projects', {templateUrl: 'partials/projects.html', controller: kahuna.project.ProjectCtrl, eventHandle:'ProjectCtrl'})
				.when('/projects/:projectId', {templateUrl: 'partials/home.html', controller: kahuna.home.HomeCtrl, eventHandle:'HomeCtrl'})
				.when('/projects/:projectId/databases', {templateUrl: 'partials/database-editor.html', controller: kahuna.database.DatabaseListCtrl, eventHandle:'DatabaseListCtrl'})
				.when('/projects/:projectId/schema', {templateUrl: 'partials/schema.html', controller: kahuna.schema.SchemaCtrl, eventHandle:'SchemaCtrl'})
				.when('/projects/:projectId/rules', {templateUrl: 'partials/rules.html', controller: kahuna.rules.AllRulesCtrl, eventHandle:'AllRulesCtrl'})
				.when('/projects/:projectId/rule/:ruleId/:topicIndex?', {templateUrl: 'partials/rule-main.html', controller: kahuna.rules.RuleEditCtrl, eventHandle:'RuleEditCtrl'})
				.when('/projects/:projectId/new-rule/:topicIndex?', {templateUrl: 'partials/create-rule.html', controller: kahuna.rules.RuleCreateCtrl, eventHandle:'RuleCreateCtrl'})
				.when('/projects/:projectId/resources', {templateUrl: 'partials/resources.html', controller: kahuna.resource.ResourcesCtrl, eventHandle:'ResourcesCtrl'})
				.when('/projects/:projectId/resources/:resourceId', {templateUrl: 'partials/resources.html', controller: kahuna.resource.ResourcesCtrl, eventHandle:'ResourcesCtrl'})
				.when('/projects/:projectId/roles', {templateUrl: 'partials/roles.html', controller: kahuna.role.RoleCtrl, eventHandle:'RoleCtrl'})
				.when('/projects/:projectId/apiversions', {templateUrl: 'partials/apiversions.html', controller: kahuna.apiversions.ApiVersionsCtrl, eventHandle:'ApiVersionsCtrl'})
				.when('/projects/:projectId/auth-tokens', {templateUrl: 'partials/auth-tokens.html', controller: kahuna.authTokens.AuthTokensCtrl, eventHandle:'AuthTokensCtrl'})
				.when('/projects/:projectId/apidocs', {templateUrl: 'partials/apidocs.html', controller: kahuna.apidoc.ApiDocCtrl, eventHandle:'ApiDocCtrl'})
				.when('/projects/:projectId/logs', {templateUrl: 'partials/logs.html', controller: kahuna.log.LogCtrl, eventHandle:'LogCtrl'})
				.when('/projects/:projectId/restlab', {templateUrl: 'partials/restlab.html', controller: kahuna.restlab.RestLabCtrl, eventHandle:'RestLabCtrl'})
				// .when('/projects/:projectId/debug', {templateUrl: 'partials/debug.html', controller: kahuna.debug.DebugCtrl, eventHandle:'DebugCtrl'})
				.when('/projects/:projectId/perf', {templateUrl: 'partials/perf.html', controller: kahuna.perf.PerfCtrl, eventHandle:'PerfCtrl'})
				.when('/projects/:projectId/users', {templateUrl: 'partials/users.html', controller: kahuna.users.UsersCtrl, eventHandle:'UsersCtrl'})
				.when('/projects/:projectId/problems', {templateUrl: 'partials/problems.html', controller: kahuna.problems.ProblemsCtrl, eventHandle:'ProblemsCtrl'})
				.when('/projects/:projectId/custom-endpoints', {templateUrl: 'partials/custom-endpoints.html', controller: kahuna.customEndpoints.CustomEndpointsCtrl, eventHandle:'CustomEndpointsCtrl'})
				.when('/projects/:projectId/events', {templateUrl: 'partials/events.html', controller: kahuna.events.EventCtrl, eventHandle:'EventCtrl'})
				.when('/dataexplorer', {templateUrl: 'partials/dataexplorer.html', controller: kahuna.dataexplorer.DataExplorerCtrl, eventHandle:'DataExplorerCtrl'})
				// .when('/server', {templateUrl: 'partials/server.html', controller: kahuna.server.ServerCtrl, eventHandle:'ServerCtrl'})
				.when('/install', {templateUrl: 'partials/install.html', controller: kahuna.server.InstallCtrl, eventHandle:'InstallCtrl'})
				.otherwise({redirectTo: '/'});

}).run(['$rootScope', '$window', '$http', '$location', 'Storage', '$timeout', function ($rootScope, $window, $http, $location, Storage, $timeout) {
	var runDelay = 3000;
	var isDelayed = true;

	setTimeout(function () { isDelayed = false; }, runDelay);

	$rootScope.isTourPossible = false;
	$rootScope.isNorthwindDerby = false;
	$rootScope.initialized = false;

	$rootScope.$watch('currentPage', function watch_currentPage(current, previous) {
		if (current == previous) {
			return;
		}
		if (current === 'home') {
			kahuna.toggleLeftNav('close');
		}
		else {
			kahuna.toggleLeftNav('open');

			// when routing on the client side, it is possible LD has not run the home controller and everything will break
			$rootScope.appInitialized = true;
		}
	});


	// Detect if there are open dropdown buttons
	$rootScope.$on('$locationChangeStart', function on_$locationChangeStart(event, location, base) {
		if (!isDelayed) {
			Storage.put('PreviousLocation', location.split('#')[1]);
		}

		// bootstrap assigned classes marking open buttons
		var opens = angular.element('.btn-group.open');

		if (opens.length>0) {
			event.preventDefault();
		}
	});

	$rootScope.$on('$routeChangeSuccess', function on_$routeChangeSuccess(event, request) {
		if (request.$$route && request.$$route.eventHandle) {
			// broadcast now active controller scope to any listeners
			$rootScope.$evalAsync(function () {
				if (!$rootScope.appInitialized) {
					// the home controller has been instantiated!, go home
					$location.path('/');
					return;
				}
				// broadcast after the controller has had at least one digest cycle
				$rootScope.$broadcast(request.$$route.eventHandle + 'Init', request.$$route.eventHandle);
				// in case we are listening for every route change rather than a specific one
				$rootScope.$broadcast('EventCtrlInit', request.$$route.eventHandle);
			});
		}
	});

	$rootScope.$on('AutoLogin', function on_AutoLogin(event) {
		var currentProject = Storage.get('CurrentProject');
		if (currentProject) {
			if (angular.isUndefined($rootScope.currentProject)) {
				$rootScope.$evalAsync(function () {
					$rootScope.currentProject = currentProject;
					$rootScope.projectSelected(currentProject, undefined, runDelay);
					$timeout(function () {
						var previousLocation = Storage.get('PreviousLocation');
						if (previousLocation) {
							$location.path(previousLocation);
						}
					}, 1000);
				});
			}
		}
	});
}]);

// Set up the Angular/jQuery bridge
kahuna.app.factory('jqueryUI', function factory_jqueryUI($window, $templateCache, $document, $compile) {
	return {
		wrapper: function wrapper(cssSelector, pluginName, options, templateName, dialogScope) {
			if (templateName) {
				var templateDom = $($templateCache.get(templateName));
				$document.append(templateDom);
				$compile(templateDom)(dialogScope);
			}
			$(cssSelector)[pluginName](options);
		},

		performAction: function performAction(cssSelector, pluginName, action, options) {
			if (options) {
				$(cssSelector)[pluginName](action, options);
			}
			else {
				$(cssSelector)[pluginName](action);
			}
		}
	};
});

// Global directives
kahuna.app.directive('selectOnClick', function directive_selectOnClick() {
	return function (scope, element, attrs) {
		element.click(function () {
			element.select();
		});
	};
});

kahuna.app.directive('optionsDisabled', function directive_optionsDisabled($parse) {
	var disableOptions = function disableOptions(scope, attr, element, data, fnDisableIfTrue) {
		// refresh the disabled options in the select element.
		$("option[value!='?']", element).each(function (i, e) {
			var locals = {};
			locals[attr] = data[i];
			$(this).attr("disabled", fnDisableIfTrue(scope, locals));
		});
	};
	return {
		priority: 0,
		require: 'ngModel',
		link: function link(scope, iElement, iAttrs, ctrl) {
			// parse expression and build array of disabled options
			var expElements = iAttrs.optionsDisabled.match(/^\s*(.+)\s+for\s+(.+)\s+in\s+(.+)?\s*/);
			var attrToWatch = expElements[3];
			var fnDisableIfTrue = $parse(expElements[1]);
			scope.$watch(attrToWatch, function (newValue, oldValue) {
				if (newValue)
					disableOptions(scope, expElements[2], iElement, newValue, fnDisableIfTrue);
			}, true);
			// handle model updates properly
			scope.$watch(iAttrs.ngModel, function (newValue, oldValue) {
				var disOptions = $parse(attrToWatch)(scope);
				if (newValue)
					disableOptions(scope, expElements[2], iElement, disOptions, fnDisableIfTrue);
			});
		}
	};
});

kahuna.app.directive('fileChange', [
	function directive_fileChange() {
		return {
			link: function link(scope, element, attrs) {
				element[0].onchange = function () {
					scope[attrs['fileChange']](element[0]);
				};
			}
		};
	}
]);

kahuna.app.directive('ngBlur', function directive_ngBlur() {
	return function (scope, elem, attrs) {
		elem.bind('blur', function () {
			scope.$apply(attrs.ngBlur);
		});
	};
});

kahuna.app.filter('shorten', function filter_shorten() {
	return function (input, maxlen) {
		input = input || '';
		if (input.length > maxlen) {
			return input.substring(0, maxlen - 2) + "&hellip;";
		}
		return input;
	};
});

// Go to login screen if this is a reload
if ( !kahuna || !kahuna.serverUrl) {
	if (window.location.href.indexOf('#') > 0 && window.location.href.indexOf('apiKey=') == -1) {
		console.log("This seems to be a reload - redirecting to login screen from " + window.location);
		window.location = window.location.href.substring(0, window.location.href.indexOf('#'));
	}
}

// Tour
kahuna.takeTour = function takeTour() {
	if ( ! kahuna.readSetting("apiCreatorTourSeen", false)) {
		var steps = [
			{
				element: "#image-arch",
				title: "Welcome",
				content: "It looks like this is your first time using " + $rootScope.productFullName + "." +
					"We'd like to give you a very quick tour -- this will only take a few seconds."
			},
			{
				element: "#sideBarDiv",
				title: "Navigation",
				content: "You can access all the areas of " + $rootScope.productFullName + " using the navigation bar."
			},
			{
				element: '#projectSelect',
				title: 'Project Selection',
				content: "Use this dropdown to select a project, or to create a new project.",
				placement: 'bottom'
			},
			{
				element: '#connectWizardButton',
				title: 'Connect Wizard',
				content: 'This is the <strong>fastest</strong> way to start',
				placement: 'right'
			},
			{
				title: 'REST Lab',
				element: "#leftBarRestLab",
				content: "You can exercise your API using the REST Lab."
			},
			{
				title: 'Resources',
				element: "#leftBarResources",
				content: "You can shape your API using resources, which are much more flexible that direct access to tables."
			},
			{
				title: 'JavaScript/Reactive',
				element: "#leftBarRules",
				content: "Your API can react to insert, updates and deletes, using reactive expressions or server-side JavaScript."
			},
			{
				title: 'Data Explorer',
				element: "#leftBarDataExplorer",
				content: "You can also view and update your data using the Data Explorer."
			},
			{
				title: 'Tour End',
				element: false,
				content: $rootScope.brandFullName + ' ' + $rootScope.productFullName + " is a rich, exciting environment. We hope you have as much fun " +
					"using it as we had creating it. Thanks for using CA Technologies Live API tools!",
					orphan: true
			}
		];
		for (var i = 0; i < steps.length; i+= 1) {
			if (steps[i].title) {
				steps[i].title += ' (' + (i + 1) + ' of ' + (steps.length) + ')';
			}
		}

		var tour = new Tour({
			name: 'apiCreatorTour',
			backdrop: true,
			storage: false,
			steps: steps
		});

		// Initialize the tour
		tour.init();

		// Start the tour
		tour.start();

		kahuna.saveSetting("apiCreatorTourSeen", true);
	}
};

function focusDescendantTextInput(event) {
	var $target = $(event.target);
	var $input = $target.parent().find('input');
	$input.focus();
}
