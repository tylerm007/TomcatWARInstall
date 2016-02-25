// Namespace
espresso.baseUrl = null;
espresso.projectUrlFragment = 'rest/abl/demo/v1/';
espresso.globals = {
		apiKeyValue: null
	};

espresso.projectUrl = espresso.baseUrl + espresso.projectUrlFragment;
espresso.settings = null;

espresso.services = {
	espressoHeaders: {Authorization: "CALiveAPICreator " + espresso.globals.apiKeyValue + ":1"},

	handleError: function handleError(data, status, url) {
		if (data && data.errorMessage) {
			// TODO handling of the error code would be preferable
			if (-1 != data.errorMessage.indexOf('Auth Token cannot be accepted')) {
				var scope = angular.element('body').scope();
				scope.showLogin().result.then(function () {
					// this fires after the login dialog is successfully closed
					// it's not unreasonable to assume expect a valid Auth Token now exists
					// additional login behaviors here
				});
				return;
			}
			alert(data.errorMessage);
		}
		else {
			alert('Error ' + status);
		}
	}
};

/***performance debugging utilities***/
allTheChildren = {};
var lambda = 0;
eop = false;
tablesDebug = [];
function liveDebug(event, callback) {
	jQuery('body').one(event, function (event, arg1, arg2) {
		console.log(arg1);
		console.log(arg2);
	});
}
equalsEvent = false;
function toggleDebug() {
	equalsEvent = !equalsEvent;
}
/*** END performance debugging utilities***/

function isIpad() {
	return navigator.userAgent.match(/iPad/i) != null;
}
espresso.list = {};

/**
 * @doc overview
 * @name Initilization
 * @description #Application Initialization
 * 0. config()
 *  - defines routes
 * 0. run()
 *  - attempts to authenticate
 *  - DirectLink attempts to update the page
 */
espresso.app = angular.module(
	'espresso.browser',
	['ngResource', 'ngRoute', 'ngSanitize', 'AdminServices', 'ui.bootstrap', 'ngGrid' , 'Storage' , 'Auth', 'Settings', 'Dimensions','ui.mask', 'textAngular']
).config([ '$routeProvider' , '$locationProvider' , '$httpProvider' , '$compileProvider' , '$rootScopeProvider',
	function ($routeProvider, $locationProvider, $httpProvider, $compileProvider, $rootScopeProvider) {
	//$rootScopeProvider.digestTtl(10);
		$routeProvider.
		when('/', {controller: 'espresso.RouteCtrl'}).
		when('/link/:table/', {controller: 'espresso.RouteCtrl',template:null}).
		when('/link/:table/:pk', {controller: 'espresso.RouteCtrl',template:null}).
		otherwise({redirectTo: '/'});
}]).run([
	'$rootScope', 'Storage', 'Auth', 'Settings', 'Tables', '$routeParams', '$location',
	function ($rootScope, Storage, Auth, Settings, Tables, $routeParams, $location){
		if (isIpad()) {
			angular.element('body').css({'padding-bottom':'20px'});
		}
		// if (Auth.hasPreviousAuth()) {
		//   Auth.authenticate(function () {
		//   console.log('Unable to log in automatically');
		//   });
		// }
		$rootScope.alerts = [];
		$rootScope.closeAlert = function (idx) { espresso.util.closeAlert(idx); };

		$rootScope.urlAppend = function urlAppend(url, string) {
			if (url.match(/\?/) && url.match(/\?/).length) {
				//this already has query arguments, append filters:
				url += '&' + string;
			}
			else {
				//no query arguments, inject
				url += "?" + string;
			}
			return url;
		};
}]);


espresso.app.config(['$sceProvider', function ($sceProvider) {
	$sceProvider.enabled(false);
}]);

/////////////////////////////////////////////////////////////////////////////////
// Filters

// Filter out child tabs that are not displayed
espresso.app.filter('filterChildTabs', function () {
	return function (childSettings) {
		if ( ! childSettings)
			return;
		var result = {};
		_.each(childSettings, function (c, cName) {
			if (c.displayed)
				result[cName] = c;
		});
		return result;
	};
});

// Convert an object in an array. This is used to filter ng-repeat when
// the collection is an object, because Angular filters do not work
// with objects, only arrays.
espresso.app.filter('array', function () {
	return function (items) {
		var filtered;  // Trick to avoid Eclipse warning - break it into 2 lines
		filtered = [ ];
		angular.forEach(items, function (item) {
			filtered.push(item);
		});
		return filtered;
	};
});

///////////////////////////
// KEY BINDINGS

//option+a :: open authormode login
Mousetrap.bind(['option+a'], function () {
	var $headerScope = $('.toggle-author').scope();
	$headerScope.toggleAuthoring();
});

//option+x :: open app settings modal
Mousetrap.bind(['option+x'], function () {
	var $headerScope = $('.toggle-author').scope();
	$headerScope.editAppSettings();
});

//['command+s', 'ctrl+s', 'option+s'] :: save
Mousetrap.bind(['command+s', 'ctrl+s', 'option+s'], function (event) {
	var $headerScope = $('.save-action').scope();
	$headerScope.saveAll();
	event.preventDefault();
	return false; //prevents other browser specific events from firing
});

//['command+z', 'ctrl+z', 'option+z'] :: undo
Mousetrap.bind(['command+z', 'ctrl+z', 'option+z'], function (event) {
	var $headerScope = $('.undo-action').scope();
	$headerScope.undoButtonClicked();
	event.preventDefault();
	return false;
});

//['command+option+f+e', 'ctrl+option+f+e'] :: form window edit row columns
Mousetrap.bind(['command+option+f+e', 'ctrl+option+f+e'], function (event) {
	var $formScope = $('.formEditColumnSelection').scope();
	if ($formScope.$root.root.authorMode) {
		$formScope.editColumnSelection('scalar');
		event.preventDefault();
	}
});
