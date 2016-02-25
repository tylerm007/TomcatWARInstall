var kahuna;

kahuna.ConnectWizardController = function ConnectWizardController($scope, $rootScope, $modalInstance, $location, $timeout, KahunaData, jqueryUI, $http, WizardHandler) {
	"use strict";
	$scope.data = {};
	$scope.data.doneButtonHideCount = undefined;
	$scope.data.wizardSuccess = false;
	$scope.data.guidedTour = kahuna.readSetting('connect.firstTime', true);
	$scope.data.invertedGuidedTour = !$scope.data.guidedTour;
	$scope.data.jdbcCatalogTerm = "Catalog";
	$scope.data.jdbcSchemaTerm = "Schema";
	$scope.data.dropdownDbType = null;

	var strGeneric = 'Generic';
	$scope.strGeneric = strGeneric;

	$scope.buttonDisable = {
		done : false,
		close : false,
		back : false,
		test : false,
		testContinue : false
	};

	var authProviderIdent = null;

	function dataReset(data) {
		data.special = null;
		data.dbtype = null;
		data.host = null;
		data.port = null;
		data.sid = null;
		data.prefix = null;
		data.catalog = null;
		data.schema = null;
		data.username = null;
		data.password = null;
		data.actual_password = null;
		data.url = null;
	}

	dataReset($scope.data);

	$scope.toggleGuidedTour = function toggleGuidedTour() {
		$scope.data.guidedTour = !$scope.data.guidedTour;
		$scope.data.invertedGuidedTour = !$scope.data.guidedTour;
	};

	var precreate = {
		northwindDerby : {
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
		}
	};

	if (!kahuna.meta.dbaseTypes) {
		kahuna.fetchData('DBaseTypes', { sysfilter: "notlike(name:'%obsolete%')" }, function fetchData_success_DBaseTypes(typedata) {
			kahuna.meta.dbaseTypes = typedata;
			kahuna.meta.dbaseTypesByIdent = {};
			_.each(typedata, function (entry) { kahuna.meta.dbaseTypesByIdent[entry.ident] = entry; });
			kahuna.applyFunctionInScope($scope, function () {
				$scope.dbaseTypes = typedata;
				$rootScope.dbaseTypesByIdent = kahuna.meta.dbaseTypesByIdent;
			});
		});
	}
	else {
		$scope.dbaseTypes = kahuna.meta.dbaseTypes;
	}

	// Find an auth provider to use
	if (kahuna.globals.currentAccount) {
		kahuna.fetchData('admin:authproviders', {
				sysfilter: "equal(class_name:'com.kahuna.server.auth.db.DefaultAuthProvider', account_ident:" + kahuna.globals.currentAccount.ident + ")",
				orderBy: 'ident'
			},
			function fetchData_success_admin_authproviders(authdata) {
				if (authdata.length) {
					authProviderIdent = authdata[0].ident;
				}
			}
		);
	}

	$scope.finishedWizard = function finishedWizard() {
		if ($scope.data.wizardSuccess) {
			$location.path("/");
		}
		$modalInstance.dismiss('cancel');
		if (!localStorage['eslo-ld-learn-restlab']) {
			$rootScope.$broadcast('dbWizardFinished');
		}
	};

	$scope.dbtypeSelected = function dbtypeSelected() {
		if ($scope.data.dropdownDbType) {
			$scope.setDbType($scope.data, $scope.data.dropdownDbType.name);
			$scope.data.url = $scope.data.dropdownDbType.url_prototype;
			$scope.data.jdbcCatalogTerm = $scope.data.dropdownDbType.catalog_term;
			if (!$scope.jdbcCatalogTerm) {
				$scope.data.catalog = null;
			}
			$scope.data.jdbcSchemaTerm = $scope.data.dropdownDbType.schema_term;
			if (!$scope.data.jdbcSchemaTerm) {
				$scope.data.schema = null;
			}
			if (/sqlserver/i.test($scope.data.dropdownDbType.url_prototype)) {
				$scope.data.schema = 'dbo';
			}
			$scope.data.prefix = 'main';
		}
	};

	$scope.backSelected = function backSelected() {
		WizardHandler.wizard("Connect Wizard").previous();
	};

	$scope.testAndProceed = function testAndProceed() {
		$scope.buttonDisable.close = true;
		$scope.buttonDisable.back = true;
		$scope.buttonDisable.test = true;
		$scope.buttonDisable.testContinue = true;
		$scope.testValues(function testValues_success(success) {
			if (success) {
				var retry = false;
				do {
					// i, l missing on purpose
					var alpha = 'abcdefghjkmnopqrstuvwxyz';
					var name = "";
					for (var i = 0; i < 5; i += 1) {
						name += alpha[Math.floor(Math.random() * alpha.length)];
					}
					$scope.data.newProjectName = ($scope.data.catalog || $scope.data.schema || $scope.data.username || 'Project ') + "-" + name;
					$scope.data.newUrlFrag = name;

					for (var proj in kahuna.meta.AllProjects) {
						if (kahuna.meta.AllProjects.hasOwnProperty(proj)) {
							if ($scope.data.newProjectName === proj.name
									|| $scope.data.newUrlFrag === proj.url_name) {
								retry = true;
								break;
							}
						}
					}
				} while (retry);
				$scope.createNewProject();
			}
			else {
				$scope.buttonDisable.close = false;
				$scope.buttonDisable.back = false;
				$scope.buttonDisable.test = false;
				$scope.buttonDisable.testContinue = false;
			}
		});
	};

	$scope.getAttention = true;

	$scope.controls = {};
	$scope.controls.successfullyCompleteWizard = function successfullyCompleteWizard(redirect, endRoute) {
		$rootScope.$broadcast('ConnectWizardSuccess');
		if (redirect) {
			$scope.$evalAsync(function () {
				$location.path('/projects/' + $rootScope.currentProject.ident + endRoute).search('wizard', 'true');
				console.log('/projects/' + $rootScope.currentProject.ident + endRoute);
			});
		}
		else {
			$scope.$evalAsync(function () {
				$location.path('/projects');
			});
		}
	};

	$scope.createNewProject = function createNewProject() {
		var comment = "Insert comments here";
		if (/^Northwind-/.test($scope.data.newProjectName)) {
			comment = 'Simple order processing demo';
		}
		var newProject = {
			account_ident : kahuna.globals.currentAccount.ident,
			name : $scope.data.newProjectName,
			url_name : $scope.data.newUrlFrag,
			is_active: true,
			authprovider_ident: authProviderIdent,
			comments: comment
		};
		KahunaData.create("AllProjects", newProject, function create_success_AllProjects(projtxn) {
			var i, modObj;
			kahuna.meta.reset();
			var apiVersion = _.find(projtxn.txsummary, function (obj) {
					return obj['@metadata'].resource === 'admin:apiversions';
				}
			);
			for (i = 0; i < projtxn.txsummary.length; i += 1) {
				modObj = projtxn.txsummary[i];
				if (modObj["@metadata"].resource === "AllProjects" && modObj["@metadata"].verb === "INSERT") {
					var projectIdent = modObj.ident;
					KahunaData.query("AllProjects", {
						sysfilter : "equal(ident:" + projectIdent + ")"
					}, function query_success_AllProjects(newprojdata) {
						var newproj = newprojdata[0];
						$rootScope.allProjects.push(newproj);
						$rootScope.currentProject = newproj;
						$rootScope.selectedProj = newproj;

						// Create the project options
						KahunaData.create('ProjectOptions', [
							{ project_ident: newproj.ident, projectoptiontype_ident: 13, option_value: "http://ca-doc.espressologic.com/docs/tutorial/northwind" }
						]);

						// Empty project without a database?
						if ($scope.data.createEmptyProject) {
							$scope.finishedWizard();
							$timeout($scope.controls.successfullyCompleteWizard, 300);
						}
						else {
							console.log("Creating new API with DB");
							var password = ($scope.data.special && strGeneric !== $scope.data.special) ? $scope.data.actual_password : $scope.data.password;

							var newDbName = $scope.data.catalog || $scope.data.schema || '';
							if ($scope.data.dbtype_ident == 16) {
								newDbName = "Salesforce (RSSBus)";
							}
							if ($scope.data.dbtype_ident == 17) {
								newDbName = "Derby";
							}
							if ( ! $scope.data.dbtype_ident) {
								$scope.data.dbtype_ident = 1;
								newDbName = "JNDI";
							}
							var newdb = {
								name : "Database: " + newDbName + " - " + $scope.data.username,
								url : $scope.data.url,
								user_name : $scope.data.username,
								password : password,
								prefix : $scope.data.prefix,
								catalog_name : $scope.data.catalog,
								schema_name : $scope.data.schema,
								active : true,
								datasource_name: $scope.data.datasource_name,
								project_ident : newproj.ident,
								dbasetype_ident : $scope.data.dbtype_ident,
								comments : 'Created using Connect Wizard'
							};

							KahunaData.create('DbSchemas', newdb, function create_success_DbSchemas(data) {
								// only show done button, when all meta data downloaded.

								var url = kahuna.baseUrl + '@database_test';
								var config = {
									cache : false,
									timeout : 60 * 1000,
									headers : {
										"Authorization" : "CALiveAPICreator " + kahuna.globals.apiKeyValue + ":1"
									}
								};

								$scope.statusMessage = "Scanning Schema";

								var pollMs = 1000;
								var pollLimit = 10 * 60;
								var fetchMeta;

								function pollStatus() {
									$http.post(url, { statusRequest: projectIdent }, config).success(function post_pollStatus_success(testResults, status) {
										var i, allComplete = true, msg;

										function getmsg(testResults, status) {
											if (testResults.status && 0 === testResults.status.indexOf("No message from server")) {
												return 'Connecting to server...';
											}
											else {
												return testResults.status;
											}
										}

										if (!Array.isArray(testResults)) {
											testResults = [ testResults ];
										}
										msg = '';
										for (i = 0; i < testResults.length; ++i) {
											var m = getmsg(testResults[i], status);
											if ('Scan complete' !== m) {
												allComplete = false;
											}
											if (0 != i) {
												msg += ', ';
											}
											msg += m;
										}

										kahuna.applyFunctionInScope($scope, function () { $scope.statusMessage = msg; });
										pollLimit -= 1;
										if (allComplete) {
											pollLimit = 0;
											if ($scope.data.special=== "northwind") {
												preCreateApiLogicSecurity(newproj, apiVersion);
											}
										}

										if (pollLimit > 0) {
											// necessary timeout for polling schema
											$timeout(pollStatus, pollMs);
										}
										else {
											// and then start asking for the meta data
											kahuna.applyFunctionInScope($scope, function () { $scope.statusMessage = "Fetching Schema"; });
											fetchMeta();
										}
									}).error(function post_pollStatus_error(errorData, status) {
										$scope.data.doneButtonHideCount = 0;
										fetchMeta();
									});
								}

								var numsteps = 5;

								function stepComplete() {
									$scope.data.doneButtonHideCount -= 1;
									$scope.$digest();
									if (0 == $scope.data.doneButtonHideCount) {
										kahuna.setDataExplorerUrl($rootScope, $scope.currentProject);

										$scope.data.tableCount = _.size(kahuna.meta.allTables);

										var childCount = 0;
										var columnCount = 0;
										for (var t in kahuna.meta.allTables) {
											t = kahuna.meta.allTables[t];
											columnCount += t.columns.length;
											if (t.hasOwnProperty('children')) {
												childCount += t.children.length;
											}
										}
										$scope.data.columnCount = columnCount;
										$scope.data.fkeyCount = childCount;

										$scope.data.viewCount = _.size(kahuna.meta.allViews);
										$scope.data.procCount = _.size(kahuna.meta.allProcedures);

										$rootScope.updateProblems();

										$scope.data.wizardSuccess = true;
									}
								}

								$scope.data.doneButtonHideCount = numsteps;

								fetchMeta = function fetchMeta() {
									kahuna.meta.getAllTables($scope.currentProject, stepComplete, stepComplete);
									kahuna.meta.getAllViews($scope.currentProject, stepComplete, stepComplete);
									kahuna.meta.getAllProcedures($scope.currentProject, stepComplete, stepComplete);
									kahuna.meta.getAllApiVersions($scope.currentProject, stepComplete, stepComplete);
									kahuna.meta.getAllResources($scope.currentProject, stepComplete, stepComplete);
								};

								kahuna.fetchData($scope.currentProject.Tables.href, null, function () {}, function () {});
								// a necessary timeout for polling
								$timeout(pollStatus, pollMs);

								// successfully create a project, don't show first time version anymore
								kahuna.saveSetting('connect.firstTime', false);
								WizardHandler.wizard("Connect Wizard").next();
								$scope.buttonDisable.close = false;
							}, function errhandle() {
								$scope.buttonDisable.close = false;
								$scope.buttonDisable.back = false;
								$scope.buttonDisable.test = false;
								$scope.buttonDisable.testContinue = false;
							});
						}
					});
				}
			}
		});
	};

	/**
	 * Pre-create some custom resources, logic and security for Northwind,
	 * modified to act on new attributes such as Customers..balance.
	 *
	 * @param northwindProj is $rootScope.currentProject
	 */
	function preCreateApiLogicSecurity(northwindProj, apiVersion) {
		var newRules =
			[
				{
					entity_name: "nw:Customers",
					prop4: "javascript",
					rule_text1: "return row.Balance <= row.CreditLimit;",
					rule_text2: "Transaction cannot be completed - Balance ({Balance|#,##0.00}) exceeds Credit Limit ({CreditLimit|#,##0.00})",
					name: "",
					auto_name: "Validation if (row.CreditLimit !== null ) {            // row is a Customer\n    if (row.Balance > row.CreditLimit) {\n        return false;         ...",
					comments: "Observe Error message insertion points {}",
					active: true,
					project_ident: northwindProj.ident,
					ruletype_ident: 5
				},
				{
					entity_name: "nw:Customers",
					attribute_name: "Balance",
					rule_text1: "OrdersList",
					rule_text2: "null === ShippedDate",
					rule_text3: "AmountTotal",
					name: "adjust the balance to be the sum(OrdersList.AmountTotal) for unshipped orders",
					auto_name: "Derive Balance as sum(OrdersList.AmountTotal) where null === ShippedDate",
					comments: "Adjusts Balance by *reacting* to changes in OrdersList.AmountTotal,\nincluding other changes noted in Table/Column help.",
					active: true,
					project_ident: northwindProj.ident,
					ruletype_ident: 1
				},
				{
					entity_name: "nw:Order Details",
					prop4: "javascript",
					attribute_name: "Amount",
					rule_text1: "var amount = row.Quantity * row.UnitPrice;  // row is the OrderDetails row\nif (row.Quantity !== 0) {\n    amount = amount * (100 - 100*row.Discount) / 100;\n}\nreturn amount;\n",
					name: "Amount as Quantity * UnitPrice -- (JavaScript snippet)",
					auto_name: "Derive Amount as var amount = row.Quantity * row.UnitPrice;  // row is the Order Details row\nif (row.Quantity !== 0) {\n    amount = amount * (100 - ...",
					comments: "JavaScript is used to express logic,\nproviding access to libraries for date arithmetic (etc.), or your own.\nReactive logic recomputes Amount in response to changes Quantity, Price (and, per logic chaining, the ProductId)",
					active: true,
					project_ident: northwindProj.ident,
					ruletype_ident: 3
				},
				{
					entity_name: "nw:Order Details",
					attribute_name: "UnitPrice",
					rule_text1: "FK_Order_Details_Products",
					rule_text2: "UnitPrice",
					name: "copy price from product, unaffected by price changes",
					auto_name: "Derive UnitPrice as parentcopy(FK_Order_Details_Products.UnitPrice)",
					comments: "Obtain the price from the product.\nCopy means subsequent changes to Products.UnitPrice do not affect existing Order Details.\n  You could also use a formula for row.Products.UnitPrice if you *do* want to cascade changes.\n\nYou can change the Rule name (at the top) to be more friendly, or specify a more suitable Foreign Key name, such as Product__OrderDetails.",
					active: true,
					project_ident: northwindProj.ident,
					ruletype_ident: 4
				},
//				{
//					entity_name: "nw:Orders",
//					prop4: "javascript",
//					rule_text1: "log.debug(\"audit begin\");\nvar mongoClient = MongoUtilityCreate();\nvar configSetup = {\n   serverName  : '50.19.209.115',\n   serverPort  : '27017' ,\n   databaseName: 'Audit'\n}\nmongoClient.configure(configSetup);\n//opitional\nvar payload = {\n    username: \"\",\n    password: \"\"\n};\nmongoClient.createClientConnection(payload);\nvar auditrow = {};\nauditrow.CompanyName = row.FK_Orders_Customers.CompanyName;\nauditrow.OrderNumber = row.OrderID;\nauditrow.CustomerID = row.CustomerID;\nauditrow.ShipPostalCode = row.ShipPostalCode;\nauditrow.date = JSON.stringify(new Date());\nvar resp = mongoClient.mongoInsert(\"audit\",\"EspressoAudit\",auditrow);\nlog.debug(JSON.stringify(resp,null,2));\nmongoClient.close();\n",
//					name: "Audit row to MongoDB",
//					auto_name: "Event: log.debug(\"audit begin\");\nvar mongoClient = MongoUtilityCreate();\nvar configSetup = {\n   serverName  : '50.19.209.115',\n   serverPort  : '270...",
//					verbs: "INSERT,UPDATE,",
//					active: true,
//					project_ident: northwindProj.ident,
//					ruletype_ident: 7
//				},
				{
					entity_name: "nw:Orders",
					attribute_name: "AmountTotal",
					rule_text1: "Order_DetailsList",
					rule_text3: "Amount",
					name: "",
					auto_name: "Derive AmountTotal as sum(Order_DetailsList.Amount)",
					comments: "Adjust the AmountTotal to be the sum(Order_DetailsList.Amount)\nObserve how simple rules chain to solve complex, multi-table transactions.",
					active: true,
					project_ident: northwindProj.ident,
					ruletype_ident: 1
				}
			];

		var apiVersionIdent = apiVersion.ident;

		var CompanyDbName, CustomerDbName, OrderDbName;
		if ($rootScope.isNorthwindDerby) {
			CompanyDbName = '"CompanyName"';
			CustomerDbName = '"CustomerID"';
			OrderDbName = '"OrderDate"';
		}
		else {
			CompanyDbName = "CompanyName";
			CustomerDbName = "CustomerID";
			OrderDbName = "OrderDate";
		}

		var newResources =
			[
				{
					resource_type_ident: 1,
					prefix: "nw",
					table_name: "Customers",
					name: "CustomersBusObject",
					description: "Customers with orders - note Attribute alias",
					is_collection: "Y",
					sorting: CompanyDbName + " asc",
					apiversion_ident: apiVersionIdent,
					Attributes:
						[
							{
								name: "ID",
								column_name: "CustomerID"
							},
							{
								name: "Balance",
								column_name: "Balance"
							}
						]
				},
				{
					resource_type_ident: 1,
					prefix: "nw",
					table_name: "Orders",
					name: "Orders",
					join_condition: CustomerDbName + " = [CustomerID]",
					description: "Orders for customer",
					is_collection: "Y",
					sorting: OrderDbName + " asc",
					apiversion_ident: apiVersionIdent,
					Attributes:
						[
							{
								name: "Total",
								column_name: "AmountTotal"
							},
							{
								name: "Date",
								column_name: "OrderDate"
							}
						]
				}
			];

		var newUsers =
			[
				{
					name: "region",
					fullname: "User with specified region",
					status: "A",
					roles: "Authorized per region",
					data: "UserRegion=OR",
					password_hash: "ymw8M9MOrz2jwjZGiu8T7IUOv5NAtxthu/CNUWRWltELTgbGY1bJ/MWdjrzIrkUpHlXMP+qmBJc84q1BtoTzpg==",
					password_salt: "zXFH3Uwdim9r3YGzl8NhnQa1CUdgkLx5/fT98w6u",
					project_ident: northwindProj.ident
				}
			];

		var newApiKeys =
			[
				{
					name: "Region Customers",
					description: "Use this key in the REST Lab, and observe that Customers returns fewer rows.\n\nThis is due to the defined Role, which uses the Global variable defined on the Details tab.",
					apikey: "RegCusts",
					status: "A",
					logging: "*=FINE",
					data: "UserRegion=OR",
					project_ident: northwindProj.ident
				}
			];

		var predicateName = "Region";
		if (/^jdbc:derby/.test($scope.data.url)) {
			predicateName = '"Region"';
		}

		var newRoles =
			[
				{
					name: "Authorized per region",
					description: "Click the Permissions tab.",
					default_permission: "A",
					default_apivisibility: "TVRPM",
					project_ident: northwindProj.ident,
					ApiKeyRoles:
						[
							{
								apikey_ident: -1 // fixed up after ApiKeys saved    FIXME failed
							}
						],
					TablePermissions:       // FIXME did not get loaded
						[
							{
								name: "My Regions Customer",
								description: "Illustrates row-level security - see only customers in 'my' UserRegion.\n\nUserRegion defined in the Auth Tokens (for this example), or Users (in normal cases)",
								entity_name: "nw:Customers",
								predicate: predicateName + " = '@{UserRegion}'",
								access_type: "A"
							}
						]
				}
			];

		KahunaData.create('admin:rules', newRules,
			function (data) {
				console.log('new rules debug', data);
			},
			function (e) {
				console.log("ERROR inserting admin:rules: " + e);
			}
		);

		KahunaData.create('admin:users', newUsers,
			function (data) {
			},
			function (e) {
				console.log("ERROR inserting admin:users: " + e);
			}
		);

		KahunaData.create('admin:apikeys', newApiKeys,
			function (data) {
				newRoles[0].ApiKeyRoles[0].apikey_ident = _.find(data.txsummary, function (d) {
						return d['@metadata'].resource == 'admin:apikeys' && d.name === 'Region Customers';
					}).ident;

				KahunaData.create("RolesWithLinks", newRoles, function (data2) {
					console.log('Roles with links added');
				},
				function (e) {
					console.log("ERROR inserting admin:roles: " + e);
				});

				// var resMap = {};
				// _.each(data.txsummary, function (r) {
				//         if (r['@metadata'].resource == "admin:apikeys") {
				//             resMap[r.name] = r;
				//         }
				//     }
				// );
				// var apikey_ident = resMap["Region Customers"].ident;
				// newRoles[0].ApiKeyRoles[0].apikey_ident = resMap["Region Customers"].ident;
				console.log("DEBUG fixing newRoles[0].ApiKeyRoles[0].apikey_ident = " + newRoles[0].ApiKeyRoles[0].apikey_ident);
			},
			function (e) {
				console.log("ERROR inserting Auth Tokens: " + e);
			}
		);

		// Note: inserting resources is complicated because we have to first insert them
		// then connect them together.
		KahunaData.create("AllResources", newResources,
			function (data) {
				var resMap = {};
				_.each(data.txsummary,
					function (r) {
						if (r['@metadata'].resource === "AllResources") {
							resMap[r.name] = r;
						}
					}
				);
				var toSave = [];
				resMap["Orders"].root_ident = resMap["CustomersBusObject"].ident;
				resMap["Orders"].container_ident = resMap["CustomersBusObject"].ident;
				toSave.push(resMap["Orders"]);
				KahunaData.update(toSave,
					function (data2) {
						console.log("Resources updated");
					},
					function (e) {
						console.log("ERROR updating resources: " + e);
					}
				);
			},
			function (e) {
				console.log("ERROR inserting resources: " + e);
			}
		);
	}

	$scope.testOnly = function testOnly() {
		$scope.buttonDisable.close = true;
		$scope.buttonDisable.back = true;
		$scope.buttonDisable.test = true;
		$scope.buttonDisable.testContinue = true;
		$scope.testValues(function (success) {
			$scope.buttonDisable.test = false;
			$scope.buttonDisable.testContinue = false;
			$scope.buttonDisable.close = false;
			$scope.buttonDisable.back = false;
		});
	};

	// optional fun is called with true/false depending on success
	$scope.testValues = function testValues(fun) {
		$scope.data.testInProgress = "Testing connection...";
		$scope.data.latencyMilliseconds = undefined;
		$scope.data.latencyColorCode = undefined;
		$scope.data.latencySummary = undefined;
		if (strGeneric !== $scope.data.special && 'Derby' != $scope.data.dbtype) {
			$scope.data.url = null;
		}
		var password = ($scope.data.special && strGeneric !== $scope.data.special) ? $scope.data.actual_password : $scope.data.password;
		var dbinfo = {
			special : $scope.data.special,
			dbtype : $scope.data.dbtype,
			host : $scope.data.host,
			port : $scope.data.port,
			sid : $scope.data.sid,
			db2zoslocation: $scope.data.db2zoslocation,
			db2luwdatabase: $scope.data.db2luwdatabase,
			prefix : $scope.data.prefix,
			catalog : $scope.data.catalog,
			schema : $scope.data.schema,
			username : $scope.data.username,
			password : password,
			url : $scope.data.url,
			securitytoken: $scope.data.securitytoken,
			datasource_name: $scope.data.datasource_name
		};
		var config = {
			cache : false,
			timeout : 60 * 1000,
			headers : {
				"Authorization" : "CALiveAPICreator " + kahuna.globals.apiKeyValue + ":1"
			}
		};

		// remove beta labels from the dbtype
		if (dbinfo && dbinfo.dbtype && dbinfo.dbtype.match(/\(beta\)/)) {
			dbinfo.dbtype = dbinfo.dbtype.replace(' \(beta\)', '');
		}

		var url = kahuna.baseUrl + '@database_test';
		return $http.post(url, dbinfo, config).success(function (data, status) {
			$scope.data.testResults = { data : data, status : status };
			if (strGeneric !== $scope.data.special) {
				$scope.data.url = data.url;
			}
			if (data.errorMessage) {
				$scope.data.testInProgress = data.errorMessage;
				fun && fun(false);
			}
			else {
				$scope.data.testInProgress = 'Success: ' + data.productName + ' ' + data.productVersion;
				$scope.data.latencyMilliseconds = data.latencyMilliseconds.toFixed(3);
				$scope.data.latencySummary = data.latencySummary;
				$scope.data.latencyColorCode = data.latencyColorCode;
				fun && fun(true);
			}

			// all tests, even failed tests return success (at the http level)
			console.log(status);
			console.log(data);
		}).error(function (data, status) {
			$scope.data.testResults = { data : data, status : status };
			fun && fun(false);
			data = data || 'Request failed';
			$scope.data.testInProgress = 'Request failed ' + status;
			if (data.error) {
				$scope.data.testInProgress += " - " + data.error;
			}
			console.log(data);
			console.log(status);
		});
	};

	$scope.setDbType = function setDbType(data, typeString) {
		var i, len, typeList = $scope.dbaseTypes;
		if (typeString == 'JNDI') {
			data.dbtype = typeString;
		}
		else {
			for (i = 0, len = typeList.length; i < len; i += 1) {
				if (typeString === typeList[i].name) {
					data.dbtype = typeString;
					data.dbtype_ident = typeList[i].ident;
					data.dbdescription = typeList[i].description;
					data.url = typeList[i].url_prototype;
					if (/sqlserver/i.test(typeList[i].url_prototype)) {
						$scope.data.schema = 'dbo';
					}
					break;
				}
			}
		}
	};

	$scope.precreateNorthwindDerby = function precreateNorthwindDerby() {
		dataReset($scope.data);
		$scope.data.special = 'northwind';
		$scope.setDbType($scope.data, precreate.northwindDerby.dbtype);
		$scope.data.url = precreate.northwindDerby.url;
		$scope.data.username = precreate.northwindDerby.username;
		$scope.data.host = precreate.northwindDerby.host;
		$scope.data.port = precreate.northwindDerby.port;
		$scope.data.sid = precreate.northwindDerby.sid;
		$scope.data.prefix = precreate.northwindDerby.prefix;
		$scope.data.catalog = precreate.northwindDerby.catalog;
		$scope.data.schema = precreate.northwindDerby.schema;
		$scope.data.password = precreate.northwindDerby.password;
		$scope.data.actual_password = precreate.northwindDerby.actual_password;
	};

	$scope.createMySQL = function createMySQL() {
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'MySQL');
		$scope.data.port = '3306';
	};

	$scope.createOracle = function createOracle() {
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'Oracle');
		$scope.data.sid = 'ORCL';
		$scope.data.port = '1521';
	};

	$scope.createDB2zOS = function createDB2zOS() {
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'DB2 for z/OS');
		$scope.data.port = '50000';
		$scope.data.db2zoslocation = 'LOCATION';
	};

	$scope.createDB2LUW = function createDB2LUW() {
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'DB2 for LUW');
		$scope.data.port = '50000';
		$scope.data.db2luwdatabase = 'DATABASE';
	};

	$scope.createSQLServer = function createSQLServer() {
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'SQLServer');
		$scope.data.port = '1433';
		$scope.data.schema = 'dbo';
	};

	$scope.createAzureSQL = function createAzureSQL() {
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'AzureSQL');
		$scope.data.port = '1433';
	};

	$scope.createDerby = function createDerby() {
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'Derby');
		$scope.data.url = 'jdbc:derby:/foo/MyDB';
	};

	$scope.createNuoDBSQL = function createNuoDBSQL() {
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'NuoDB (beta)');
		$scope.data.port = '48004';
	};

	$scope.createPostgreSQL = function createPostgreSQL() {
		console.log('PostgreSQL was selected');
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'PostgreSQL');
		$scope.data.port = '5432';
	};

	$scope.createVerticaSQL = function createVerticaSQL() {
		console.log('Vertica Database was selected');
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'Vertica Database');
		$scope.data.port = '5433';
	};

	$scope.createRSSBusSalesforce = function createRSSBusSalesforce() {
		console.log('Salesforce (RSSBus) Database was selected');
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'Salesforce (RSSBus)');
		$scope.data.port = '1433';
	};
	$scope.createPervasive = function createPervasive() {
		console.log('Pervasive PSQL (beta) Database was selected');
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'Pervasive PSQL (beta)');
		$scope.data.port = '1583';
	};
	$scope.createJNDI = function createJNDI() {
		console.log('JNDI Data source was selected');
		dataReset($scope.data);
		$scope.setDbType($scope.data, 'JNDI');
	};

	$scope.createGenericJdbc = function createGenericJdbc() {
		dataReset($scope.data);
		$scope.data.special = strGeneric;
		$scope.setDbType($scope.data, 'MySQL');
	};

	$scope.createEmptyProject = function createEmptyProject() {
		var alpha = 'abcdefghjkmnopqrstuvwxyz';
		var name = "";
		for (var i = 0; i < 5; i += 1) {
			name += alpha[Math.floor(Math.random() * alpha.length)];
		}
		$scope.data.newProjectName = 'Project ' + name;
		$scope.data.newUrlFrag = name;
		$scope.data.createEmptyProject = true;
		$scope.createNewProject();
	};
};
