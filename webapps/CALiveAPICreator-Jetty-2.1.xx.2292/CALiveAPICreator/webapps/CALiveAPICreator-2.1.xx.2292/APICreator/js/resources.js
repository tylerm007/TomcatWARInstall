var kahuna;
kahuna.resource = {
	allResources: {},
	topResources: [],
	scope: null,
	// codeMirror: null,
	aceEditor: null,

	// recently added or attempted names.  we won't try these again, even it they may not exist
	recentlyAttemptedNames: [],

	ResourcesCtrl: function ($rootScope, $scope, $http, $resource, $routeParams, $location, jqueryUI, KahunaData, $timeout, $modal, $q) {

		$rootScope.currentPage = 'resources';
		$rootScope.currentPageHelp = 'docs/logic-designer/rest-resources';

		// we need to hang on to this, as $rootScope.currentProject may change before we are thrown away (ie, saving gui etc)
		$scope.currentProject = $rootScope.currentProject;
		$scope.data = {};
		$scope.active = {};
		$scope.data.activeTabs = [true, false, false, false, false];

		$('.ResizableTd').resizable({
			handles: 'e',
			minWidth: 40
		});

		// Read all GUI settings, and initialize them if we haven't seen them before
		kahuna.readGuiSettings($scope.currentProject);
		$scope.data.resourcesListWidth = 250;
		$scope.data.subresourcesListWidth = 250;
		// $scope.data.resourcesListWidth = kahuna.getGuiSetting($scope.currentProject, 'resourcesListWidth', 200);
		// $scope.data.subresourcesListWidth = kahuna.getGuiSetting($scope.currentProject, 'subresourcesListWidth', 200);

		// Save all GUI settings before navigating away
		$scope.$on('$destroy', function () {
			var project = $scope.currentProject;
			kahuna.deleteGuiSetting(project);
			kahuna.storeGuiSetting(project, 'resource', 'resourcesListWidth', $("#resourcesListTd").width());
			kahuna.storeGuiSetting(project, 'resource', 'subresourcesListWidth', $("#subresourcesListTd").width());
			kahuna.saveGuiSettings(project);
		});

		// This has to be delayed because the CodeMirror box is in a tab that does not get rendered right away.
		setTimeout(function () {
			// var boxElem = document.getElementById('jsonTextBox');
			// if ( ! boxElem)
			//   return;
			// kahuna.resource.codeMirror = CodeMirror(boxElem, {
			//   mode:  "javascript",
			//   lineNumbers: true,
			//   lineWrapping: true
			// });
			// kahuna.resource.aceEditor = ace.edit("jsonTextBox");
			// kahuna.resource.aceEditor.setTheme("ace/theme/xcode");
			// kahuna.resource.aceEditor.getSession().setMode("ace/mode/json");

			kahuna.resource.sqlEditor = ace.edit("sqlTextBox");
			kahuna.resource.sqlEditor.setTheme("ace/theme/xcode");
			kahuna.resource.sqlEditor.getSession().setMode("ace/mode/sql");
			kahuna.resource.sqlEditor.setOptions({
				fontFamily: "monospace",
				fontSize: kahuna.globals.aceEditorFontSize
			});
			if ($scope.selectedResource) {
				kahuna.resource.sqlEditor.setValue($scope.selectedResource.code_text || "");
				kahuna.resource.sqlEditor.getSession().getSelection().moveCursorFileStart();
			}

			kahuna.resource.filterEditor = ace.edit("filterJSCode");
			kahuna.resource.filterEditor.setTheme("ace/theme/xcode");
			kahuna.resource.filterEditor.getSession().setMode("ace/mode/javascript");
			kahuna.resource.filterEditor.setOptions({
				fontFamily: "monospace",
				fontSize: kahuna.globals.aceEditorFontSize
			});
			if ($scope.data.selectedSubResource) {
				kahuna.resource.filterEditor.setValue($scope.data.selectedSubResource.filter_code || "");
				kahuna.resource.filterEditor.getSession().getSelection().moveCursorFileStart();
			}
		}, 2000);

		kahuna.resource.scope = $scope;
		// if ($routeParams.projectId)
		//     $scope.currentProject = kahuna.globals.projects[$routeParams.projectId];

		function putInScope(name, value) {
			if (kahuna.resource.scope.$$phase) {
				if (name.indexOf('.') > 0) {
					var parts = name.split('.');
					kahuna.resource.scope[parts[0]][parts[1]] = value;
				}
				else {
					kahuna.resource.scope[name] = value;
				}
			}
			else {
				kahuna.resource.scope.$apply(function () {
					if (name.indexOf('.') > 0) {
						var parts = name.split('.');
						kahuna.resource.scope[parts[0]][parts[1]] = value;
					}
					else {
						kahuna.resource.scope[name] = value;
					}
				});
			}
		}

		// $scope.allTablesList = kahuna.util.convertToArray(kahuna.meta.allTables);
		$scope.data.selectedSubResourceTable = null;
		$scope.allTablesList = kahuna.meta.listOfTables;
		$scope.allTablesList.sort(function (a, b) {
			return kahuna.util.caseInsensitiveSort(a, b, "name");
		});

		// Make a list of all active prefixes
		$scope.allDbPrefixes = [];
		kahuna.meta.getAllSchemas($scope.currentProject, function (data) {
			for (var i = 0; i < kahuna.meta.allSchemas.length; i++) {
				var sch = kahuna.meta.allSchemas[i];
				if (sch.active) {
					$scope.allDbPrefixes.push(sch.prefix);
				}
			}
			$scope.allDbPrefixes.sort(kahuna.util.caseInsensitiveSort);
		});

		function sortTopResources() {
			kahuna.resource.topResources.sort(function (a, b) {
				return kahuna.util.caseInsensitiveSort(a, b, "name");
			});
		}

		$scope.toggleNestedNodes = function toggleNestedNodes(resource) {
			if (resource.root_ident == null) {
				$('.resource-root-' + resource.ident).toggleClass('hide');
				$('.resource-root-caret-' + resource.ident).toggleClass('fa-caret-down').toggleClass('fa-caret-right');
				$('.resource-node').children().removeClass('active');
				$('.resource-ident-' + resource.ident).addClass('active');
			}
			else {
				$('.resource-root-' + resource.root_ident).removeClass('hide');
				$('.resource-root-caret-' + resource.root_ident).addClass('fa-caret-down').removeClass('fa-caret-right');
				$('.resource-node').children().removeClass('active');
				$('.resource-ident-' + resource.ident).addClass('active');
			}
		};

		$scope.generateResourceTree = function generateResourceTree(resArr) {
			$scope.resourceTree = {}; // template usable tree
			var resTree = {}; // raw tree for building nested sets
			var resSort = _.sortBy(resArr, 'ident'); // oldest resources must always contain the newest, so parents will be defined when looping through this array
			angular.forEach(resSort, function (resource, i) {
				index = resource.ident;
				resource.subResources = {};
				resTree[index] = resource;
			});
			angular.forEach(resSort, function (resource, i) {
				index = resource.ident;
				if (resource.container_ident && resource.ident != resource.root_ident) {
					resTree[resource.container_ident].subResources[index] = resTree[index];
				}
			});
			angular.forEach(resTree, function (resource, i) {
				if (resource.root_ident == null) {
					$scope.resourceTree[resource.ident] = resource;
				}
			});

		};

		// Get all the resources for the current API version
		// TODO - this could use the values in kahuna.meta.allResources to figure this out
		var loadAllResource = function () {
			var deferred = $q.defer();
			kahuna.resource.allResources = {};
			kahuna.resource.topResources = [];

			KahunaData.query('AllResources', {pagesize: 1000, sysfilter: 'equal(apiversion_ident:' + $scope.active.selectedApiVersion.ident + ')' }, function (data) {
				$scope.generateResourceTree(data);

				for (var i = 0; i < data.length; i++) {
					kahuna.resource.allResources[data[i].ident] = data[i];
					if ( ! data[i].container_ident) {
						// Keep track of top-level resources
						kahuna.resource.topResources.push(data[i]);
					}

					// AllResources has row event to create non-persistent attribute "entity_name" if regular resource
				}

				sortTopResources();
				$scope.allResources = kahuna.resource.topResources;
				if (kahuna.resource.topResources.length > 0) {
					var selResource = kahuna.resource.topResources[0];
					if ($routeParams.resourceId) {
						for (var i = 0; i < kahuna.resource.topResources.length; i++) {
							if (kahuna.resource.topResources[i].ident == $routeParams.resourceId) {
								selResource = kahuna.resource.topResources[i];
								break;
							}
						}
					}
					deferred.promise.then(function () {
						if (!$scope.selectedResource || ($scope.selectedResource.apiversion_ident != $scope.active.selectedApiVersion.ident)) {
							if (currentAction && currentAction.resource) {
								$scope.resourceSelected(currentAction.resource);
								subResourceSelected(currentAction.resource.ident);
								currentAction = undefined;
							}
							else {
								$scope.resourceSelected(selResource);
								subResourceSelected(selResource.ident);
							}
						}
					});
				}
				else {
					putInScope("selectedResource", null);
				}
				deferred.resolve(data);
			});

			return deferred.promise.then(function () {
				// failsafe, if no sub resource is selected after 500 ms, then select the current one in scope
				var previousSelectedSub = angular.copy($scope.data.selectedSubResource);
				$timeout(function () {
					if (!$('.resource-node .active').length) {
						if ($scope.data.selectedSubResource && $scope.data.selectedSubResource.ident) {
							$('.resource-ident-' + $scope.data.selectedSubResource.ident).click();
						}
						else {
							if (previousSelectedSub && previousSelectedSub.ident) {
								var resources = _.indexBy(kahuna.meta.allResources, 'ident');
								// if this wasn't just deleted, force the DOM to reflect the updated resource
								if (resources && angular.isDefined(resources[previousSelectedSub.ident])) {
									$('.resource-ident-' + previousSelectedSub.ident).click();
									$scope.data.selectedSubResource = previousSelectedSub;
								}
							}
						}
					}
				}, 500);
			});
		};

		function removeResource(resource) {
			delete kahuna.resource.allResources[resource.ident];
			for (var idx = 0; idx < kahuna.resource.topResources.length; idx += 1) {
				if (kahuna.resource.topResources[idx].ident === resource.ident) {
					kahuna.applyFunctionInScope($scope, function () {
						kahuna.resource.topResources.splice(idx, 1);
					});
					return;
				}
			}
		}

		// Find the resource attribute (if it exists) for the given column
		function getResourceAttributeForColumn(col) {
			if ( ! $scope.data.selectedSubResource || ! $scope.data.selectedSubResource.Attributes) {
				return;
			}
			for (var i = 0; i < $scope.data.selectedSubResource.Attributes.length; i++) {
				var attrib = $scope.data.selectedSubResource.Attributes[i];
				if (attrib.column_name === col.name) {
					return attrib;
				}
			}
			return null;
		}

		$scope.data.getColumnAliasIfAny = function getColumnAliasIfAny(col) {
			var theAtt = getResourceAttributeForColumn(col);
			if ( ! theAtt) {
				return "";
			}
			if (theAtt.name == col.name) {
				return "";
			}
			return " [<i>" + theAtt.name + "</i>]";
		};

		// When a new version of an attribute is received, put it in place
		function replaceResourceAttribute(att) {
			var res = kahuna.resource.allResources[att.resource_ident];
			var foundIdx = -1;
			for (var i = 0; i < res.Attributes.length; i++) {
				if (res.Attributes[i].column_name === att.column_name) {
					foundIdx = i;
					break;
				}
			}
			if (foundIdx >= 0) {
				res.Attributes[foundIdx] = att;
			}
			console.log(res);
		}

		$scope.updateAttribute = function (col) {
			// first check to see if the alias for the attribute has changed, if it has, assume UPDATE
			if (col && col['@metadata'] && col['@metadata'].action != 'DELETE') {
				_.each($scope.data.selectedSubResource.Attributes, function (attr, index) {
					if (attr.column_name === col.column_name) {
						if (col.name != attr.name) {
							col['@metadata'].action = 'UPDATE';
						}
					}
				});
			}
			if (col && col['@metadata'] && col['@metadata'].action != 'INSERT' && col['@metadata'].action != 'DELETE') {
				angular.forEach($scope.data.selectedSubResource.Attributes, function (attr, index) {
					if (attr.column_name == col.column_name) {
						attr['@metadata'].action = 'UPDATE';
						angular.forEach(attr, function (a, i) {
							if (i != '@metadata') {
								attr[i] = col[i];
							}
						});
						console.log(attr, col);
					}
				});
				console.log('status: update');
			}
		};

		function removeResourceAttribute(att) {
			var res = kahuna.resource.allResources[att.resource_ident];
			var foundIdx = -1;
			for (var i = 0; i < res.Attributes.length; i++) {
				if (res.Attributes[i].column_name === att.column_name) {
					foundIdx = i;
					break;
				}
			}
			if (foundIdx >= 0) {
				res.Attributes.splice(foundIdx, 1);
			}
		}

		$scope.apiVersionSelected = function () {
			loadAllResource();
		};

		$scope.getIsDefinedKeyPart = function (col) {
			var att = getResourceAttributeForColumn(col);
			return !!(att && att.is_defined_key_part);
		};

		// initializing function
		// TODO - rework to use kahuna.meta.allApiVersions
		KahunaData.query('admin:apiversions', {pagesize: 100, sysfilter: 'equal(project_ident:' + $rootScope.currentProject.ident + ')'}, function (data) {
			$scope.active.selectedApiVersion = null;
			if (0 === data.length) {
				return;
			}
			$scope.active.selectedApiVersion = data[data.length - 1];
			$scope.apiVersions = data;
			$scope.apiVersionSelected($scope.active.selectedApiVersion);
		});

		// Find the subresources of the given resource
		var findChildrenOfResource = function (parentIdent) {
			var children = [];
			for (var ident in kahuna.resource.allResources) {
				if ( ! kahuna.resource.allResources.hasOwnProperty(ident))
					continue;
				var resource = kahuna.resource.allResources[ident];
				if (resource.container_ident == parentIdent)
					children.push(resource);
			}
			return children;
		};

		// Get the class for a resizable column item. The item is the object whose class is being determined,
		// varName is the name of the variable for the current object.
		$scope.getItemClass = function (item, varName) {
			if (item == $scope[varName])
				return 'SelectedListItem';
			return 'UnselectedListItem';
		};

		function entityName(resource) {
			if (resource.prefix && resource.table_name) {
				return resource.prefix + ':' + resource.table_name;
			}
			return null;
		}

		function setEntityName(resource) {
			resource.entity_name = entityName(resource);
		}

		$scope.resourceSelected = _.throttle(function (resource) {
			if ($scope.selectedResource) {
				kahuna.meta.getTableDetails(entityName($scope.selectedResource), function (data) {
					if (data.columns) {
						for (var i = 0; i < data.columns.length; i++) {
							data.columns[i].checked = false;
						}
					}
				});
			}
			$scope.selectedResource = resource;
			// $scope.data.selectedSubResource = null;
			$scope.tableColumns = [];
			$scope.selectedColumn = null;
			$scope.resourceAttribute = null;
			$scope.showResAttribTable = {value: false};
		}, 3000);

		function inform(resource, msg) {
			kahuna.util.info('Resource ' + resource.name + '(' + resource.ident + ')' + (msg ? (' ' + msg) : ''));
		}

		// This gets called after an update to refresh the JSON objects
		var processUpdate = function (data, notifySaveStatusBoolean) {
			if (angular.isUndefined(notifySaveStatusBoolean)) { notifySaveStatusBoolean = true; }
			var updatedResource = null;
			var updatedAttribs = [];
			var attributesAffected = 0;
			for (var i = 0; i < data.txsummary.length; i++) {
				var modObj = data.txsummary[i];
				var metadata = modObj['@metadata'];
				switch (metadata.resource) {
				case 'AllResources':
					if (metadata.verb === 'UPDATE') {
						setEntityName(modObj);
						setEntityName($scope.data.selectedSubResource);
						updatedResource = modObj;
						updatedResource.Attributes = $scope.data.selectedSubResource.Attributes;
						console.log(updatedResource);
						if (notifySaveStatusBoolean) {
							inform(updatedResource, 'was saved');
						}
					}
					break;
				case 'AllResources.Attributes':
					attributesAffected++;
					switch (metadata.verb) {
					case 'DELETE':
						removeResourceAttribute(modObj);
						break;
					case 'UPDATE':
					case 'INSERT':
						// In case the resource itself was not updated
						replaceResourceAttribute(modObj);
						updatedAttribs.push(modObj);
						break;
					}
				}
			}

			if ( ! updatedResource && !attributesAffected) {
				if (notifySaveStatusBoolean) {
					kahuna.util.info('Nothing to save');
				}
				return;
			}

			if ( !updatedResource && attributesAffected) {
				if (notifySaveStatusBoolean) {
					kahuna.util.info( '' + attributesAffected + ' resource attribute(s) saved');
				}
				return;
			}

			for (var i = 0; i < updatedAttribs.length; i++) {
				replaceResourceAttribute(updatedAttribs[i]);
			}

			if ( ! updatedResource.entity_name) {
				alert('No entity_name!');
			}
			kahuna.resource.allResources[$scope.data.selectedSubResource.ident] = updatedResource;
			var idx = kahuna.resource.topResources.indexOf($scope.data.selectedSubResource);
			if (idx >= 0) {
				kahuna.resource.topResources[idx] = updatedResource;
				putInScope("selectedResource", updatedResource);
			}
			if (updatedResource.ident == $scope.data.selectedSubResource.ident) {
				putInScope("data.selectedSubResource", updatedResource);
			}
		};

		// checks givenName against names, recursively increments appended number until the name is available
		// optionally, givenName can be a resource object, if so, it will use container_ident or root_ident when available to prefix the name
		$scope.getUnusedName = function (names, givenName, index) {
			var prefix, name, prospectiveName;

			// set prefix (which provides the namespace scope for a resource) & the name
			if (angular.isObject(givenName)) {
				prefix = givenName.container_ident || givenName.root_ident;
				name = givenName.name;
			}
			else {
				prefix = '';
				name = givenName;
			}

			prospectiveName = angular.copy(name);

			if (angular.isDefined(index)) {
				prospectiveName = prospectiveName + index;
			}
			else {
				index = 0;
			}
			if (names.indexOf(prefix + prospectiveName) != -1) {
				 return $scope.getUnusedName(names, givenName, parseInt(index)+1);
			}
			else {
				return prospectiveName;
			}
		};

		// generating names only have to be unique in the context,
		// this is a useful array of names prefixed by container idents when present
		$scope.getContainerPrefixedResourceNames = function () {
			var names = [];
			_.each(kahuna.resource.allResources, function (element, index) {
				var name = element.name;
				if (element.container_ident) {
					name = element.container_ident + name;
				}
				names.push(name);
			});
			return names;
		};

		// Create a new top-level resource.
		$scope.createResource = function createResource(table, name) {
			var resourceType = 1;
			if ( ! $scope.active.selectedApiVersion) {
				alert("You cannot create a resource until you have created an API version.");
				return;
			}
			if ( ! kahuna.meta.getFirstTable()) {
				alert("You can only create a JavaScript resource until you have an active database.");
				resourceType = 3;
			}

			var firstTable;
			if (resourceType == 1) {
				firstTable = kahuna.meta.getFirstTable();
				if (table) {
					firstTable = kahuna.meta.allTables[table.name];
				}
			}
			else {
				firstTable = {entity: "None"};
			}
			var newResource = {
					resource_type_ident: resourceType,
					apiversion_ident: $scope.active.selectedApiVersion.ident,
					name: "NewResource",
					prefix: firstTable.prefix,
					table_name: firstTable.entity,
					is_collection: "Y"
			};

			if (name) {
				newResource.name = name;
			}

			newResource.name = $scope.getUnusedName($scope.getContainerPrefixedResourceNames(), "NewResource");

			KahunaData.create("AllResources", newResource, function (data) {
				if (data.txsummary[0]) {
					// this makes it useful
					kahuna.meta.allResources[data.txsummary[0].ident] = angular.copy(data.txsummary[0]);
					kahuna.meta.allResources[data.txsummary[0].ident].apiVersion = $scope.active.selectedApiVersion.name;
				}

				$scope.$evalAsync(function () {
					loadAllResource().then(function () {
						if (data.txsummary[0]) {
							var ident = data.txsummary[0].ident;
							$scope.subResourceSelected(ident);
							$scope.toggleNestedNodes($scope.resourceTree[ident]);

							setTimeout(function () {
								$("#resourceName").select();
								$("#resourceName").focus();
							}, 100);
						}
					});
				});
			});
		};

		$scope.$watch('data.selectedSubResource', function watch_data_selectedSubResource(current) {
			// used by the old tree, but the even may still be useful
		});

		$scope.deleteResource = function deleteResource() {
			if ( ! confirm("Are you sure you want to delete this resource (" + $scope.selectedResource.name +
					")? This will also delete all the resources it contains.")) {
				return;
			}
			KahunaData.remove($scope.selectedResource, function resource_remove_success(data) {
				$scope.$evalAsync(function () {
					loadAllResource();
				});
			});
		};

		$scope.isTableResource = function isTableResource() {
			return !!$scope.data.selectedSubResourceTable;
		};

		$scope.helpers = {};
		// does the actually sub resource heavy lifting
		$scope.helpers.createSubResource = function helperCreateSubResource(subResourceObj) {
			if ($scope.selectedResource.resource_type_ident == 2) {
				alert('You cannot create sub-resources for a resource of type "Free SQL"');
				return;
			}
			$scope.saveResource();
			setTimeout(function () {
				var rootIdent = $scope.data.selectedSubResource.root_ident;
				if (!rootIdent) {
					rootIdent = $scope.data.selectedSubResource.ident;
				}
				var firstTable = kahuna.meta.getFirstTable();
				var newResource = {
						apiversion_ident: $scope.active.selectedApiVersion.ident,
						resource_type_ident: 1,
						name: "NewChildResource",
						prefix: firstTable.prefix,
						table_name: firstTable.entity,
						is_collection: "Y",
						root_ident: rootIdent,
						container_ident: $scope.data.selectedSubResource.ident
					};
				if (angular.isDefined(subResourceObj)) {
					newResource = angular.extend(newResource, subResourceObj);
				}

				newResource.name = $scope.getUnusedName($scope.getContainerPrefixedResourceNames(), newResource);

				$scope.activeTab = 1;

				KahunaData.create("AllResources", newResource, function (data) {
					loadAllResource().then(function () {
						$timeout(function () {
							$('.resource-ident-' + data.txsummary[0].ident).click();
							$("#resourceName").select();
						}, 300);
					});
					return;
				});
			}, 250);
		};

		$scope.createSubResource = function createSubResource() {
			if (!$scope.data.selectedSubResource) {
				$scope.createResource();
				return;
			}

			if ($scope.isTableResource()) {
				var scope = $scope;
				var subResourceModal = $modal.open({
					templateUrl: 'partials/subResourceModal.html',
					controller: [
						'$modalInstance', 'resource', '$scope', 'table', '$location', '$rootScope', '$timeout',
						function ($modalInstance, resource, $scope, table, $location, $rootScope, $timeout) {
							table = kahuna.meta.allTables[table.name];
							KahunaData.query('AllResources', {pagesize: 1000, sysfilter: 'equal(apiversion_ident:' + scope.active.selectedApiVersion.ident + ')' }, function (data) {
								var resources = _.indexBy(data, 'ident');

								$scope.resource = resources[resource.ident];

								$scope.getRoleTable = function getRoleTable(role) {
									if (!role) {
										role = $scope.relationships.selected;
									}
									return role.child_table || role.parent_table;
								};
								$scope.getRoleType = function getRoleType(role) {
									if (!role) {
										role = $scope.relationships.selected;
									}
									if (role.child_table) { return 'Child'; }
									else { return 'Parent'; }
								};
								$scope.createRelationship = function createRelationship(roleType) {
									$location.path('/projects/' + $rootScope.currentProject.ident + '/databases');
									$scope.close();
									$timeout(function () {
										$rootScope.$emit('CreateRelationship', kahuna.meta.allTables[$scope.relationships.table], roleType, table);
									}, 1000);
								};
								$scope.showRelationshipButtons = function showRelationshipButtons() {
									$scope.isShown = !$scope.isShown;
								};

								// init relationships
								$scope.relationships = {};
								$scope.relationships.definitions = {};
								$scope.relationships.options = {};

								angular.forEach(table.children, function (element, index) {
									$scope.relationships.definitions['child_' + index] = element;
									$scope.relationships.options['child_' + index] = element.child_table + ' (as ' + element.name + ') - Child';
								});
								angular.forEach(table.parents, function (element, index) {
									$scope.relationships.definitions['parent_' + index] = element;
									$scope.relationships.options['parent_' + index] = element.parent_table + ' (as ' + element.name + ') - Parent';
								});
								$scope.relationships.selected = $scope.relationships.definitions[_.keys($scope.relationships.definitions)[0]];
								$scope.$watch('relationships.definitions', function (current) {
									$scope.relationships.values = _.values(current);
								});

								// update after selection
								$scope.$watch('relationships.selected', function (current) {
									if (!current) {
										return;
									}
									var definition = current;
									$scope.relationships.sqlFragment = '';
									$scope.relationships.name = definition.name;
									if (definition.child_table) {
										// the sub resource is a child table
										var theChildTable = kahuna.meta.allTables[definition.child_table];
										$scope.relationships.isCollection = 'Y';
										angular.forEach(definition.child_columns, function (element, index) {
											if (index > 0) {
												$scope.relationships.sqlFragment += ' AND ';
											}
											// We have to find the column to get its dbName -- it might be quoted or something
											var theChildColumn = _.find(theChildTable.columns, function (c) { return c.name == element; });
											$scope.relationships.sqlFragment = theChildColumn.dbName + ' = [' + definition.parent_columns + ']';
										});
										$scope.relationships.table = definition.child_table;
									}
									else {
										// the sub resource is a parent table
										$scope.relationships.isCollection = 'N';
										var theParentTable = kahuna.meta.allTables[definition.parent_table];
										angular.forEach(definition.parent_columns, function (element, index) {
											if (index > 0) {
												$scope.relationships.sqlFragment += ' AND ';
											}
											// We have to find the column to get its dbName -- it might be quoted or something
											var theParentColumn = _.find(theParentTable.columns, function (c) { return c.name == element; });
											$scope.relationships.sqlFragment = theParentColumn.dbName + ' = [' + definition.child_columns + ']';
										});
										$scope.relationships.table = definition.parent_table;
									}
								});

								$scope.close = function closeModal() { return $modalInstance.close(); };

								$scope.closeAndCreate = function closeAndCreate(customResourceBoolean) {
									var subResourceObj = {};
									if (!customResourceBoolean) {
										var table = '';
										var prefix = '';
										var tableSplit = $scope.relationships.table.split(':');
										if (tableSplit.length > 1) {
											prefix = tableSplit[0];
											table = tableSplit[1];
										}
										else {
											table = tableSplit[0];
										}
										subResourceObj.join_condition = $scope.relationships.sqlFragment;
										subResourceObj.is_collection = $scope.relationships.isCollection;
										subResourceObj.table_name = table;
										subResourceObj.prefix = prefix;
										subResourceObj.name = $scope.relationships.name;
										subResourceObj.root_ident = resource.root_ident;
										if (subResourceObj.root_ident == null) {
											subResourceObj.root_ident = resource.ident;
										}
									}
									scope.helpers.createSubResource(subResourceObj);
									$modalInstance.close();
								};
							});
						}
					],
					resolve: {
						resource: function () { return $scope.data.selectedSubResource; },
						table: function () { return $scope.data.selectedSubResourceTable; }
					}
				});
			}
			else {
				$scope.helpers.createSubResource({});
			}
		};

		$scope.deleteSubResource = function deleteSubResource() {
			if ( ! confirm("Are you sure you want to delete this resource (" + $scope.data.selectedSubResource.name +
					")? This will also delete all the resources it contains.")) {
				return;
			}
			KahunaData.remove($scope.data.selectedSubResource, function (data) {
				kahuna.meta.getAllResources($rootScope.currentProject);
				var deleted = kahuna.util.findInTxSummary(data.txsummary, 'AllResources', 'DELETE');
				_.each(deleted, function (r) {
					removeResource(r);
					inform(r, 'was deleted');
				});

				// $scope.resourceSelected($scope.selectedResource);
				loadAllResource().then(function () {
					$scope.data.selectedSubResource = null;
				});
			});
		};

		$scope.isAttributeStateUpdated = false;
		$scope.checkAttributeState = function () {
			if ($scope.isAttributeStateUpdated) {
				var scope = $scope;
				 $modal.open({
						template: '<div class="modal-dialog"><div class="modal-content"><div class="modal-header">' +
							'Attributes have been updated, please save the table. <a class="btn btn-primary" ng-click="close()">Save</a></div></div></div>',
						controller: function ($scope, $modalInstance) {
							$scope.close = function close() {
								$modalInstance.close();
								scope.saveResource();
							};
						},
						resolve: {}
				 });
				setTimeout(function () {angular.element('body').click();});
			}
		};

		$scope.$watch('data.selectedSubResource', function (current, previous) {
			$scope.$evalAsync(function () { $scope.isAttributeStateUpdated = false; });
		});

		$scope.$watch('data.selectedSubResource.Attributes', function (current, previous) {
			if (current && previous && current != previous) {
				var currentArr = _.pluck(current, 'name');
				var previousArr = _.pluck(previous, 'name');
				if (!angular.equals(currentArr, previousArr)) {
					// something changed, update scope
					$scope.isAttributeStateUpdated = true;
				}
			}
			else {
				if ($scope.data.selectedSubResource && $scope.data.selectedSubResource.ident) {
					subResourceSelected($scope.data.selectedSubResource.ident);
				}
			}
		}, true);

		// Called when user clicks Save, or creates a subresource
		$scope.saveResource = function saveResource(notifySaveStatusBoolean) {
			if (angular.isUndefined(notifySaveStatusBoolean)) {
				notifySaveStatusBoolean = true;
			}
			var deferred = $q.defer();
			if (!kahuna.resource.filterEditor) {
				// this is being called to early
				deferred.reject();
				return deferred.promise;
			}

			$scope.isAttributeStateUpdated = false;

			if ($scope.data.selectedSubResource.resource_type_ident != 1) {
				var sql = kahuna.resource.sqlEditor.getValue();
				sql = sql.replace(/\n/g, "\\n");
				sql = sql.replace(/"/g, "\\\n");
				$scope.data.selectedSubResource.code_text = kahuna.resource.sqlEditor.getValue();
			}

			var resourceCopy = $scope.data.selectedSubResource;
			delete resourceCopy.subResources;
			if ($scope.data.selectedSubResource.entity_name) {
				var prefixTable = $scope.data.selectedSubResource.entity_name.split(':');
				$scope.data.selectedSubResource.prefix = prefixTable[0];
				$scope.data.selectedSubResource.table_name = prefixTable[1];
				resourceCopy = kahuna.util.cloneObject($scope.data.selectedSubResource);
				delete resourceCopy.entity_name;
			}
			$scope.data.selectedSubResource.filter_code = kahuna.resource.filterEditor.getValue();
			resourceCopy.filter_code = kahuna.resource.filterEditor.getValue();
			KahunaData.update(resourceCopy, function (data) {
				if (data.txsummary) {
					angular.forEach(data.txsummary, function (row, index) {
						if (row.column_name) {
							angular.forEach($scope.data.selectedSubResource.Attributes, function (element, i) {
								if (row.column_name == element.column_name) {
									if (row['@metadata'].verb == 'DELETE') {
										$scope.data.selectedSubResource.Attributes.splice(i, 1);
										console.log('spliced');
									}
									else {
										$scope.data.selectedSubResource.Attributes[i] = row;
										console.log('updated', $scope.data.selectedSubResource.Attributes);
									}
								}
							});
						}
					});
				}
				processUpdate(data, notifySaveStatusBoolean);
				$scope.$evalAsync(function () {
					loadAllResource();
					deferred.resolve(data);
				});
			});

			$scope.savedResource = true;
			$timeout(function () {
				deferred.resolve(false);
				$scope.savedResource = false;
			}, 500);
			return deferred.promise;
		};

		function showTableColumns() {
			if ($scope.tableColumns) {
				for (var i = 0; i < $scope.tableColumns.length; i++) {
					delete $scope.tableColumns[i].checked;
				}
			}
			if ( ! $scope.data.selectedSubResource) {
				return;
			}
			kahuna.meta.getTableDetails(entityName($scope.data.selectedSubResource), function (data) {
				// We could get nothing back if the resource's table no longer exists
				if (Object.keys(data).length == 0) {
					putInScope("tableColumns", []);
				}
				else {
					for (var i = 0; i < data.columns.length; i++) {
						var col = data.columns[i];
						col.checked = false;
						var resAtt = getResourceAttributeForColumn(col);
						if (resAtt && (!resAtt['@metadata'].action || resAtt['@metadata'].action != 'DELETE')) {
							col.checked = true;
						}
					}
					putInScope("tableColumns", data.columns);
				}
			});
		}

		$scope.exportResource = function exportResource() {
			var iframe = document.getElementById("downloadIframe");
			var theResource = $scope.data.selectedSubResource;
			// top (root) resource has a null root_ident
			var rootIdent = theResource.root_ident || theResource.ident;
			var rootResource = kahuna.meta.allResources[rootIdent];
			var frag = "AllResources" + "?auth=" + kahuna.globals.apiKeyValue + ":1"
					+ "&sysfilter=equal_or(ident:" + rootIdent + ", root_ident:" + rootIdent+ ")"
					+ "&sysorder=(root_ident:null_first,prefix:asc_uc,table_name:asc_uc)"
					+ "&downloadName=ResourceExport_" + rootResource.name + ".json";
			iframe.src = kahuna.baseUrl + frag;
		};

		// This is a little involved because an exported resource is not a tree,
		// it's an unordered list of resources.
		// So we have to find the root resource first, insert it, then insert
		// its children, then their children, etc...
		$scope.importResourceJson = function importResourceJson() {
			if (!document.getElementById('importFile').files[0]) {
				alert("Please select a JSON file to import");
				return;
			}
			if (window.File && window.FileReader && window.FileList && window.Blob) {
				var importFile = document.getElementById('importFile').files[0];
				var reader = new FileReader();
				reader.onloadend = function (e) {
					var json = e.target.result;
					try {
						rsrc = JSON.parse(json);
					}
					catch (e2) {
						alert('Your JSON file contains an error: ' + e2);
						return;
					}

					// needs to be an array or object, not a simple type
					if ("object" !== typeof(rsrc)) {
						alert('This file must be an object or array');
						return;
					}

					var rootResource = _.find(rsrc, function (r) {
						return r.container_ident == null;
					});
					if ( ! rootResource) {
						throw "Unable to find root resource";
					}
					
					var resourceNames = _.indexBy(kahuna.meta.allResources, 'name');
					rootResource.name += "_clone";
					
					_.each(resourceNames, function (e) {
						if (e.name == rootResource.name) {
							rootResource.name += new Date().getTime();
						}
					});
					
					console.log(resourceNames);
					var newRootIdent = null;
					importResourceLevel(rootResource);

					function importResourceLevel(res, containerIdent) {
						var originalIdent = res.ident;
						delete res['@metadata'];
						delete res.ident;
						res.root_ident = newRootIdent;
						res.apiversion_ident = $scope.active.selectedApiVersion.ident;
						res.container_ident = containerIdent;
						delete res.entity_name;
						_.each(res.Attributes, function (a) {
							delete a.ident;
							delete a['@metadata'];
							delete a.resource_ident;
						});

						try {
							KahunaData.create("AllResources", res, function (data) {
								var newRes = _.find(data.txsummary, function (b) {
									return b['@metadata'].resource === 'AllResources';
								});
								if ( ! newRes) {
									throw "Unable to find newly created resource";
								}
								setEntityName(newRes);
								inform(newRes, 'created');

								kahuna.resource.allResources[newRes.ident] = newRes;
								kahuna.meta.allResources[newRes.ident] = angular.copy(newRes);
								kahuna.meta.allResources[newRes.ident].apiVersion = $scope.active.selectedApiVersion.name;
								if ( ! newRes.entity_name) {
									alert('No entity_name!');
								}

								// If this is the top resource
								if ( ! newRootIdent) {
									newRootIdent = newRes.ident;
									kahuna.applyFunctionInScope($scope, function () {
										kahuna.resource.topResources.push(newRes);
										sortTopResources();
									});
								}

								var children = _.filter(rsrc, function (r) {
									return r.container_ident === originalIdent;
								});
								_.each(children, function (c) {
									importResourceLevel(c, newRes.ident);
								});
								loadAllResource().then(function () {
									console.log('data');
								});
							});
						}
						catch(err) {
							alert('Error while importing resource: ' + err);
						}
					}
				};
				reader.readAsText(importFile);
			}
		};

		$scope.importResource = function importResource() {
			$rootScope.importFileName = null;
			setTimeout(function () {
				var options = {
					modal : true,
					buttons : {
						OK : function () {
							$(this).dialog("close");
							$scope.importResourceJson();
							$scope.$apply();
							$('.upload-form input').val("");
						},
						Cancel : function () {
							$(this).dialog("close");
							$scope.$apply();
							$('.upload-form input').val("");
						}
					},
					width: 500,
					height: 275
				};
				jqueryUI.wrapper('#newImportDialog', 'dialog', options);
			}, 50);
		};

		$scope.domSelectActiveResource = function domSelectActiveResource(resource) {
			if (resource.ident) {
				kahuna.saveSetting('ActiveResource', resource.ident);
				$timeout(function () {
					subResourceSelected(resource.ident);
					// $('.resource-ident-' + resource.ident).click();
				}, 1000);
			}
		};
		$scope.refreshAttributes = function refreshAttributes() {
			if (!$scope.tableColumns.length) {
				subResourceSelected($scope.data.selectedSubResource.ident);
			}
		};

		$scope.resourceTypeSelected = function resourceTypeSelected() {
			$scope.data.selectedSubResource.resource_type_ident = parseInt($scope.data.selectedSubResource.resource_type_ident);
			console.log('test', typeof $scope.data.selectedSubResource.resource_type_ident);
		};

		function subResourceSelected(ident) {
			var selRes = kahuna.resource.allResources[ident];
			putInScope("data.selectedSubResourceTable", kahuna.meta.allTables[selRes.entity_name]);

			putInScope("data.selectedSubResource", selRes);
			if (selRes.container_ident) {
				putInScope("selectedSubResourceParent", kahuna.resource.allResources[selRes.container_ident]);
			}
			else {
				putInScope("selectedSubResourceParent", null);
			}

			putInScope("tableColumns", []);
			putInScope("selectedColumn", null);
			putInScope("resourceAttribute", null);
			putInScope("showResAttribTable", {value: false});
			showTableColumns();

			$scope.$broadcast('ace.sqlRefresh');
		}

		$scope.refreshAce = function refreshAce() {
			$scope.$broadcast('ace.sqlRefresh');
		};

		// check if the resource has code or filter text
		$scope.$on('ace.sqlRefresh', function () {
			if (kahuna.resource.sqlEditor && $scope.data.selectedSubResource) {
				kahuna.resource.sqlEditor.setValue($scope.data.selectedSubResource.code_text || "");
				kahuna.resource.sqlEditor.getSession().getSelection().moveCursorFileStart();
			}
			if (kahuna.resource.filterEditor) {
				kahuna.resource.filterEditor.setValue($scope.data.selectedSubResource.filter_code || "");
				kahuna.resource.filterEditor.getSession().getSelection().moveCursorFileStart();
			}
		});

		$scope.subResourceSelected = subResourceSelected;

		var createTree = _.throttle(function () {
			console.log('Function no longer used, track me down');
			return;
		}, 1000);

		$scope.$watch('apiVersions', function () {
			if (!$scope.active.selectedApiVersion && $scope.apiVersions) {
				$scope.active.selectedApiVersion = $scope.apiVersions[0];
			}
		});

		$scope.updateApiSelection = function () {
			$scope.data.selectedSubResource = null;
			$scope.$evalAsync(function () {
				loadAllResource().then(function (data) {
					$scope.$broadcast('UpdatedVersionSuccess');
				});
			});
		};

		$scope.$on('UpdatedVersionSuccess', function () {
			// this was used by the old tree to refresh, but the even may still be useful ... some day
		});

		// If user selects a table, guess what the join should be
		$scope.tableSelected = function () {
			if ( ! $scope.data.selectedSubResource) {
				return;
			}

			if ( ! $scope.data.selectedSubResource.Attributes) {
				$scope.data.selectedSubResource.Attributes = [];
			}
			for (var i = 0; i < $scope.data.selectedSubResource.Attributes.length; i++) {
				$scope.data.selectedSubResource.Attributes[i]['@metadata'].action = 'DELETE';
			}

			$scope.data.selectedSubResource.prefix = $scope.data.selectedSubResourceTable.prefix;
			$scope.data.selectedSubResource.table_name = $scope.data.selectedSubResourceTable.entity;
			$scope.data.selectedSubResource.entity_name = $scope.data.selectedSubResourceTable.name;

			showTableColumns();

			if ( ! $scope.data.selectedSubResource.container_ident) {
				$scope.saveResource();
				return;
			}
			else{
				$scope.guessJoin();
				$scope.saveResource();
			}
		};

		// Try to guess the join condition
		$scope.guessJoin = function guessJoin() {
			var superResource = kahuna.resource.allResources[$scope.data.selectedSubResource.container_ident];
			kahuna.meta.getTableDetails($scope.data.selectedSubResource.entity_name, function (superTableDetails) {
				var join = '';
				if ($scope.data.selectedSubResource.is_collection == 'Y') {
					if ( ! superTableDetails.parents) {
						$scope.data.selectedSubResource.join_condition = '';
						return;
					}
					for (var idx = 0; idx < superTableDetails.parents.length; idx++) {
						var parent = superTableDetails.parents[idx];
						if (parent.parent_table == superResource.entity_name) {
							for (var j = 0; j < parent.parent_columns.length; j++) {
								if (join.length > 0) {
									join += " AND ";
								}
								join += parent.child_columns[j] + ' = [' + parent.parent_columns[j] + ']';
							}
						}
						if (join.length > 0) break;
					}
				}
				else {
					if ( ! superTableDetails.children) {
						$scope.data.selectedSubResource.join_condition = '';
						return;
					}
					for (var idx = 0; idx < superTableDetails.children.length; idx++) {
						var child = superTableDetails.children[idx];
						if (child.child_table == superResource.entity_name) {
							for (var j = 0; j < child.child_columns.length; j++) {
								if (join.length > 0)
									join += " AND ";
								join += child.parent_columns[j] + ' = [' + child.child_columns[j] + ']';
							}
						}
						if (join.length > 0) break;
					}
				}

				$scope.data.selectedSubResource.join_condition = join;
				putInScope('data.selectedSubResource', $scope.data.selectedSubResource);
			});
		};

		$scope.isCollectionClicked = function () {
			$scope.guessJoin();
		};

		$scope.getColumnClass = function (col) {
			if (col == $scope.selectedColumn) {
				return 'Checklist Selected';
			}
			return 'Checklist';
		};

		$scope.columnClicked = function (col) {
			$scope.selectedColumn = col;
			$scope.resourceAttribute = getResourceAttributeForColumn(col);
			$scope.showResAttribTable.value = col.checked;
		};

		// When the user changes the value of the checkbox for an attribute
		$scope.columnSelectChanged = function (col) {
			if (col.checked) {
				$scope.showResAttribTable.value = true;
				$scope.resourceAttribute = getResourceAttributeForColumn(col);
				if ( ! $scope.resourceAttribute) {
					$scope.resourceAttribute = {
						"@metadata": { action: "INSERT" },
						resource_ident: angular.copy($scope.data.selectedSubResource.ident),
						name: angular.copy(col.name),
						column_name: angular.copy(col.name)
					};
					$scope.data.selectedSubResource.Attributes.push($scope.resourceAttribute);

					KahunaData.create('AllResources.Attributes', $scope.resourceAttribute, function (data) {
						var resAtts = _.indexBy($scope.data.selectedSubResource.Attributes, 'column_name');
						var att = angular.copy(data.txsummary[0]);
						delete att['@metadata'].verb;
						if (resAtts[att.column_name]) {
							var index = $scope.data.selectedSubResource.Attributes.indexOf(resAtts[att.column_name]);
							$scope.data.selectedSubResource.Attributes[index] = att;
						}
						else {
							$scope.data.selectedSubResource.Attributes.push(att);
						}
					});
				}
				else {
					$scope.resourceAttribute['@metadata'].verb = 'INSERT';
					delete $scope.resourceAttribute['@metadata']['href'];
					delete $scope.resourceAttribute.ident;
					KahunaData.create('AllResources.Attributes', $scope.resourceAttribute, function (data) {
						var resAtts = _.indexBy($scope.data.selectedSubResource.Attributes, 'column_name');
						var att = data.txsummary[0];
						delete att['@metadata'].verb;
						if (resAtts[att.column_name]) {
							var index = $scope.data.selectedSubResource.Attributes.indexOf(resAtts[att.column_name]);
							$scope.data.selectedSubResource.Attributes[index] = att;
							console.log('insert/refresh', att);
						}
						else {
							$scope.data.selectedSubResource.Attributes.push(att);
							console.log('insert only', att);
						}
					});
				}
			}
			else {
				$scope.showResAttribTable.value = false;
				$scope.resourceAttribute = null;
				var attrib = getResourceAttributeForColumn(col);
				if ( ! attrib)
					throw "Unable to find resource attribute for column: " + col;
				if ( ! attrib['@metadata'] || !attrib['@metadata'].href) {
					var idx = $scope.selectedResource.Attributes.indexOf(attrib);
					$scope.data.selectedSubResource.Attributes.splice(idx, 1);
				}
				else {
					attrib['@metadata'].action = 'DELETE';
				}
				KahunaData.update(attrib, function (data) {
					// remove
					var resAtts = _.indexBy($scope.data.selectedSubResource.Attributes, 'column_name');
					var att = data.txsummary[0];
					if (resAtts[att.column_name]) {
						var index = $scope.data.selectedSubResource.Attributes.indexOf(resAtts[att.column_name]);
						$scope.data.selectedSubResource.Attributes.splice(index, 1);
					}
				});
			}
			$scope.columnClicked(col);
			$scope.refreshAttributes();
		};

		// Select all columns as attributes
		$scope.selectAllColumns = function () {
			var i, col;
			for (i = 0; i < $scope.tableColumns.length; i++) {
				col = $scope.tableColumns[i];
				if (!col.checked) {
					col.checked = true;
					$scope.columnSelectChanged(col);
				}
			}
		};

		///////////////////////////////////////////////////////////////////////////////////////
		// JSON test tab
		$scope.params = $rootScope.params;

		// Get all Auth Tokens for the current project, for the dropdown in the Test tab.
		KahunaData.query('admin:apikeys', {sysfilter: 'equal(project_ident:' + $rootScope.currentProject.ident + ')'}, function (data) {
			if (data.length > 0) {
				$scope.params.selectedApiKey = data[0];
			}
			$scope.apiKeys = data;
		});

		// Grab a sample JSON from the server using the currently selected resource, and the selected Auth Token,
		// and display it in the CodeMirror widget.
		$scope.fetchJson = function () {
			var boxElem = document.getElementById('jsonTextBox');
			if ( ! boxElem) {
				return;
			}
			kahuna.resource.aceEditor = ace.edit("jsonTextBox");
			kahuna.resource.aceEditor.setTheme("ace/theme/xcode");
			kahuna.resource.aceEditor.getSession().setMode("ace/mode/json");
			kahuna.resource.aceEditor.setOptions({
				fontFamily: "monospace",
				fontSize: kahuna.globals.aceEditorFontSize
			});
			if ( ! $scope.params.selectedApiKey) {
				alert('You must have an Auth Token before you can do this.');
				return;
			}

			console.log(_.indexBy($scope.allResources, 'ident'), $scope.data.selectedSubResource);

			var rootResource = $scope.data.selectedSubResource;
			if (rootResource.root_ident != null) {
				var allRootResource = _.indexBy($scope.allResources, 'ident');
				rootResource = allRootResource[rootResource.root_ident];
			}

			KahunaData.queryWithKey(kahuna.serverUrl + $scope.currentAccount.url_name + '/' +
					$scope.currentProject.url_name + '/' + $scope.active.selectedApiVersion.name + '/' +
					rootResource.name, $scope.queryParams, $scope.params.selectedApiKey, function (data) {
				var formattedJson = kahuna.util.formatToJson(data);
				kahuna.resource.aceEditor.setValue(formattedJson || "");
				kahuna.resource.aceEditor.getSession().getSelection().moveCursorFileStart();
			});
		};

		$scope.goToRestlab = function goToRestlab() {
			angular.element('input').blur();
			$scope.saveResource(false).then(function () {
				var resource = $scope.resourceTree[$scope.data.selectedSubResource.root_ident] || $scope.data.selectedSubResource
				$location.path('/projects/' + $rootScope.currentProject.ident + '/restlab');
				$rootScope.selectedSubResource = resource;
			});
		};

		$scope.getApiVersionIndex = function getApiVersionIndex(versionName) {
			// get the current version object
			var versionObj = _.indexBy($scope.apiVersions, 'name')[versionName];
			// return the index
			return $scope.apiVersions.indexOf(versionObj);
		};

		// versionName LIKE 'v1' || 'v2'
		$scope.triggerApiSelection = function triggerApiSelection (versionName) {
			$scope.active.selectedApiVersion = $scope.apiVersions[$scope.getApiVersionIndex(versionName)];
			$scope.updateApiSelection($scope.active.selectedApiVersion);
		};
		$scope.$on('CreateTableResource', function (event, table) {
			$scope.createResource(table, table.entity + 'Resource');
		});

		if (angular.isDefined($rootScope.syncAction.resources)) {
			var currentAction = angular.copy($rootScope.syncAction.resources);
			console.log(currentAction);
			if (currentAction.action === 'create') {
				$timeout(function () {
					$scope.triggerApiSelection(currentAction.version);
					$timeout(function () { $scope.$broadcast('CreateTableResource', currentAction.table); });
				}, 1500);
			}
			if (currentAction.action === 'edit') {
				(function (currentAction) {
					$timeout(function () {
						kahuna.saveSetting('ActiveResource', currentAction.resource.ident);
						$scope.triggerApiSelection(currentAction.version);
						$timeout(function () { $scope.domSelectActiveResource(currentAction.resource); }, 0);
					}, 1500);
				}) (currentAction);
			}
			delete $rootScope.syncAction.resources;
		}
	}
};
