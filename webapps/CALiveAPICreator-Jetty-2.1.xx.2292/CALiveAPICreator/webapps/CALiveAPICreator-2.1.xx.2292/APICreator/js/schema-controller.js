/*global kahuna */
kahuna.schema = {
	SchemaCtrl : function ($scope, $rootScope, $http, $location, $resource, $routeParams, KahunaData) {
		"use strict";
		$rootScope.currentPage = 'schema';
		$rootScope.currentPageHelp = 'docs/logic-designer/database';
		$rootScope.helpDialog('schema', 'Help', localStorage['eslo-ld-learn-complete']);

		$scope.columnClass = function (col) {
			if ( ! col.persistent) {
				return "NonPersistentColumn";
			}
			return col.nullable ? "NullableColumn" : "NonNullColumn";
		};

		$scope.tables = {};
		$scope.tables.columnSelected = function schemactrl_tables_columnSelected(col) {
			return col === $scope.tables.selectedColumn ? " selected='true' " : "";
		};

		$scope.refreshOptionTitles = function refreshOptionTitles() {
			$scope.$evalAsync(function () {
				var $options = angular.element('option');

				angular.forEach($options, function (element) {
					var $element = angular.element(element);
					var text = $element.html();

					$element.attr('title', text);
				});
			});
		};

		$scope.$watch('tables.selected', function watch_schemactrl_tables_selected(current, previous) {
			$scope.refreshOptionTitles();
		});

		$scope.tables.selectedAction = function schemactrl_tables_selectedAction(evt) {
			if (!$scope.tables.selected) {
				console.log('Schema: no tables, emptying everything');
				$scope.tables.selectedFull = null;
				$scope.tables.cols = {};
				$scope.tables.pkCols = {};
				$scope.tables.fkCols = {};
				$scope.tables.keys = {};
				$scope.tables.currentRules = {};
				return;
			}
			KahunaData.getMeta($scope.tables.selected['@metadata'].href, function (data2) {
				$scope.tables.selectedFull = data2;
				$scope.tables.selectedColumn = kahuna.util.getFirstProperty(data2.columns);
				$scope.tables.selectedParentRole = kahuna.util.getFirstProperty(data2.parents);
				$scope.tables.selectedChildRole = kahuna.util.getFirstProperty(data2.children);

				// Create a dictionary of all the columns
				$scope.tables.cols = kahuna.util.convertToMap(data2.columns, "name");
				kahuna.util.applyFunctionToElements($scope.tables.cols, function (col) { col.comment = ""; });

				$scope.tables.pkCols = {};
				if (data2.primaryKeyColumns) {
					_.each(data2.primaryKeyColumns, function (pkColName) {
						$scope.tables.pkCols[pkColName] = $scope.tables.cols[pkColName];
					});
					kahuna.util.applyFunctionToElements($scope.tables.pkCols, function (pkcol) {
						$scope.tables.cols[pkcol.name].comment += " (PK)";
					});
				}

				$scope.tables.fkCols = {};
				if (data2.parents) {
					for (var i = 0; i < data2.parents.length; i++) {
						var parent = data2.parents[i];
						for (var j = 0; j < parent.child_columns.length; j++) {
							var fkCol = parent.child_columns[j];
							$scope.tables.cols[fkCol].comment += " (FK " + parent.name + "->" + parent.parent_table + "." + parent.parent_columns[j] + ")";
							$scope.tables.fkCols[fkCol] = {
								fkName : parent.name,
								parentTable : parent.parent_table,
								parentCol : parent.parent_columns[j]
							};
						}
					}
				}

				KahunaData.query('AllRules', {
					sysfilter: "equal(entity_name:'" + $scope.tables.selectedFull.name + "'," +
							"project_ident:" + $scope.currentProject.ident + ")"
				}, function (data3) {
					kahuna.util.applyFunctionToElements(data3, function (o) { o.name = o.name || o.auto_name; });
					kahuna.applyFunctionInScope($scope, function () {
						$scope.tables.currentRules = data3.length ? data3 : null;
						$scope.tables.selectedRule = kahuna.util.getFirstProperty(data3);
					});
				});

				$scope.tables.keys = data2.keys;
				$scope.tables.selectedKey = kahuna.util.getFirstProperty(data2.keys);
			});
		};

		$scope.views = {};
		$scope.views.selectedAction = function schemactrl_views_selectedAction(evt) {
			if (!$scope.views.selected)
				return;

			KahunaData.getMeta($scope.views.selected['@metadata'].href, function (viewInfo) {
				kahuna.applyFunctionInScope($scope, function (fun) {
					$scope.views.selectedFull = viewInfo;
					$scope.views.selectedColumn = kahuna.util.getFirstProperty(viewInfo.columns);
					$scope.views.cols = kahuna.util.convertToMap(viewInfo.columns, "name");
				});
			});
		};

		$scope.procedures = {};
		$scope.procedures.selectedAction = function schemactrl_procedures_selectedAction(evt) {
			if (!$scope.procedures.selected) {
				return;
			}

			KahunaData.getMeta($scope.procedures.selected['@metadata'].href, function (procInfo) {
				kahuna.applyFunctionInScope($scope, function () {
					$scope.procedures.selectedFull = procInfo;
				});
			});
		};

		//////////////////////////////////////////////////////////////////
		// Get everything going
		$scope.showAllMetadata = function schemactrl_showAllMetadata() {
			$scope.tables.thelist = kahuna.util.convertToArray(kahuna.meta.allTables);
			$scope.tables.thelist.sort(function (a, b) { return kahuna.util.caseInsensitiveSort(a, b, "name"); });
			$scope.tables.selected = kahuna.util.getFirstProperty($scope.tables.thelist);
			$scope.tables.selectedAction();

			$scope.views.thelist = kahuna.util.convertToArray(kahuna.meta.allViews);
			$scope.views.thelist.sort(function (a, b) { return kahuna.util.caseInsensitiveSort(a, b, "name"); });
			$scope.views.selected = kahuna.util.getFirstProperty($scope.views.thelist);
			$scope.views.selectedAction();

			$scope.procedures.thelist = kahuna.util.convertToArray(kahuna.meta.allProcedures);
			$scope.procedures.thelist.sort(function (a, b) { return kahuna.util.caseInsensitiveSort(a, b, "name"); });
			$scope.procedures.selected = kahuna.util.getFirstProperty($scope.procedures.thelist);
			$scope.procedures.selectedAction();
		};

		$scope.$on('tablesLoaded', function on_schemactrl_tablesLoaded(current, previous) {
			console.log('Tables reloaded');
			kahuna.applyFunctionInScope($scope, function () { $scope.showAllMetadata(); });
		});

		/////////////////////////////////////////////////////////////////
		// If there is no metadata yet, fetch it before showing it

		if ($rootScope.schemaLoadingStatus == null && ( ! kahuna.meta.allTables || kahuna.meta.allTables.length == 0)) {
			$rootScope.schemaLoadingStatus = "Loading tables...";
			kahuna.meta.getAllTables($scope.currentProject, function () {
				$rootScope.schemaLoadingStatus = "Loading views...";
				kahuna.meta.getAllViews($scope.currentProject, function () {
					$rootScope.schemaLoadingStatus = "Loading procedures...";
					kahuna.meta.getAllProcedures($scope.currentProject, function () {
						$rootScope.schemaLoadingStatus = null;
						$scope.showAllMetadata();
					}, function errorLoadingProcs(data) {
						$rootScope.schemaLoadingStatus = null;
						kahuna.util.error("Error loading procedures: " + JSON.stringify(data));
					});
				}, function errorLoadingViews(data) {
					$rootScope.schemaLoadingStatus = null;
					kahuna.util.error("Error loading views: " + JSON.stringify(data));
				});
			}, function errorLoadingTables(data) {
				$rootScope.schemaLoadingStatus = null;
				kahuna.util.error("Error loading tables: " + JSON.stringify(data));
			});
		}
		else {
			$scope.showAllMetadata();
		}
	}
};
