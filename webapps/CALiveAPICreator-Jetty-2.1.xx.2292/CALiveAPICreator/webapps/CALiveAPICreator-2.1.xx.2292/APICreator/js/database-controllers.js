kahuna.database = null;
kahuna.database = {
	helpDialog: null,
	helpText: null,

	DatabaseListCtrl: function ($rootScope, $scope, $http, $location, $routeParams, $timeout, $log, $sce, KahunaData, Project, Delta, jqueryUI, Notices, $route, $interval) {
		$rootScope.currentPage = 'databases';
		$rootScope.currentPageHelp = 'docs/logic-designer/database';
		$rootScope.helpDialog('database', 'Help', localStorage['eslo-ld-learn-complete']);

		$scope.data = {};
		var RELOAD_SCHEMA = 'Reload Schema';
		var RELOAD_INPROGRESS = 'Reload In Progress';
		$scope.data.rescanButtonLabel = RELOAD_SCHEMA;
		$scope.data.rescanStepsRemaining = undefined;
		$scope.data.rescanButtonIsDisabled = false;
		$scope.data.disableAllButtons = false;
		$scope.data.disableSaveSequencesButton = false;
		$scope.data.sequenceChanged = false;
		$scope.data.scanMessage = 'No message yet';
		$scope.data.scanMessageSuffix = '';
		$scope.data.scanInProgress = false;
		$scope.data.activeTabs = [true, false, false, false];
		$scope.latencyStyle = {"background-color": "#CCCCCC"};
		$scope.events = {};

		$scope.currentProject = $rootScope.currentProject;
		$scope.$on('$destroy', function on_$destroy(event, data) {
			_.each($scope.events, function (listener, name) {
				listener(); // unset
			});
		});

		$rootScope.recentGenerateBroadcast = false;
		$scope.generateRelationshipEvent = function generateRelationshipEvent(event, table, type, relatedTable) {
			if (!$rootScope.recentGenerateBroadcast) {
				$rootScope.recentGenerateBroadcast = true;
				$scope.rels.createRelationship(table, type, relatedTable);
			}

			// wait for ^^ createRelationship() to digest
			$timeout(function () {
				$rootScope.recentGenerateBroadcast = false;
				$route.reload();

				// schema changes are reloading
				$timeout(function () {
					angular.element('.relationships-tab-heading').click();
					var intervalCount = 0;

					// trying to activate relationships tab
					var interval = $interval(function () {
						if ($rootScope.createdRelationship) {
							$scope.rels.currentRelationship = $rootScope.createdRelationship;
							$interval.cancel(interval);
						}
						else {
							intervalCount++;
						}
						if (intervalCount > 3) {
							var scope = angular.element('#relationships-select').scope().$parent;
							var relList = _.indexBy(scope.rels.relationships, 'ident');
							var relArr = _.toArray(relList);
							scope.rels.currentRelationship = relArr[relArr.length-1];
							$interval.cancel(interval);
						}
						// wait for "Relationships" tab to be activated
						$scope.$broadcast('RefreshRelationships');
					}, 150);
					$timeout(function () { $('.relationship-meta .btn-primary').click(); }, 1000);
				}, 300);
			}, 300);
		};

		$scope.$on('RefreshRelationshipsList', function on_RefreshRelationshipsList() {
			// wait for "Relationships" tab to be activated
			$timeout(function () { $scope.rels.saveRelationship(false); }, 1000);
		});

		$scope.events.CreateRelationship = $rootScope.$on('CreateRelationship', $scope.generateRelationshipEvent);

		// to hold all relationship data
		$scope.rels = {
			tables: [],
			views: [],
			relationships: [],
			currentRelationship: null,
			// The available options for the referential delete / update constraints defined on relationships
			onUpdateOptions: [
				{ id: 'C', name: 'Cascade' },
				{ id: 'N', name: 'Set Null' },
				{ id: 'R', name: 'Restrict' }
			],
			onDeleteOptions: [
				{ id: 'C', name: 'Cascade' },
				{ id: 'N', name: 'Set Null' },
				{ id: 'R', name: 'Restrict' }
			]
		};

		$timeout(function () {
			// allTables is a map
			for (var tableName in kahuna.meta.allTables) {
				$scope.rels.tables.push(tableName);
			}
		}, 250);

		// allViews is a map
		for (var viewName in kahuna.meta.allViews) {
			$scope.rels.views.push(viewName);
		}

		$('.ResizableTd').resizable({
			handles: 'e',
			minWidth: 40
		});

		$scope.$on('$viewContentLoaded', function on_$viewContentLoaded() {
			Delta.put($scope)
				.snapshot('data.currentDbaseSchema');
		});

		$scope.$on('$locationChangeStart', function on_$locationChangeStart(event, next, current) {
			return;
			var path = $location.url();
			if (!Delta.isReviewed()) {
				event.preventDefault();
				Delta.review()
					.then(function () {
						// resume navigation
						$location.path(path);
					})
					["catch"](function () {
						Delta.reviewed = false;
						Notices.confirmUnsaved().then(function (save) {
							if (save) {
								Delta.scope.saveDbaseSchema($scope.data.currentDbaseSchema);
							}
							$location.path(path);
						});
					}
				);
			}
		});


		$scope.rels.markModified = function markModified() {
			var curRel = $scope.rels.currentRelationship;
			if (curRel) {
				curRel.modified = true;
			}
		}


		$scope.rels.addColumn = function addColumn() {
			var curRel = $scope.rels.currentRelationship;
			curRel.childColsArray = curRel.childColsArray || [];
			curRel.parentColsArray = curRel.parentColsArray || [];
			curRel.childColsArray.push(curRel.childEntity.columns[0].name);
			curRel.parentColsArray.push(curRel.parentEntity.columns[0].name);
		};


		$scope.rels.subtractColumn = function subtractColumn(index) {
			var curRel = $scope.rels.currentRelationship;
			curRel.childColsArray.splice(index, 1);
			curRel.parentColsArray.splice(index, 1);
			$log.log(curRel);
		};


		kahuna.readGuiSettings($scope.currentProject);
		$scope.data.dbListWidth = kahuna.getGuiSetting($scope.currentProject, 'database', 'dbListWidth', 200);

		// Save all GUI settings before navigating away
		$scope.$on('$destroy', function () {
			var proj = $scope.currentProject;
			kahuna.deleteGuiSetting(proj, 'database');
			kahuna.storeGuiSetting(proj, 'database', 'dbListWidth', $("#dbListTd").width());
			kahuna.saveGuiSettings(proj);
		});

		var starPassword = "********";

		kahuna.meta.getAllSchemas($rootScope.currentProject, function (data) {
			kahuna.putInScope('dbaseSchemas', data);
			if (data.length > 0) {
				$rootScope.$apply(function () {
					$scope.data.currentDbaseSchema = data[0];
					$scope.schemaSelected();
				});
			}
		});

		$scope.schemaSelected = function schemaSelected() {
			$scope.setReloadSchemaButton();
			$scope.fetchRelationships($scope.currentProject);
			$scope.showSequences();
			$scope.npAtts.fetchNPAtts();
			$scope.npAtts.loadTables();
			$scope.accessURL = null;
			if ($scope.data.currentDbaseSchema && $scope.data.currentDbaseSchema.admin_url) {
				$scope.accessURL = $sce.trustAsResourceUrl($scope.data.currentDbaseSchema.admin_url);
			}
			if ($scope.data.currentDbaseSchema && $scope.data.currentDbaseSchema.datasource_name) {
				$scope.data.showProperties = 'ds';
			}
			else {
				$scope.data.showProperties = 'props';
			}
			
			if ($scope.npAtts.reloadSchemaIfNeeded) {
				$scope.npAtts.reloadSchemaIfNeeded();
			}
		};

		if ( ! kahuna.meta.dbaseTypes) {
			kahuna.fetchData('DBaseTypes', { sysfilter: "notlike(name:'%obsolete%')" }, function (data) {
				kahuna.meta.dbaseTypes = data;
				kahuna.meta.dbaseTypesByIdent = {};
				_.each(data, function (entry) { kahuna.meta.dbaseTypesByIdent[entry.ident] = entry; });
				$scope.$apply(function () {
					$scope.dbaseTypes = data;
					$rootScope.dbaseTypesByIdent = kahuna.meta.dbaseTypesByIdent;
				});
			});
		}
		else {
			$scope.dbaseTypes = kahuna.meta.dbaseTypes;
		}
		$scope.data.dbPassword = starPassword;


		$scope.rels.parentEntitySelected = function parentEntitySelected() {
			var currel = $scope.rels.currentRelationship;
			currel.parentEntity = kahuna.meta.allTables[currel.parent_entity_name];
			currel.role_to_parent = genToParentRoleName(currel.parentEntity);

			// walk thru relationship parent column names, make sure they exist, or set to first one.
			var tbl = currel.parentEntity;
			var columnMap = kahuna.util.convertToMap(tbl.columns, 'name');
			var colArray = currel.parentColsArray;
			for (var i = 0; i < colArray.length; ++i) {
				if (!columnMap.hasOwnProperty(colArray[i])) {
					colArray[i] = tbl.columns[0].name;
				}
			}
		}


		$scope.rels.childEntitySelected = function childEntitySelected() {
			var currel = $scope.rels.currentRelationship;
			currel.childEntity = kahuna.meta.allTables[currel.child_entity_name];
			currel.role_to_child = genToChildrenRoleName(currel.childEntity);

			// walk thru relationship child column names, make sure they exist, or set to first one.
			var tbl = currel.childEntity;
			var columnMap = kahuna.util.convertToMap(tbl.columns, 'name');
			var colArray = currel.childColsArray;
			for (var i = 0; i < colArray.length; ++i) {
				if (!columnMap.hasOwnProperty(colArray[i])) {
					colArray[i] = tbl.columns[0].name;
				}
			}
		}


		var findSchemaIndex = function findSchemaIndex(schema) {
			if ( ! $scope.dbaseSchemas)
				return -1;
			for (var idx = 0; idx < $scope.dbaseSchemas.length; idx++) {
				if ($scope.dbaseSchemas[idx].ident == schema.ident)
					return idx;
			}
		};


		var processUpdate = function processUpdate(data) {
			var numsteps = 5;
			$scope.data.rescanStepsRemaining = numsteps;
			function stepComplete() {
				$scope.data.rescanStepsRemaining -= 1;
				$rootScope.schemaLoadingStatus = "Schema loading, " + $scope.data.rescanStepsRemaining + " steps remaining";
				$scope.$digest();
				if (0 == $scope.data.rescanStepsRemaining) {
					$rootScope.schemaLoadingStatus = null;
					kahuna.applyFunctionInScope($scope, function () {
						var msg = "Scan completed - " + _.size(kahuna.meta.allTables) + " tables, " + _.size(kahuna.meta.allViews) + " views, " + _.size(kahuna.meta.allProcedures) + " procedures.";
						$log.log(msg);
						kahuna.setDataExplorerUrl($rootScope, $scope.currentProject);
						$rootScope.updateProblems();
						kahuna.util.info(msg);
						$scope.data.disableAllButtons = false;
						$scope.data.rescanButtonLabel = RELOAD_SCHEMA;
						$scope.setReloadSchemaButton();
					});
				}
			}
			var alertMsg = null;
			var delayReEnable = false;
			var updated = kahuna.util.findInTxSummary(data.txsummary, 'DbSchemas', 'UPDATE');
			for (var idx = 0; idx < updated.length; ++idx) {
				var modObj = updated[idx];
				if ($scope.data.currentDbaseSchema.active) {
					if (modObj.status.substring(0,2) != 'OK') {
						alertMsg = 'it cannot be marked as active because it cannot be reached: ' + modObj.status;
					}
				}
				// A different schema is now active -- refresh tables
				if (modObj.active) {
					delayReEnable = true;
					$rootScope.schemaLoadingStatus = "Loading tables...";
					kahuna.meta.getAllTables($scope.currentProject, stepComplete, stepComplete);
					kahuna.meta.getAllViews($scope.currentProject, stepComplete, stepComplete);
					kahuna.meta.getAllProcedures($scope.currentProject, stepComplete, stepComplete);
					kahuna.meta.getAllApiVersions($scope.currentProject, stepComplete, stepComplete);
					kahuna.meta.getAllResources($scope.currentProject, stepComplete, stepComplete);
				}
				var updatedIdx = findSchemaIndex(modObj);
				$scope.dbaseSchemas[updatedIdx] = modObj;
				$scope.data.currentDbaseSchema = modObj;
				$scope.data.dbPassword = starPassword;
			}
			if (!delayReEnable) {
				$scope.data.disableAllButtons = false;
				$scope.setReloadSchemaButton();
			}
			if (alertMsg) {
				kahuna.util.warning('Database ' + $scope.data.currentDbaseSchema.name + ' was saved, but ' + alertMsg);
				}
			else {
				kahuna.util.info('Database ' + $scope.data.currentDbaseSchema.name + ' was saved');
			}
		};


		// Update
		$scope.saveDbaseSchema = function saveDbaseSchema(dbschema) {
			if ($scope.data.dbPassword != starPassword) {
				dbschema.password = $scope.data.dbPassword;
			}
			if ($scope.data.currentDbaseSchema.active) {
				dbschema.status = '?';
			}

			$scope.data.disableAllButtons = true;
			var update = KahunaData.update(dbschema, processUpdate, function (data, status, url) {
				$log.error(data);
				$scope.data.disableAllButtons = false;
				$scope.setReloadSchemaButton();
				kahuna.util['error'](data.errorMessage);
			});

			Delta.reset();
		};

		$scope.setReloadSchemaButton = function setReloadSchemaButton() {
			if ($scope.data.currentDbaseSchema && $scope.data.currentDbaseSchema.active) {
				$scope.data.rescanButtonIsDisabled = false;
			}
			else {
				$scope.data.rescanButtonIsDisabled = true;
			}
		};

		$scope.deleteDbaseSchema = function deleteSchemaCallback(dbschema) {
			if ( ! confirm('Delete database ' + dbschema.name + ' ?')) {
				return;
			}
			var dbName = dbschema.name;
			KahunaData.remove(dbschema, function (data) {
				var idx = $scope.dbaseSchemas.indexOf(dbschema);
				kahuna.applyFunctionInScope($scope, function () {
					$scope.dbaseSchemas.splice(idx, 1);
					if (idx > 0) {
						$scope.data.currentDbaseSchema = $scope.dbaseSchemas[idx - 1];
					}
					else if ($scope.dbaseSchemas.length > 0) {
						$scope.data.currentDbaseSchema = $scope.dbaseSchemas[0];
					}
					else {
						$scope.data.currentDbaseSchema = null;
					}
					$scope.setReloadSchemaButton();
					$scope.reloadSchema($scope.data.currentDbaseSchema);
					kahuna.util.info('Database ' + dbName + ' was deleted');
				});
			}, function deleteSchemaErrCallback(data, status, url) {
				$log.error(data);
				kahuna.applyFunctionInScope($scope, function () {
					reloadSchema($scope.data.currentDbaseSchema);
					$scope.setReloadSchemaButton();
				});
			});
		};


		$scope.createDbaseSchema = function createDbaseSchema() {
			if ($scope.currentProject.ident == 3) {
				alert('You cannot create a new database in the admin project');
				return;
			}
			var sampleUrl = 'jdbc:mysql://<hostname>/<db-name>';
			KahunaData.create('DbSchemas', {name: "New database", url:'jdbc:mysql://<hostname>/<db-name>', user_name:'jdoe',
				active: false, project_ident: $scope.currentProject.ident, dbasetype_ident: 1},
				function (data) {
					var newSchema = null;
					var inserted = kahuna.util.findInTxSummary(data.txsummary, 'DbSchemas', 'INSERT');
					for (var idx = 0;  idx < inserted.length; ++idx) {
						var modObj = inserted[idx];
						$scope.dbaseSchemas.push(modObj);
						newSchema = modObj;
					}

					$scope.data.currentDbaseSchema = newSchema;
					$scope.setReloadSchemaButton();
					$scope.data.dbPassword = "********";
					kahuna.util.info('Database was created');
				});
		};


		$scope.testDbaseSchema = function testDbaseSchema(dbschema) {
			$scope.data.disableAllButtons = true;
			dbschema.status = '?';
			if ($scope.data.dbPassword != starPassword) {
				dbschema.password = $scope.data.dbPassword;
			}
			KahunaData.update(dbschema, function callback(data) {
				$scope.data.disableAllButtons = false;
				var updated = kahuna.util.findInTxSummary(data.txsummary, 'DbSchemas', 'UPDATE');
				if (0 === updated.length) {
					throw "Unexpected: unable to find updated dbaseschemas";
				}
				for (var idx = 0; idx < updated.length; ++idx) {
					var modObj = updated[idx];
					var updatedIdx = findSchemaIndex(modObj);
					$scope.dbaseSchemas[updatedIdx] = modObj;
					$scope.data.currentDbaseSchema = modObj;
					$scope.setReloadSchemaButton();
					if (modObj.status.substring(0, 2) == 'OK') {
						kahuna.util.info('Database test successful');
						var lat = modObj.status.substring(3);
						var latNum = new Number(lat);
						$scope.latency = latNum / 1000;
						if (modObj.status.length == 2) {
							$scope.latencyText = 'The latency to the database could not be determined.';
							$scope.latencyStyle = {"background-color": "#CCCCCC"};
						}
						else if ($scope.latency < 2) {
							$scope.latencyText = 'The latency to the database is low. This is good.';
							$scope.latencyStyle = {"background-color": "#00FF55"};
						}
						else if ($scope.latency < 7) {
							$scope.latencyText = 'The latency to the database is moderate. If your database has a lot of tables, you may notice some delays.';
							$scope.latencyStyle = {"background-color": "#FFFF00"};
						}
						else if ($scope.latency < 20) {
							$scope.latencyText = 'The latency to the database is high. This is a problem. Performance will be negatively impacted.';
							$scope.latencyStyle = {"background-color": "#FFBF00"};
						}
						else {
							$scope.latencyText = 'The latency to the database is very high. This is a serious problem. You should probably consider moving your database closer to the server.';
							$scope.latencyStyle = {"background-color": "#FF0000"};
						}
					}
					else {
						kahuna.util.error('Database test failed: ' + modObj.status);
					}
				}
			}, function errCallback(data, status, url) {
				$log.error(data);
				$scope.data.disableAllButtons = false;
				$scope.setReloadSchemaButton();
			});
		};


		$scope.reloadSchema = function reloadSchema(dbschema) {
			$scope.data.disableAllButtons = true;
			var numsteps = 5;
			$scope.data.rescanStepsRemaining = numsteps;
			function stepComplete() {
				$scope.data.rescanStepsRemaining -= 1;
				$scope.$digest();
				if (0 == $scope.data.rescanStepsRemaining) {
					kahuna.applyFunctionInScope($scope, function () {
						var msg = "Database rescan completed - " + _.size(kahuna.meta.allTables) + " tables, " + _.size(kahuna.meta.allViews) + " views, " + _.size(kahuna.meta.allProcedures) + " procedures.";
						$log.log(msg);
						kahuna.setDataExplorerUrl($rootScope, $scope.currentProject);
						$rootScope.updateProblems();
						kahuna.util.info(msg);
						$scope.data.disableAllButtons = false;
						$scope.setReloadSchemaButton();
						$scope.data.rescanButtonLabel = RELOAD_SCHEMA;
						Project.refreshCurrentProject();
					});
				}
			}

			$scope.data.rescanButtonLabel = RELOAD_INPROGRESS;
			dbschema.status = 'R';
			KahunaData.update(dbschema, function (data) {
				// changing scope variables outside of a digest cycle
				$scope.$evalAsync(function () {
					var modObj = data.txsummary[0];
					var updatedIdx = findSchemaIndex(modObj);
					$scope.dbaseSchemas[updatedIdx] = modObj;
					$scope.data.currentDbaseSchema = modObj;

					if (modObj.status.substring(0, 2) == 'OK') {
						kahuna.util.info("Database schema rescan started.");
						$rootScope.schemaLoadingStatus = "Loading tables...";
						kahuna.meta.getAllTables($scope.currentProject, stepComplete, stepComplete);
						kahuna.meta.getAllViews($scope.currentProject, stepComplete, stepComplete);
						kahuna.meta.getAllProcedures($scope.currentProject, stepComplete, stepComplete);
						kahuna.meta.getAllApiVersions($scope.currentProject, stepComplete, stepComplete);
						kahuna.meta.getAllResources($scope.currentProject, stepComplete, stepComplete);
					}
					else {
						kahuna.util.error('Database rescan failed: ' + modObj.status);
					}
				});
			}, function errCallback(data, status, url) {
				$scope.data.disableAllButtons = false;
				$scope.setReloadSchemaButton();
			});
		};


		/////////////////////////////////////////////////////////////////////////////////
		// Relationships tab

		function genRoleToParent(ent) {
			return ent.name;
		}

		$scope.fetchRelationships = function fetchRelationships(project) {
			console.log('Fetching relationships');
			kahuna.fetchData('admin:relationships', { sysorder: '(child_entity_name:asc_uc,child_entity_name:desc)', sysfilter: 'equal(project_ident:' + project.ident + ')' }, function (data) {
				// changing scope values outside of a digest cycle
				$scope.$evalAsync(function () {
					$scope.rels.relationships = data;

					// Split the comma separated list of child cols in to an array -> needed by the multi-select control
					for (var idx = 0; idx < data.length; ++idx) {
						var rel = data[idx];
						rel.modified = false;
						rel.parentEntity = kahuna.meta.allTables[rel.parent_entity_name];
						if (!rel.parentEntity) {
							rel.parentEntity = kahuna.util.getFirstProperty(kahuna.meta.allTables);
							rel.role_to_parent = (rel.role_to_parent + '_' + genRoleToParent(rel.parentEntity));
							rel.modified = true;
						}
						rel.childEntity = kahuna.meta.allTables[rel.child_entity_name];
						if (!rel.childEntity) {
							rel.childEntity = kahuna.util.getFirstProperty(kahuna.meta.allTables);
							rel.role_to_child = (rel.role_to_child + '_' + genRoleToParent(rel.parentEntity));
							rel.modified = true;
						}

						ensureColArrays(rel);
					}

					if (data.length > 0) {
						// select the first one in the list, and fill in the list of table columns for both the parent and child
						$scope.rels.currentRelationship = data[0];
						var curRel = $scope.rels.currentRelationship;
					}
					else {
						$scope.rels.currentRelationship = null;
					}
				});
			});
		};

		function ensureColArrays(rel) {
			rel.childColsArray = rel.childColsArray ? rel.childColsArray : rel.child_columns.split(',');
			rel.parentColsArray = rel.parentColsArray ? rel.parentColsArray : rel.parent_columns.split(',');
		}


		$scope.displayCurrentRelationship = function displayCurrentRelationship() {
			var curRel = $scope.rels.currentRelationship;
			ensureColArrays(curRel);
		};


		function genToChildrenRoleName(tab) {
			return tab.prefix + '_' + tab.entity + '_List';
		}

		function genToParentRoleName(tab) {
			return tab.prefix + '_' + tab.entity + '_Parent';
		}

		$rootScope.createdRelationship = null;

		$scope.rels.createRelationship = function createRelationship(table, type, relatedTable) {
			// set default tables
			var firstTableName = $scope.rels.tables[0];
			var secondTableName = $scope.rels.tables[Math.min(1, $scope.rels.tables.length - 1)];

			// update table references if called from broadcast events
			if (type && table && relatedTable) {
				if (type == 'parent') {
					secondTableName = table.name;
					firstTableName = relatedTable.name;
				}
				if (type == 'child') {
					firstTableName = table.name;
					secondTableName = relatedTable.name;
				}
			}

			var firstTable = kahuna.meta.allTables[firstTableName];
			var secondTable = kahuna.meta.allTables[secondTableName];
			var newRel = {
				name: 'Between ' + firstTableName + ' and ' + secondTableName,
				parent_entity_name: firstTableName,
				child_entity_name: secondTableName,
				role_to_child: genToChildrenRoleName(secondTable),
				role_to_parent: genToParentRoleName(firstTable),
				parent_columns: firstTable.columns[0].name,
				child_columns: secondTable.columns[0].name,
				update_rule:'R',
				delete_rule:'R',
				project_ident: $scope.currentProject.ident
			};

			if (type && table) {
				newRel.name = 'New Resource Relationship ' + newRel.name;
			}

			KahunaData.create('admin:relationships', newRel, function (data) {
				$scope.$evalAsync(function () {
					var inserted = kahuna.util.findInTxSummary(data.txsummary, 'admin:relationships', 'INSERT');
					for (var idx = 0; idx < inserted.length; ++idx) {
						var modObj = inserted[idx];
						modObj.modified = false;
						modObj.parentEntity = firstTable;
						modObj.childEntity = secondTable;
						$scope.rels.relationships.push(modObj);
						$scope.rels.currentRelationship = modObj;

						$rootScope.createdRelationship = angular.copy(modObj);
						console.log(modObj);
						ensureColArrays(modObj);
					}
					$scope.rels.saveRelationship(false);
				});
				$rootScope.reloadSchema();
			});
		};

		// Update
		$scope.rels.saveRelationship = function saveRelationship(notifySaveStatusBoolean) {
			if (angular.isUndefined(notifySaveStatusBoolean)) {notifySaveStatusBoolean=true;}
			// currentRelationship.parent_columns && currentRelationship.child_columns are arrays;
			// they need to be persisted as comma separated strings
			var currel = $scope.rels.currentRelationship;
			currel.parent_columns = currel.parentColsArray.join(',');
			currel.child_columns = currel.childColsArray.join(',');

			var saveobj = kahuna.util.cloneObject(currel);
			delete saveobj.parentColsArray;
			delete saveobj.childColsArray;
			delete saveobj.parentEntity;
			delete saveobj.childEntity;
			delete saveobj.modified;

			KahunaData.update(saveobj, function (data) {
				$scope.$evalAsync(function () {

					var updated = kahuna.util.findInTxSummary(data.txsummary, 'admin:relationships', 'UPDATE');

					if (1 == updated.length) {
						var modObj = updated[0];
						currel["@metadata"] = modObj["@metadata"];
						currel["ts"] = modObj["ts"];
						currel.modified = false;

						kahuna.applyFunctionInScope($scope, function () { $scope.displayCurrentRelationship(); });
						if (notifySaveStatusBoolean) {kahuna.util.info('Relationship was saved');}
						angular.forEach($scope.dbaseSchemas, function (element, index) {
							$scope.reloadSchema(element);
						});
						 $scope.reloadSchema($scope.data.currentDbaseSchema);
					}
					else if (0 == updated.length) {
						if (notifySaveStatusBoolean) {kahuna.util.info('Relationship saved, but unchanged');}
					}
					else {
						throw "Save Failure - more than one updated";
					}
					$scope.$broadcast('RefreshRelationships')
				});
			});
		};

		$scope.$on('RefreshRelationships', function () {
			// IE is not digesting changes for elements hidden during the first controller digest
			// here we grab the scope, push an empty object, digest, and then pop it off, forcing the IE DOM to refresh
			var ua = window.navigator.userAgent;
			var msie = ua.indexOf('MSIE ');
			var trident = ua.indexOf('Trident/');
			if (msie > 0 || trident > 0 || true) {
				$scope.rels.relationships.push({});
				var scope = angular.element('#relationships-select').scope();
				scope.$evalAsync(function () {
					$timeout(function () {
						$scope.rels.relationships.pop();
						if (angular.isUndefined($scope.rels.currentRelationship.name)) {
							$scope.rels.currentRelationship = null;
						}
					}, 1000);
				});
			}
		});

		// Delete
		$scope.rels.deleteRelationship = function deleteRelationship(relationship) {
			var relName = relationship.name;
			var relIdent = relationship.ident;
			if ( ! confirm('Delete relationship ' + relName + '(' + relIdent + ') ?')) {
				return;
			}

			KahunaData.remove(relationship, function (data) {
				// modifying scope variables outside of a digest cycle
				$scope.$evalAsync(function () {
					var deleted = kahuna.util.findInTxSummary(data.txsummary, 'DELETE');

					var relarray = $scope.rels.relationships;
					for (var idx = 0; idx < relarray.length; ++idx) {
						if (relIdent === relarray[idx].ident) {
							relarray.splice(idx, 1);
							if (0 == relarray.length) {
								$scope.rels.currentRelationship = null;
							}
							else {
								if (idx >= relarray.length) {
									idx = relarray.length - 1;
								}
								$scope.rels.currentRelationship = relarray[idx];
							}
						break;
						}
					}
					kahuna.util.info('Relationship ' + relName + '(' + relIdent + ') was deleted');
					angular.forEach($scope.dbaseSchemas, function (element, index) {
						$scope.reloadSchema(element);
					});

					$scope.$broadcast('RefreshRelationships')
				});
			});
		};

		// Sequences tab
		$scope.showSequences = function showSequences() {
			kahuna.fetchData(kahuna.baseUrl + "@tables/*?projectId=" + $scope.currentProject.ident,
				null,
				function fetchData_showSequences_tables_success(tbls) {
					var allTables = {};
					for (var j = 0; j < tbls.length; j++) {
						var theTable = tbls[j];
						if (theTable.prefix == $scope.data.currentDbaseSchema.prefix) {
							allTables[theTable.entity] = theTable;
							for (var k = theTable.columns.length - 1; k >= 0 ; k--) {
								if ('number' !== theTable.columns[k].generic_type) {
									theTable.columns.splice(k, 1);
								}
							}
						}
					}

					kahuna.setInScope($scope, "allTables", allTables);
					kahuna.fetchData(kahuna.baseUrl + "@sequences?projectId=" + $scope.currentProject.ident,
						null,
						function fetchdata_showSequences_sequences_success(allSequenceData) {
							var allSeqs = [];
							for (var prefix in allSequenceData) {
								if (prefix === $scope.data.currentDbaseSchema.prefix) {
									allSeqs = allSequenceData[prefix];
									break;
								}
							}
							kahuna.setInScope($scope, "allSequences", allSeqs);
							kahuna.fetchData(kahuna.baseUrl + "admin:table_infos",
								{
									sysfilter: "equal(dbaseschema_ident:" + $scope.data.currentDbaseSchema.ident + ")"
								},
								function fetchData_showSequences_table_infos_success(tblInfos) {
									var tableSequences = {};
									// First put in all the table_infos that already exist
									for (var i = 0; i < tblInfos.length; i++) {
										var seqName = null;
										var seqInfo = tblInfos[i].sequence_info;
										var colName = seqInfo;
										if (seqInfo) {
											var eqIdx = seqInfo.indexOf("=");
											if (eqIdx > 0) {
												colName = seqInfo.substring(0, eqIdx);
												seqName = seqInfo.substring(eqIdx + 1);
											}
										}

										delete tblInfos[i]['@metadata'].links

										// this is a simple table_name ie., entity_name without prefix
										tableSequences[tblInfos[i].table_name] = {
											tblInfo: tblInfos[i],
											seqName: seqName,
											colName: colName
										};
									}

									// Now add entries for all the tables for which there is no table_infos.
									for (entityName in allTables) {
										var thisTable = allTables[entityName];
										if (!tableSequences[thisTable.entity]) {
											tableSequences[thisTable.entity] = {};
										}
									}
									kahuna.setInScope($scope, "tableSequences", tableSequences);
								}
							);
						}
					);
				}
			);
		};

		$scope.seqColumnSelected = function seqColumnSelected(d) {
			if (!d.tblSequence.colName) {
				d.tblSequence.seqName = null;
			}
		};

		$scope.saveSequences = function saveSequences() {
			$scope.data.disableSaveSequencesButton = true;
			$timeout(saveSequencesWorker, 0);
		}

		function saveSequencesWorker() {
			var tblName, tblSeq, seqInfo, newTblInfo;
			var deleteCount = 0, updateCount = 0, insertCount = 0;
			var updateInsertTableInfos = [];
			for (tblName in $scope.tableSequences) {
				tblSeq = $scope.tableSequences[tblName];
				seqInfo = tblSeq.colName;
				if (tblSeq.colName && tblSeq.seqName) {
					seqInfo += "=" + tblSeq.seqName;
				}
				if (tblSeq.tblInfo) {
					if (!seqInfo) {
						// need to delete
						tblSeq.tblInfo['@metadata'].action = 'DELETE';
						updateInsertTableInfos.push(tblSeq.tblInfo);
						++deleteCount;
					}
					else if (seqInfo != tblSeq.tblInfo.sequence_info) {
						// need to update it if necessary
						tblSeq.tblInfo['@metadata'].action = 'UPDATE';
						tblSeq.tblInfo.sequence_info = seqInfo;
						tblSeq.tblInfo.ts = null;
						updateInsertTableInfos.push(tblSeq.tblInfo);
						++updateCount;
					}
				}
				else {
					if (seqInfo) {
						newTblInfo = {
							'@metadata': {
								action: 'INSERT',
								href: kahuna.baseUrl + 'admin:table_infos'
							},
							sequence_info: seqInfo,
							table_name: tblName,
							dbaseschema_ident: $scope.data.currentDbaseSchema.ident
						};
						updateInsertTableInfos.push(newTblInfo);
						++insertCount;
					}
				}
			}


			function mergeTblInfos(tblInfos) {
				var i, tableName, entry, seqInfo;
				for (i = 0; i < tblInfos.length; i++) {
					// Merge the results
					if (tblInfos[i]['@metadata'].resource !== 'admin:table_infos') {
						continue;
					}
					changed = true;
					tableName = tblInfos[i].table_name;
					entry = $scope.tableSequences[tableName];
					if (!entry) {
						entry = {};
						$scope.tableSequences[tableName] = entry;
					}
					if ('DELETE' == tblInfos[i]['@metadata'].verb) {
						entry.tblInfo = null;
					}
					else {
						entry.tblInfo = tblInfos[i];
						delete entry.tblInfo['@metadata'].links;
						delete entry.tblInfo['@metadata'].verb;
						seqInfo = entry.tblInfo.sequence_info;
						if (seqInfo) {
							var eqIdx = seqInfo.indexOf("=");
							if (eqIdx > 0) {
								entry.colName = seqInfo.substring(0, eqIdx);
								entry.seqName = seqInfo.substring(eqIdx + 1);
							}
							else {
								entry.colName = seqInfo;
								entry.seqName = null;
							}
						}
						else {
							entry.colName = null;
							entry.seqName = null;
						}
					}
				}
				$scope.data.sequenceChanged = false;
			}

			if (updateInsertTableInfos.length > 0) {
				var msg = 'Saving';

				if (insertCount == 1) {
					msg += ' 1 insert';
				}
				else if (insertCount > 1) {
					msg += ' ' + insertCount + ' inserts';
				}

				if (updateCount == 1) {
					msg += ' 1 update';
				}
				else if (updateCount > 1) {
					msg += ' ' + updateCount + ' updates';
				}

				if (deleteCount == 1) {
					msg += ' 1 delete';
				}
				else if (deleteCount > 1) {
					msg += ' ' + deleteCount + ' deletes';
				}

				kahuna.util.info(msg);

				$scope.data.currentDbaseSchema.active = false;

				// force a db rescan
				updateInsertTableInfos.push({
					'@metadata': {
						href: $scope.data.currentDbaseSchema['@metadata'].href,
						checksum: 'override'
						},
					status: 'R'
					}
				);

				function dbscanFeedback(msg) {
					if (msg != $scope.data.scanMessage) {
						$scope.data.scanMessage = msg;
						$scope.data.scanMessageSuffix = '';
					}
					else {
						$scope.data.scanMessageSuffix += '.';
					}
				}

				$scope.data.scanMessage = 'Waiting';
				$scope.data.scanInProgress = true;

				$scope.scanStatus($scope.data.currentDbaseSchema.project_ident, dbscanFeedback);

				KahunaData.update(updateInsertTableInfos,
					function update_success_saveSequences(data) {
						mergeTblInfos(data.txsummary);
						kahuna.util.info('Save complete');
						$scope.data.disableSaveSequencesButton = false;
						$scope.data.scanInProgress = false;
					},
					function update_failure_saveSequences(data, status, href) {
						kahuna.util.error(data);
						$scope.data.disableSaveSequencesButton = false;
						$scope.data.scanInProgress = false;
					}
				);
			}
			else {
				kahuna.util.info('No sequence changes to save');
				$scope.data.disableSaveSequencesButton = false;
				$scope.data.sequenceChanged = false;
				$scope.data.scanInProgress = false;
			}
		};

		$scope.scanStatus = function scanStatus(projectIdent, statusFunction) {
			statusFunction = statusFunction || function consoleStatusFunction(msg) { console.log(msg); };
			var url = kahuna.baseUrl + '@database_test';
			var config = {
				cache : false,
				timeout : 60 * 1000,
				headers : {
					"Authorization" : "CALiveAPICreator " + kahuna.globals.apiKeyValue + ":1"
				}
			};

			var pollInfo = {
				pollMs: 500,
				pollLimit : 10 * 60,
				fetchMeta: null,
				messageSeen: false,
				connectLimit: 20,
			};

			$timeout(pollStatus, pollInfo.pollMs);

			function pollStatus() {
				$http.post(url, { statusRequest: projectIdent }, config)
					.success(
						function post_pollStatus_success(testResults, status) {
							var i, allComplete = true, msg;

							function getmsg(testResults, status) {
								if (testResults.status && 0 === testResults.status.indexOf("No message from server")) {
									if (pollInfo.messageSeen) {
										return 'Scan complete';
									}
									pollInfo.connectLimit--;
									if (pollInfo.connectLimit < 0) {
										return 'Scan complete';
									}
									return 'Waiting';
								}
								else {
									pollInfo.messageSeen = true;
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

							statusFunction(msg);

							pollInfo.pollLimit -= 1;
							if (allComplete) {
								pollInfo.pollLimit = 0;
							}

							if (pollInfo.pollLimit > 0) {
								$timeout(pollStatus, pollInfo.pollMs);
							}
							else {
								statusFunction('Scan complete');
							}
						}
					)
					.error(
						function post_pollStatus_error(errorData, status) {
							statusFunction(errorData);
							statusFunction('Scan complete');
							kahuna.util.error(errorData);
						}
					);
			}
		};

		///////////////////////////////////////////////////////////////////////
		// Non-persistent attributes

		$scope.npAtts = {};
		$scope.npAtts.tables = [];

		$scope.npAtts.loadTables = function npAtts_loadTables() {
			$scope.npAtts.tables = [];
			if ( ! $scope.data.currentDbaseSchema) {
				console.log("Still no $scope.data.currentDbaseSchema... Cannot load tables.");
				return;
			}
			for (var tbl in kahuna.meta.listOfTables) {
				if (kahuna.meta.listOfTables[tbl].prefix == $scope.data.currentDbaseSchema.prefix) {
					$scope.npAtts.tables.push(kahuna.meta.listOfTables[tbl].entity);
				}
			}
		};

		$timeout(function () {
			if ( ! $scope.data.currentDbaseSchema) {
				console.log("No data.currentDbaseSchema yet...");
				$timeout($scope.npAtts.loadTables, 500);
			}
			else {
				$scope.npAtts.loadTables();
			}
		}, 250);

		$scope.npAtts.fetchNPAtts = function npAtts_fetchNPAtts() {
			kahuna.fetchData(kahuna.baseUrl + "admin:np_attributes",
				{
					sysfilter: "equal(dbaseschema_ident:" + $scope.data.currentDbaseSchema.ident + ")",
					sysorder: "(table_name, attr_name)"
				},
				function fetchData_showNPAtts_success(resp) {
					$scope.npAtts.atts = resp;
					if (resp.length) {
						$scope.npAtts.currentAtt = resp[0];
					}
				}
			);
		}

		$scope.npAtts.npAttSelected = function npAtts_npAttSelected() {
		}

		$scope.npAtts.saveNPAtt = function npAtts_saveNPAtt() {
			KahunaData.update($scope.npAtts.currentAtt, function (data) {
				$scope.$evalAsync(function () {
					$scope.npAtts.npaChanged = true;
					var updated = kahuna.util.findInTxSummary(data.txsummary, 'admin:np_attributes', 'UPDATE');

					if (1 == updated.length) {
						var modObj = updated[0];
						$scope.npAtts.currentAtt["@metadata"] = modObj["@metadata"];
						$scope.npAtts.currentAtt["ts"] = modObj["ts"];
						kahuna.util.info('Attribute ' + $scope.npAtts.currentAtt.attr_name + ' was saved');
					}
					else if (0 == updated.length) {
						kahuna.util.info('Attribute saved, but unchanged');
					}
					else {
						throw "Save Failure - more than one updated";
					}
				});
			});
		};

		$scope.npAtts.createNPAttribute = function createNPAtt() {
			if ( ! $scope.npAtts.tables || $scope.npAtts.tables.length == 0) {
				alert('Cannot create a non-persistent attribute because there are no tables defined. Please verify your data source.');
				return;
			}
			KahunaData.create('np_attributes', {
					attr_name: "attribute",
					table_name: $scope.npAtts.tables[0],
					data_type: 3,
					dbaseschema_ident: $scope.data.currentDbaseSchema.ident
					},
				function (data) {
					$scope.npAtts.npaChanged = true;
					var newAtt = null;
					var inserted = kahuna.util.findInTxSummary(data.txsummary, 'admin:np_attributes', 'INSERT');
					for (var idx = 0;  idx < inserted.length; ++idx) {
						var modObj = inserted[idx];
						kahuna.applyFunctionInScope($scope, function () {
							$scope.npAtts.atts.push(modObj);
							$scope.npAtts.currentAtt = modObj;
						});
					}
					kahuna.util.info('Attribute was created');
				});
		};

		$scope.npAtts.deleteNPAttribute = function deleteNPAttribute() {
			if ( ! $scope.npAtts.currentAtt) {
				return;
			}
			if ( ! confirm('Delete attribute ' + $scope.npAtts.currentAtt.attr_name + ' ?')) {
				return;
			}
			KahunaData.remove($scope.npAtts.currentAtt, function (data) {
				var idx = $scope.npAtts.atts.indexOf($scope.npAtts.currentAtt);
				kahuna.applyFunctionInScope($scope, function () {
					$scope.npAtts.npaChanged = true;

					$scope.npAtts.atts.splice(idx, 1);
					if (idx > 0) {
						$scope.npAtts.currentAtt = $scope.npAtts.atts[idx - 1];
					}
					else if ($scope.npAtts.atts.length > 0) {
						$scope.npAtts.currentAtt = $scope.npAtts.atts[0];
					}
					else {
						$scope.npAtts.currentAtt = null;
					}
					kahuna.util.info('Attribute was deleted');
				});
			});
		};

		$scope.npAtts.getTypeName = function getTypeName(n) {
			if ((typeof n) == 'string') {
				n = parseInt(n);
			}
			switch (n) {
			case 1: return "Character";
			case 3: return "Decimal";
			case 4: return "Integer";
			case 7: return "Real";
			case 12: return "String";
			case 16: return "Boolean";
			case 91: return "Date";
			case 93: return "Timestamp";
			default:
				console.log("Unknown data type: [" + n + "]");
				console.log("Of type: " + (typeof n));
				return "Unknown";
			}
		}
		
		$scope.npAtts.reloadSchemaIfNeeded = function() {
			console.log("NP Att changed - reloading schema");
			if ( ! $scope.npAtts.npaChanged) {
				return;
			}
			alert("The non-persistent attributes have changed, so the database schema will now be reloaded.");
			$scope.npAtts.npaChanged = false;
			$scope.reloadSchema($scope.data.currentDbaseSchema);
		};
		
		$scope.$on('$locationChangeStart', $scope.npAtts.reloadSchemaIfNeeded);
	}
};
