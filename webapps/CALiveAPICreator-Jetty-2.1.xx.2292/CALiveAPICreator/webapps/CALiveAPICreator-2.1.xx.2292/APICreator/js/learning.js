// uses http://bootstraptour.com/
// width: http://stackoverflow.com/questions/19448902/changing-the-width-of-bootstrap-popover

kahuna.learning = {

	LearningCtrl: function ($scope, $rootScope, $routeParams, $location, $timeout, KahunaData, $http, Storage) {
		$rootScope.currentPage = 'learning';
		$rootScope.currentPageHelp = 'docs/logic-designer/security/authentication#TOC-Authentication-Provider';

		//////////////////////////////////////////////////////////////////////////////////////////
		// Templates

		$scope.stepTemplateStart = "<div class='popover tour'>" +
			"<div title='Proceed' class='continue-step btn btn-xs btn-blank' data-role='next'><i class='fa fa-angle-right'></i></div>" +
			"<div title='Close' class='end-tour btn btn-xs btn-blank' data-role='end'><i class='fa fa-times'></i></div>" +
			"<div class='arrow'></div>" +
			"<h3 class='popover-title'></h3>" +
			"<div class='popover-content'></div>" +
			"<div class='popover-navigation'>" +
				"<button class='margin-15 btn btn-primary' data-role='next' id='tour-next-button'>Next &#9654;</button>" +
			"</div>" +
		"</div>";
		$scope.stepTemplatePlacehold = "<div class='popover tour'>" +
		"<div title='Proceed' class='continue-step btn btn-xs btn-blank' data-role='next'><i class='fa fa-angle-right'></i></div>" +
		"<div title='Close' class='end-tour btn btn-xs btn-blank' data-role='end'><i class='fa fa-times'></i></div>" +
			"<div class='arrow'></div>" +
			"<h3 class='popover-title'></h3>" +
			"<div class='popover-content'></div>" +
		"</div>";
		$scope.stepTemplateInitial = "<div class='popover tour'>" +
		"<div title='Proceed' class='continue-step btn btn-xs btn-blank' data-role='next'><i class='fa fa-angle-right'></i></div>" +
		"<div title='Close' class='end-tour btn btn-xs btn-blank' data-role='end'><i class='fa fa-times'></i></div>" +
			"<div class='arrow'></div>" +
			"<h3 class='popover-title'></h3>" +
			"<div class='popover-content'></div>" +
			"<div class='popover-navigation'>" +
				"<button class='btn btn-primary' data-role='next' id='tour-next-button'>Next &#9654;</button>" +
				"<span class='pull-right' style='font-size: 7pt; color: #C0C0C0; margin: 10px; cursor: pointer;' " +
					"onclick=\"angular.element(document.getElementById('learningDiv')).scope().skipLearningGoals()\">I've already done this tour</span>" +
			"</div>" +
		"</div>";
		$scope.stepTemplateEnd = "<div class='popover tour'>" +
		"<div title='Proceed' class='continue-step btn btn-xs btn-blank' data-role='next'><i class='fa fa-angle-right'></i></div>" +
		"<div title='Close' class='end-tour btn btn-xs btn-blank' data-role='end'><i class='fa fa-times'></i></div>" +
			"<div class='arrow'></div>" +
			"<h3 class='popover-title'></h3>" +
			"<div class='popover-content'></div>" +
			"<div class='popover-navigation'>" +
				"<button class='margin-15 btn btn-primary' data-role='end'>Done</button>" +
			"</div>" +
		"</div>";
		$scope.stepTemplateSingle = "<div class='popover tour'>" +
		"<div title='Proceed' class='continue-step btn btn-xs btn-blank' data-role='next'><i class='fa fa-angle-right'></i></div>" +
		"<div title='Close' class='end-tour btn btn-xs btn-blank' data-role='end'><i class='fa fa-times'></i></div>" +
			"<div class='arrow'></div>" +
			"<h3 class='popover-title'></h3>" +
			"<div class='popover-content'></div>" +
			"<div class='popover-navigation'>" +
				"<button class='margin-15 btn btn-primary' data-role='end'>Done</button>" +
			"</div>" +
		"</div>";

		// run before a tour, tours may start if the return value evaluates to true
		$scope.preTour = function preTour(params) {
			$('.tour-step-background').remove();
			if ($(".tour-backdrop").length) {
				return false;
			}
			return true;
		};

		// events fired right after each step is shown
		$scope.onShown = function onShown() {
			$('.popover.tour').draggable({handle:'.popover-title'});
		};

		//////////////////////////////////////////////////////////////////////////////////////////
		// Learning goal 1 - connect to the DB

		$scope.startTourConnect = function startTourConnect() {
			var isTourPossible = $rootScope.isTourPossible;
			if (window && window.event && window.event.type == 'click') {
				if ($(window.event.target).hasClass('learn-step')) {
					console.log('learnstep');
					isTourPossible = true;
				}
			}
			var isTourPossible = $('.learn-step')
			if ($rootScope.currentUserName == 'sa' || !isTourPossible || $rootScope.isWelcomeModalOpen) {
				return;
			}
			if ($('.tour').length) {
				return;
			}
			if (!$scope.preTour({})) {
				return;
			}
			$location.path('/');
			var steps = [
				{
					title: "delay",
					element: "#home-project-list",
					template: "<div style=\"display: hidden\"></div>",
					duration: 2000,
					onShow: function () {
					}
				},
				{
					element: "#home-project-list",
					title: "API Creation",
					placement: 'bottom',
					content: "<span class='tour-bold'><b>10X faster</b></span> RESTful API creation.<span class='tour-bold'><b> Declaratively...</b></span><br/><br/><ul>" +
						"<li><span class='tour-bold'><strong>Connect </strong></span> to mobile apps, other systems -<br/>RESTful API<br/><br/></li>" +
						"<li><span class='tour-bold'><strong>Integrate </strong></span> Multiple Data Sources and Tables -<br/> Point and Click<br/><br/></li>" +
						"<li><span class='tour-bold'><strong>Execute </strong></span>Business Policy for Logic and Security -<br/> Rules and JavaScript<br/><br/></li>" +
						// "<ul><li><span class='tour-bold'><strong>Integration:  </strong></span>resources can combine data from multiple sources (SQL, Mongo and RESTful), and coordinate updates between them.<br/><br/></li>" +
						"</ul>",
					reflex: true,
					template: $scope.stepTemplateInitial,
					onShow: function (tour) {
					},
					onNext: function (tour) {
						$rootScope.connectWizard();
					}
				},
				{
					title: "delay",
					element: "#projectSelect",
					template: "<div style=\"display: hidden\"></div>",
					onShow: function (tour) {
					},
					duration: 1500
				},
				{
					element: "#ConnectToNorthwindButton",
					title: "Connect to database",
					content: $rootScope.productSlimName + "'s RESTful services are based on databases, <br/>" +
						"so the first thing to do is to connect to a database.<br/><br/>" +
						"To illustrate, let's connect to the sample Northwind database.  " +
						"You can of course use your own database(s) later.<br/><br/>" +
						$rootScope.productFullName + "  supports these data sources, including MongoDB,<br/>" +
						"in the cloud or on premise.",
					reflex: true,
					backdrop: false,
					orphan: true,
					template: $scope.stepTemplateEnd,
					onShow: function (tour) {
					},
					onHidden: function (tour) {
						setTimeout(function () {
							$scope.completedConnect = true;
							//$('#dbConnectContinue').click();
							$scope.completeLearningGoal('connect');

							$scope.tearDownTour();
						}, 1750);
					}
				}
			];

			$scope.tourConnect = new Tour({
				name: 'learnConnect',
				backdrop: true,
				storage: false,
				steps: steps,
				onShown: $scope.onShown,
				onEnd: function (t) {
					// This is some sort of bug somewhere -- we need to clear this data up
					// otherwise the tour won't restart.
					$('#projectSelect').data('bs.popover', null);
					$scope.tearDownTour();
					$rootScope.isConnectTourFinished = true;
				}
			});

			// Initialize the tour
			$scope.tourConnect.init();

			// Start the tour
			$scope.tourConnect.start();

			$timeout(function () {
				$(".tour-backdrop").click(function (evt) {
					var ctrl = document.elementFromPoint(evt.pageX, evt.pageY);
					if (ctrl.tagName == "BUTTON" && ctrl.innerText.startsWith('Next'))
						return;
					evt.stopPropagation();
				});
			}, 500);
		};

		$rootScope.$on('ConnectTour', function () {
			$scope.startTourConnect();
		});

		// fired onEnd of tours
		$scope.tearDownTour = function tearDownTour() {
			$('.tour-step-background').remove();
			$rootScope.$broadcast('refreshTourGoalStatus');
		};

		// fired onStart of tours
		$scope.setupTour = function setupTour() {
			$('.tour-step-background').remove();
		};

		$rootScope.$on('dbWizardFinished', function () {
			console.log('DB wizard finished - start learning step 2?');
			if (localStorage[lsPrefix + 'lb']) {
				return;
			}
			$scope.startTourRestLab();
		});

		$rootScope.$on('ResourcesCtrlInit', function (event, scope) {
			$timeout(function () {
				if (localStorage['eslo-ld-learn-resource']) {
					return;
				}
				$scope.startTourResources();
			}, 2250);
		});

		$rootScope.$on('DataExplorerCtrlInit', function (event, scope) {
			if (localStorage['eslo-ld-learn-lb']) {
				return;
			}
			$scope.startTourLB();
		});

		$rootScope.$on('RestLabCtrlInit', function (event, scope) {
			if (localStorage['eslo-ld-learn-restlab']) {
				return;
			}
			$rootScope.$evalAsync(function () {
				$scope.startTourRestLab();
			});
		});

		$rootScope.$on('AllRulesCtrlInit', function (event, scope) {
			if (localStorage['eslo-ld-learn-logic']) {
				return;
			}
			$scope.startTourLogic();
		});

		$rootScope.$on('RoleCtrlInit', function (event, scope) {
			if (localStorage['eslo-ld-learn-security']) {
				return;
			}
			$scope.startTourSecurity();
		});
		//////////////////////////////////////////////////////////////////////////////////////////
		// REST Lab

		$scope.startTourRestLab = function startTourRestLab() {
			if ($('.tour').length) { return; }
			var elClass = '.leftBarRestLab';
			if ($rootScope.params.evalMode) {
				elClass += '-short';
			}
			var steps = [
				{
					element: elClass,
					title: "Default API Creation",
					placement: 'right',
					content: "Database connection has created a <span class='tour-bold'><b>Default REST API</b></span><ul>" +
							"<li><span style='font-family:courier;'>Put, Post, Delete, and Get</span></li>" +
							"<li>For each Table, View, Stored Procedure </li>" +
							"<li>Swagger  support</li></ul>" +
						"<span class='tour-bold'><b>Architectural pattern automation</b></span>  for<ul>" +
							"<li>Filtering, sort, etc.</li>" +
							"<li>Pagination, Optimistic Locking</li>" +
							"<li>Logic and Security - <span class='tour-bold'><b>Rules</b></span> and <span style='font-family:courier;'>JavaScript</span></li></ul></br/>" +
						"It's ready now - test it here in the <span class='tour-bold'><b>REST Lab</b></span>.",
					reflex: false,
					template: $scope.stepTemplateEnd,
					onNext: function onNext(tour) {
					},
					onHidden: function onHidden() {
						// just in case the backdrop is still there:
						$('.tour-backdrop').hide();
						$scope.completeLearningGoal('restlab');
					}
				}
			];
/*
				{
					title: "delay",
					element: elClass,
					template: "<div style=\"display: hidden\"></div>",
					duration: 300
				},
				{
					element: "#apiTypeControl",
					title: "Custom Resources too",
					placement: 'right',
					content: "Default 'flat' relational resources are great, <br>" +
					"but integration and mobile apps need a richer API:<ul>" +
					"<li>Integrate <span class='tour-bold'><b>multiple databases</b></span></li>" +
					"<li><span class='tour-bold'><b>Choose and alias attributes</b></span></li>" +
					"<li>Create <span class='tour-bold'><b>nested document </b></span> updatable JSON responses, like this:</li></ul>" +
					"<span style='font-family:courier;display:block;padding-left:56px;'>" +
					"{<br/>" +
					"&nbsp;\"ID\": \"ALFKI\",<br/>" +
					"&nbsp;\"Balance\": 0,<br/>" +
					"&nbsp;\"Orders\": [<br/>" +
					"&nbsp;&nbsp;&nbsp;&nbsp;\"OrderID\": 10643,<br/>" +
					"&nbsp;&nbsp;&nbsp;&nbsp;\"Total\": 814.5,<br/>" +
					"&nbsp;&nbsp;&nbsp;&nbsp;\"Items\": [<br/>" +
					"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\"ProductID\": 9004,<br/>" +
					"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\"Quantity\": 2,<br/>" +
					"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;etc&hellip;<br/>" +
					"}<br/><br/>" +
					" </span>" +
					"You can build resources using a simple point-and-click procedure (on the \"Custom Resources\" page).<br/><br/>",
					reflex: false,
					template: $scope.stepTemplateEnd,
					onHidden: function (tour) {
						kahuna.applyFunctionInScope($scope, function () {
							$location.path('/projects/' + $rootScope.currentProject.ident + '/restlab');
						});
						kahuna.applyFunctionInScope($rootScope, function () {
							// $rootScope.navMaskEnabled = true;
							// $rootScope.navMaskStep = 'restlab';
							$scope.completeLearningGoal('restlab');
							// $scope.startTourLogic();
						});
					}
				}
			];
*/

			var tour = new Tour({
				name: 'learnConnectRestLab',
				backdrop: true,
				storage: false,
				steps: steps,
				onShown: $scope.onShown,
				onHide: function () {
					// just in case the backdrop is still there:
					$('.tour-backdrop').hide();
					$scope.tearDownTour();
				},
				onStart: function () {
					$scope.setupTour();
				},
				onEnd: function (t) {
					// This is some sort of bug somewhere -- we need to clear this data up
					// otherwise the tour won't restart.
					$('.leftBarRestLab').data('bs.popover', null);
					$scope.tearDownTour();
				}
			});

			$scope.$evalAsync(function () {
				// Initialize the tour
				tour.init();

				// Start the tour
				tour.start();
			});
		};

		//////////////////////////////////////////////////////////////////////////////////////////
		// Learning goal - resources
		$scope.startTourResources = function startTourResources() {
			if ($('.tour').length) { console.log('tour open'); return; }
			if (!$scope.preTour({})) {
				console.log('pre-tour');
				return;
			}
			var elClass = '.leftBarResources';
			if ($rootScope.params.evalMode) {
				elClass += '-short';
			}

			$location.path('/projects/' + $rootScope.currentProject.ident + ' /resources');
			var steps = [
/*
				{
					element: "#topResourcesList",
					title: "API – Custom Resources: creating resources",
					placement: 'right',
					content: "Each resource is an API endpoint.<br/><br/>" +
							"They are described to the far right <i class='fa fa-arrow-right'></i>.<br/><br/>" +
							"Click the \"New Resource\"' button to create your own, exposing your data in the way you want.",
					reflex: false,
					template: $scope.stepTemplateStart,
					onNext: function (tour) {
					}
				},
				{
					title: "delay",
					element: "#connectMenuItem",
					template: "<div style=\"display: hidden\"></div>",
					duration: 300
				},
*/
				{
					element: "#resourceTreeDiv",
					title: "API – Custom Resources: creating new Resources",
					placement: 'right',
					content: "Default 'flat' relational resources are great, <br>" +
					"but integration and mobile apps need a richer API:<ul>" +
					"<li>Integrate <span class='tour-bold'><b>multiple databases</b></span></li>" +
					"<li><span class='tour-bold'><b>Choose and alias attributes</b></span></li>" +
					"<li>Create <span class='tour-bold'><b>nested document </b></span> updatable JSON responses, like this:</li></ul>" +
					"<span style='font-family:courier;display:block;padding-left:56px;'>" +
					"{<br/>" +
					"&nbsp;\"ID\": \"ALFKI\",<br/>" +
					"&nbsp;\"Balance\": 0,<br/>" +
					"&nbsp;\"Orders\": [<br/>" +
					"&nbsp;&nbsp;&nbsp;&nbsp;\"OrderID\": 10643,<br/>" +
					"&nbsp;&nbsp;&nbsp;&nbsp;\"Total\": 814.5,<br/>" +
					"&nbsp;&nbsp;&nbsp;&nbsp;\"Items\": [<br/>" +
					"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\"ProductID\": 9004,<br/>" +
					"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;\"Quantity\": 2,<br/>" +
					"&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;etc&hellip;<br/>" +
					"}<br/><br/></span>" +
					"Create as shown far right <i class='fa fa-arrow-right'/>.<br/><br/>" +
					"Test with the REST Lab (just click \"Test.\")",
					reflex: false,
					template: $scope.stepTemplateEnd,
					onNext: function (tour) {
					},
					onHidden: function () {
						$scope.completeLearningGoal('resource');
					}
				}
			];

			var tour = new Tour({
				name: 'learnConnectResources',
				backdrop: true,
				storage: false,
				steps: steps,
				onShown: $scope.onShown,
				onEnd: function (t) {
					// This is some sort of bug somewhere -- we need to clear this data up
					// otherwise the tour won't restart.
					$(elClass).data('bs.popover', null);
					$scope.tearDownTour();
				}
			});

			// wait for DOM
			$timeout(function () {
				// Initialize the tour
				tour.init();

				// Start the tour
				tour.start();
			}, 250);
		};

		$rootScope.$on('DatabaseListCtrlInit', function (event, scope) {
			if (localStorage['eslo-ld-learn-integrate']) {
				return;
			}
			$scope.startTourIntegrate();
		});

		//////////////////////////////////////////////////////////////////////////////////////////
		// DB integrate tour segment
		$scope.startTourIntegrate = function () {
			if ($('.tour').length) { return; }
			if (!$scope.preTour({})) {
				return;
			}
			$location.path('/projects/' + $rootScope.currentProject.ident + '/databases');
			var elClass = '.leftBarIntegrate';
			if ($rootScope.params.evalMode) {
				elClass += '-short';
			}
			var steps = [
				{
					element: elClass,
					title: "Integrate Multiple Data Sources",
					placement: 'right',
					content: "Add new database(s), and <span class='tour-bold'><b>Relationships</b></span> between them,<br/>" +
						"for use in Resources, Rules and the Data Explorer" +
						"<ul><li>Explore the <b>MDBDemoCustomers</b> Resource <br/>in the Demo API.</li></ul>" +
						"Synchronize databases with Resources, <br/>" +
						"which project / alias data to match external formats.<br/>" +
						"<ul><li>Learn more about integration <a href='http://ca-doc.espressologic.com/docs/logic-designer/create/rest-resources/rest-apis/data-integration' target='_blank'> here.</a></li></ul>",
					reflex: false,
					template: $scope.stepTemplateEnd,
					onNext: function onNext(tour) {
					},
					onHidden: function onHidden() {
						$scope.completeLearningGoal('integrate');
					}
				}
			];

			var tour = new Tour({
				name: 'learnMore',
				backdrop: true,
				storage: false,
				onShown: $scope.onShown,
				onEnd: function () {
					$scope.tearDownTour();
				},
				steps: steps
			});

			// Initialize the tour
			tour.init();

			// Start the tour
			tour.start();
		};

		//////////////////////////////////////////////////////////////////////////////////////////
		// Learning goal - More goals

		$scope.startTourMore = function () {
			if ($('.tour').length) { return; }
			if (!$scope.preTour({})) {
				return;
			}
			var steps = [
				{
					element: "#learningGoalsTitle",
					title: "Basic Tour Complete",
					placement: 'left',
					content: "You've seen how to create an API by connecting, and<ol>" +
							"<li>Test it in the RESTlab</li>" +
							"<li>Extend it with Custom <span class='tour-bold'><b>Resources</b></span>" +
							"<li>Declare <span class='tour-bold'><b>Business Logic</b></span> for database integrity</li></ol>" +
						"May we suggest you try the remaining Tour elements at your convenience?<br/>" +
						"<ul><li>Click the red buttons to see these additional Tours.</li></ul>",
					reflex: false,
					template: $scope.stepTemplateEnd,
					onNext: function (tour) {
					}
				}
			];

			var tour = new Tour({
				name: 'learnMore',
				backdrop: true,
				storage: false,
				onShown: $scope.onShown,
				onEnd: function () {
					$scope.tearDownTour();
				},
				steps: steps
			});

			// Initialize the tour
			tour.init();

			// Start the tour
			tour.start();
		};

		//////////////////////////////////////////////////////////////////////////////////////////
		// Learning goal - Rules

		$scope.startTourLogic = function () {
			if ($('.tour').length) { return; }
			if (!$scope.preTour({})) {
				return;
			}
			$location.path('projects/' + $rootScope.currentProject.ident + '/rules');
			var steps = [
				{
					element: "#leftBarRules",
					title: "Rules",
					placement: 'right',
					content: "An API should manage the integrity of your data.<br/><br/>" +
						"<img  src='images/update-logic.png' border='0' width='300' /><br/><br/>" +
						"So, " + $rootScope.productFullName + " enables you to define " +
							"<a target='_blank' href='http://ca-doc.espressologic.com/docs/tutorial#TOC-Integration-Example'>" +
							"<span class=''><b>spreadsheet-like Rules</b></span></a>, enforced on update requests, " +
						" <span class='tour-bold'><b>40X</b></span> more concise than procedural code (described far right <i class='fa fa-arrow-right'/>).<br/><br/>" +
						"Business logic can be provided in <span class='tour-bold'><b>Javascript</b></span>, <br/>and invoke loadable libraries.<br/>",
					reflex: false,
					orphan: true,
					template: $scope.stepTemplateEnd
				}
			];

			var tour = new Tour({
				name: 'learnConnectDataExplorer',
				backdrop: true,
				storage: false,
				onShown: $scope.onShown,
				steps: steps,
				onEnd: function (t) {
					// This is some sort of bug somewhere -- we need to clear this data up
					// otherwise the tour won't restart.
					$scope.completeLearningGoal('logic');
					$('#leftBarRules').data('bs.popover', null);
					$scope.tearDownTour();
				},
				debug: true
			});

			// Initialize the tour
			tour.init();

			// Start the tour
			tour.start();

		};

		//////////////////////////////////////////////////////////////////////////////////////////
		// Learning goal - Security

		$scope.startTourSecurity = function () {
			if ($('.tour').length) { return; }
			if (!$scope.preTour({})) {
				return;
			}
			var elClass = '.leftBarRoles';
			if ($rootScope.params.evalMode) {
				elClass += '-short';
			}
			$("#leftBarRoles")[0].scrollIntoView();
			var steps = [
				{
					element: elClass,
					title: "Security",
					placement: 'right',
					content: "An API should manage the security of your data.<br/><br/>" +
						"This defines who can do what, to what data.<br/><br/>" +
						$rootScope.productFullName + " uses roles to control" +
						"<ul><li>End Point Access<li>Row and Column level access</ul>" +
						"Create users and roles to define access levels.",
					reflex: false,
					template: $scope.stepTemplateStart,
					onNext: function (tour) {
						kahuna.applyFunctionInScope($scope, function () {
							$location.path('/projects/1000/roles');
						});
					}
				},
				{
					title: "delay",
					element: elClass,
					template: "<div style=\"display: hidden\"></div>",
					duration: 1000
				},
				{
					element: "#rolesListDiv",
					title: "Roles",
					placement: 'right',
					content: "Each role has a set of <span class='tour-bold'><b>Permissions</b></span>, defining what users with that role can and cannot do.",
					reflex: false,
					template: $scope.stepTemplateEnd,
					onHidden: function (tour) {
						$("#leftBarUsers")[0].scrollIntoView();
						$scope.showLearningGoals();
						$scope.completeLearningGoal('security');
					}
				}
//				{
//					title: "delay",
//					element: "#connectMenuItem",
//					template: "<div style=\"display: hidden\"></div>",
//					duration: 300
//				},
//				{
//					element: "#leftBarUsers",
//					title: "Users",
//					placement: 'right',
//					content: "You can then assign roles to users, and combine roles for precise permission management.<br/><br/>" +
//					"You can define roles here, or use an Authentication Provider to use your Enteprise security system.",
//					reflex: false,
//					template: $scope.stepTemplateEnd,
//					onHidden: function (tour) {
//						$scope.showLearningGoals();
//						$scope.completeLearningGoal('security');
//					}
//				}
			];

			var tour = new Tour({
				name: 'learnConnectResources',
				backdrop: true,
				storage: false,
				steps: steps,
				onShown: $scope.onShown,
				onEnd: function (t) {
					// This is some sort of bug somewhere -- we need to clear this data up
					// otherwise the tour won't restart.
					$(elClass).data('bs.popover', null);
					$scope.tearDownTour();
				}
			});

			// Initialize the tour
			tour.init();

			// Start the tour
			tour.start();

		};

		//////////////////////////////////////////////////////////////////////////////////////////
		// Data Explorer

		$scope.startTourLB = function startTourLB() {
			if ($('.tour').length) { return; }
			if (!$scope.preTour({})) {
				return;
			}
			var elClass = '.leftBarDataExplorer';
			if ($rootScope.params.evalMode) {
				elClass += '-short';
			}
			$location.path('/dataexplorer');
			var steps = [
				{
					element: elClass,
					title: "Data Explorer",
					placement: 'right',
					content: "The Data Explorer gives you complete read/write access to your data without <em>any</em> coding required.<br/><br/>" +
						"<ul>" +
						"  <li>It uses the REST API, and therefore:" +
						"  <li>Security is enforced" +
						"  <li>Rules are enforced" +
						"  <li>and it's configurable" +
						"<ul>",
					reflex: false,
					template: $scope.stepTemplateEnd,
					onHidden: function onHidden(tour) {
						$location.path('/dataexplorer');
						$scope.completeLearningGoal('lb');
						kahuna.layout.close('east');
					}
				}
			];

			var tour = new Tour({
				name: 'learnConnectDataExplorer',
				backdrop: true,
				storage: false,
				onShown: $scope.onShown,
				steps: steps,
				onStart: function onStart() {
					$scope.completeLearningGoal('lb');
					$scope.setupTour();
					$scope.tearDownTour();
				},
				onEnd: function (t) {
					$scope.tearDownTour();
				}
			});

			// Initialize the tour
			tour.init();

			// Start the tour
			tour.start();

		};

		//////////////////////////////////////////////////////////////////////////////////////////
		// Learning goal - Wrap up

		$rootScope.$on('EventCtrlInit', function (event, handle, scope) {
			// this might interupt the LB tour, ignore that controller
			if (handle === 'DataExplorerCtrl') {
				return;
			}
			var incomplete = false;
			var goals = _.pluck($scope.data.goals, 'name');
			angular.forEach(goals, function (goal, index) {
				if (!localStorage['eslo-ld-learn-' + goal]) {
					incomplete = true;
				}
			});

			// if complete, show wrap-up dialog
			if (!incomplete && !localStorage['eslo-ld-learn-complete']) {
				$scope.startTourWrapUp();
				console.log('wrap up');
				localStorage['eslo-ld-learn-complete'] = true;
			}
		});

		$scope.startTourWrapUp = function startTourWrapUp() {
			if ($('.tour').length) {
				return;
			}
			if (!$scope.preTour({})) {
				return;
			}
			var steps = [
				{
					orphan: true,
					title: "Thank you for completing the Tour!",
					content: "<div class='form-group'>\n" +
						"Thank you for completing the CA Live API Creator Tour!" +
						"</div>\n",
					reflex: false,
					template: $scope.stepTemplateEnd,
					onHide: function onHide(tour) {
					}
				}
			];

			var tour = new Tour({
				name: 'learnWrapUp',
				backdrop: true,
				storage: false,
				onShown: $scope.onShown,
				steps: steps,
				onEnd: function (t) {
					$scope.tearDownTour();
				}
			});

			// Initialize the tour
			tour.init();

			// Start the tour
			tour.start();
		};

		//////////////////////////////////////////////////////////////////////////////////////
		// The tour

		$scope.data = {
			goals: [
				{
					index: '1',
					name: "connect",
					title: 'Create API - Connect to database',
					runTour: $scope.startTourConnect
				},
				{
					index: '2',
					name: "restlab",
					title: 'Use your API - REST Lab',
					runTour: $scope.startTourRestLab
				},
				{
					index: '3',
					name: "resource",
					title: 'Custom Resources',
					runTour: $scope.startTourResources
				},
				{
					index: '4',
					name: "logic",
					title: 'Execute Integrity - Reactive Logic / JavaScript',
					runTour: $scope.startTourLogic
				},
				{
					index: '5',
					name: "security",
					title: 'Execute Security',
					runTour: $scope.startTourSecurity
				},
				{
					index: '6',
					name: "integrate",
					title: 'Add Data Sources',
					runTour: $scope.startTourIntegrate
				},
				{
					index: '7',
					name: "lb",
					title: 'Browse and edit data - Data Explorer',
					runTour: $scope.startTourLB
				}
			]
		};

		var lsPrefix = "eslo-ld-learn-";
		for (var i = 0; i < $scope.data.goals.length; i++) {
			$scope.data.goals[i].cls = "learn-step-todo";
			$scope.data.goals[i].markerCls = "learn-step-marker-todo fa-graduation-cap";
			if (localStorage[lsPrefix + $scope.data.goals[i].name]) {
				$scope.data.goals[i].cls = "learn-step-done";
				$scope.data.goals[i].markerCls = "learn-step-marker-done fa-check";
			}
		}

		$scope.doLearningGoal = function doLearningGoal(name, evt) {
			console.log(name);
			if (evt.shiftKey) {
				evt.stopPropagation();
				var theGoal = _.find($scope.data.goals, function (g) { return g.name == name; }
				);
				if (localStorage[lsPrefix + name]) {
					localStorage.removeItem(lsPrefix + name);
					theGoal.cls = "learn-step-todo";
					theGoal.markerCls = "learn-step-marker-todo fa-graduation-cap";
					$scope.allGoalsCompleted = false;
					localStorage.removeItem(lsPrefix + 'complete');
				}
				else {
					$scope.completeLearningGoal(name);
				}

				return;
			}
			var theGoal = _.find($scope.data.goals, function (goal) { return goal.name == name; });
			if (theGoal.runTour)
				theGoal.runTour();
		};

		$scope.completeLearningGoal = function completeLearningGoal(name) {
			var theGoal = _.find($scope.data.goals, function (goal) { return goal.name == name; });
			kahuna.applyFunctionInScope($scope, function () {
				theGoal.cls = "learn-step-done";
				theGoal.markerCls = "learn-step-marker-done fa-check";
			});
			localStorage[lsPrefix + name] = true;
			$scope.checkAllGoalsCompleted();
		};

		$scope.checkAllGoalsCompleted = function checkAllGoalsCompleted() {
			var oldComplete = localStorage[lsPrefix + 'complete'];
			$scope.allGoalsCompleted = true;
			// See if we've completed all goals
			_.each($scope.data.goals, function (goal) {
				if ( ! localStorage[lsPrefix + goal.name])
					$scope.allGoalsCompleted = false;
			});
			if ($scope.allGoalsCompleted && !oldComplete) {
				localStorage[lsPrefix + 'complete'] = true;
				$scope.allGoalsCompleted = false;
				$timeout(function () {
					$scope.allGoalsCompleted = true;
				}, 10000);
				$timeout(function () {
					$scope.startTourWrapUp();
				}, 150);
			}
		};

		$scope.resetLearningGoals = function () {
			_.each($scope.data.goals, function (goal) {
				if (goal.name == "connect") {
					// Do not reset Connect -- user wouldn't want to do it twice
					return;
				}
				localStorage.removeItem(lsPrefix + goal.name);
				goal.cls = "learn-step-todo";
				goal.markerCls = "learn-step-marker-todo fa-graduation-cap";
			});
			$scope.allGoalsCompleted = false;
			localStorage.removeItem(lsPrefix + 'complete');
			localStorage.removeItem('introSeen');
		};

		$scope.skipLearningGoals = function skipLearningGoals() {
			_.each($scope.data.goals, function (goal) {
				localStorage[lsPrefix + goal.name] = true;
				goal.cls = "learn-step-done";
				goal.markerCls = "learn-step-marker-done fa-check";
			});
			$scope.allGoalsCompleted = true;
			localStorage[lsPrefix + 'complete'] = true;
			localStorage['introSeen'] = true;
			if ($scope.tourConnect)
				$scope.tourConnect.end();

			$rootScope.isConnectTourFinished = true;
			$rootScope.$digest();
		};

		// After a short while, check whether we need to start the tour
		$rootScope.$watch('currentServer', $rootScope.resumeTour);

		$rootScope.resumeTour = function resumeTour () {
			console.log('default tour notice');
			return;
			if ( ! $rootScope.currentServer || $rootScope.isWelcomeModalOpen) {
				return;
			}
			$timeout(function () {
				if ( ! localStorage[lsPrefix + 'connect']) {
					console.log('Starting guided tour...');
					// $rootScope.connectWizard();
					$scope.startTourConnect();
				}
			}, 2500);
			$scope.checkAllGoalsCompleted();
		};

		$rootScope.$on('resumeTour', $rootScope.resumeTour);

		// When user is done exploring something and clicks Continue in left nav pane
		$rootScope.$watch('navMaskEnabled', function (oldValue) {
			if ($rootScope.navMaskEnabled)
				return;
			if ($rootScope.navMaskStep == 'restlab')
				$scope.startTourLogic();
		});

		// If user shift-clicks the Learning Goals title, reset steps
		$scope.learningTitleClicked = function learningTitleClicked(evt) {
			if (evt.shiftKey)
				$scope.resetLearningGoals();
		};

		// Make sure the learning goals are visible
		$scope.showLearningGoals = function showLearningGoals() {
			// disabled
			return;
			kahuna.layout.open('east');
			if (kahuna.helpLayout.state.center.innerHeight < 250) {
				kahuna.helpLayout.sizePane('north', "200");
			}
		};
	}
};
