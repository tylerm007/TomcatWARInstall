var espresso = {
	setServerUrl: function (url) {
		espresso.projectUrl = url;
		var idx = url.indexOf("/rest/");
		espresso.adminUrl = url.substring(0, idx) + "/rest/abl/admin/v2/";
	},

	setApiKey: function (key) {
		espresso.services.espressoHeaders = {
			Authorization: "CALiveAPICreator " + key + ":1",
			'X-CALiveAPICreator-ResponseFormat': 'json'
		};
		espresso.globals.apiKeyValue = key;
	}
};


angular.module('AdminServices', ['ngResource'])
.factory('EspressoData', ['$http', '$rootScope', 'Tables', 'Query', '$q', 'Events', function ($http, $rootScope, Tables, Query, $q, Events) {
	var $scope = $rootScope.$new(true);

	// Keep track of all the objects to be saved in a transaction, so we don't try
	// to save them more than once.
	$scope.objectsToSave = [];

	// This is true when we're in the middle of processing a save.
	$scope.saveInProgress = false;

	// These options prevent a double click from saving duplicates by accident
	$scope.saveFailSafeBool = false;

	//after a batch/query/delete request, the promise.finally() method restores the user ability to save
	function enableSave () {
		$scope.saveFailSafeBool = false;
	}
	////////////////////////////////////////////////////////////////////////////////////
	//
	// HOW SAVE WORKS
	//
	// When the user clicks save, that invokes saveAll, which broadcasts 'saveAll'.
	// The controllers listen for that and call $rootScope.addRowsToSave with the row(s)
	// to save, if any. When the last controller has done that, we then write these rows.
	// When the response comes back, we then broadcast 'updateRows', with the rows as argument.
	// The controllers can then look through the rows and decide if they need to refresh
	// anything.
	//
	////////////////////////////////////////////////////////////////////////////////////
	// Save everything
	$rootScope.saveAll = function () {
		$scope.objectsToSave = [];
		$scope.saveInProgress = true;

		if (!$scope.saveFailSafeBool) {
			$rootScope.$broadcast('saveAll');
			$scope.saveFailSafeBool = true;
		}
	};

	////////////////////////////////////////////////////////////////////////////////////
	// Keep track of which areas have contributed their object for saving.
	// When all areas have, then we're ready to save.
	$scope.saveObjectsReceivedFrom = {};

	$rootScope.addRowsToSave = function (areaName, rows) {
		if (rows) {
			// De-dupe -- maybe other areas also wanted to save that row
			RowsLoop:
			for (var i = 0; i < rows.length; i++) {
				for (var j = 0; j < $scope.objectsToSave.length; j++) {
					var objectToSave = $scope.objectsToSave[j];
					if (espresso.util.rowsAreEqual(rows[i], objectToSave)) {
						continue RowsLoop;
					}
				}
				$scope.objectsToSave.push(rows[i]);
			}
		}

		// Keep track of which areas have reported their rows so far
		$scope.saveObjectsReceivedFrom[areaName] = true;

		// If we've received data from all areas, time to actually send the data to the server
		if ($scope.saveObjectsReceivedFrom['grid'] &&
				$scope.saveObjectsReceivedFrom['scalar'] &&
				$scope.saveObjectsReceivedFrom['children']) {
			$scope.saveObjectsReceivedFrom = {};
			$scope.flushToServer();
		}
	};

	////////////////////////////////////////////////////////////////////////////////////
	// This gets called when all areas have contributed their rows
	$scope.flushToServer = function () {
		if ($scope.objectsToSave.length == 0) {
			//alert('Nothing needs to be saved.');
			$scope.saveInProgress = false;
			return;
		}

		var numInsert = 0;
		var numUpdate = 0;
		var numDelete = 0;
		_.each($scope.objectsToSave, function (obj) {
			if (obj['@metadata'] && !obj['@metadata'].href) {
				obj['@metadata'].action = 'INSERT';
			}
			if ( ! obj['@metadata'] || obj['@metadata'].action == 'INSERT')
				numInsert++;
			else if (obj['@metadata'].action == 'UPDATE')
				numUpdate++;
			else if (obj['@metadata'].action == 'DELETE')
				numDelete++;
			else
				console.log('ERROR: unable to determine action for row: ' + JSON.stringify(obj));
		});
		$scope.saveObjectsReceivedFrom = {};
		$scope.saveInProgress = false;

		// Make a copy of the objects to save and strip out internal properties.
		var objectCopies = [];
		_.each($scope.objectsToSave, function (obj) {
			var copy = espresso.util.cloneObject(obj);

			if (obj['@metadata'].action === 'UPDATE') {
				var table = Tables.find('settings').by('metadata').using(obj['@metadata']).execute();
				if (table) {
					angular.forEach(table.columns, function (column, index) {
						//right now we do not save binaries at all
						if ('binary' === column.generic_type) {
							// if copy[column.name] isString
							//   definitely changed, save it
							// if copy[column.name].url defined
							//   definitely unchanged, delete it
							// if copy[column.name].value defined && original[column.name].value defined
							//   if values ===
							//     delete
							//   else
							//     save

							//original values:
							//obj.__original
							delete copy[column.name];
						}
					});
				}
			}

			delete copy.__internal;
			delete copy.__original;
			objectCopies.push(copy);
		});
		var url = $scope.objectsToSave[0]['@metadata'].href;
		if ( ! url)
			url = $scope.objectsToSave[0]['@metadata'].entity;
		$scope.objectsToSave = [];

		// We use update (i.e. put) so we can send a batch of rows, each potentially with a different action
		var batch = Module.batch(url, JSON.stringify(objectCopies),
					function (data, status, headers) {

			if (data.errorCode) {
				alert(data.errorMessage);
				return;
			}

			var numInserted = 0;
			var numUpdated = 0;
			var numDeleted = 0;
			for (var i = 0; i < data.txsummary.length; i++) {
				var newObj = data.txsummary[i];
				if (newObj["@metadata"].verb == "INSERT") numInserted++;
				if (newObj["@metadata"].verb == "UPDATE") numUpdated++;
				if (newObj["@metadata"].verb == "DELETE") numDeleted++;
			}
			if (numInserted || numUpdated || numDeleted) {
				espresso.util.info("Save successful: " + numInserted + " objects inserted, " +
					numUpdated + " objects updated, " + numDeleted + " objects deleted.");
			}
			else {
				espresso.util.info('Unexpected Error: No objects saved, updated, or deleted');
			}

			// Fill in the extra stuff and the parents
			_.each(data.txsummary, function (row) {
				row.__internal = { parentRows: {} }; // We store extra information here
				row.__original = espresso.util.cloneObject(row); // Make a copy so we can compare
				//row.notes += " Hello from Data.flushToServer";
				Module.fillParents([row], $rootScope.allTables[row['@metadata'].resource]);
			});

			$rootScope.$emit('updatedRows', data.txsummary);
		});
		batch['finally'](function () {
			Events.broadcast('SaveComplete');
		});
	};

	Events.on('FlushToServer', $scope.flushToServer);
	//end flushtoserver

	////////////////////////////////////////////////////////////////////////////////////
	// Actual service

	var Module = null;
	Module = {
		// Create a db object on server
		create: function (className, data, callback, errorCallback) {
			var url = className;
			if (url.substring(0, 4) != 'http')
				url = espresso.projectUrl + url;
			// var statusId = espresso.startFetch();
			$http.post(
				url,
				data,
				{ headers: espresso.services.espressoHeaders }
			)
			.success(function (response) {
				// espresso.endFetch(statusId);
				if (callback)
					callback(response);
			})
			.error(function (errorData, status, headers, config) {
				// espresso.endFetch(statusId);
				if (errorCallback) {
					errorCallback(errorData);
				}
				else {
					espresso.services.handleError(errorData, status, url);
				}
			});
		},

		isSaveable: function isSaveable() {
			var main = false;
			var form = false;
			var child = false;
			if ($rootScope.getMainSaveData) {
				main = !!$rootScope.getMainSaveData().length;
			}
			if ($rootScope.rowIsUpdated) {
				form = $rootScope.rowIsUpdated();
			}
			if ($rootScope.getChildSaveData) {
				child = !!$rootScope.getChildSaveData().length;
			}

			return (main || form || child);
		},

		////////////////////////////////////////////////////////////////////////
		// Affect one or more db object on server
		batch: function (className, data, callback, errorCallback) {
			var url = className;
			if (url.substring(0, 4) != 'http')
				url = espresso.projectUrl + url;
			return $http.put(
				url,
				data,
				{ headers: espresso.services.espressoHeaders }
			)
			.success(function (response) {
				$rootScope.root.requestQueue.push({
					verb: 'PUT',
					url: url,
					query: '',
					response: JSON.stringify(response, null, 2)
				});
				if ($rootScope.root.requestQueue.length > 10) {
					$rootScope.root.requestQueue.shift();
				}

				callback && callback(response);
			})
			.error(function (errorData, status, headers, config) {
				if (errorCallback) {
					errorCallback(errorData);
				}
				else {
					espresso.services.handleError(errorData, status, url);
				}
			})['finally'](enableSave);
		},

		////////////////////////////////////////////////////////////////////////
		// Update a db object on server
		update: function (object, callback) {
			//var statusId = espresso.startFetch();
			var href = null;
			if ($.isArray(object)) {
				if ( ! object.length) {
					callback && callback();
					return;
				}
				href = object[0]['@metadata'].href;
			}
			else {
				href = object['@metadata'].href;
			}
			$http.put(href, object,
				{ headers: espresso.services.espressoHeaders }
			)
			.success(function (response) {
				// espresso.endFetch(statusId);
				for (var propName in response) {
					if (object.hasOwnProperty(propName)) {
						object[propName] = response[propName];
					}
				}
				$scope.savedObjects = [];

				$rootScope.root.requestQueue.push({
					verb: 'PUT',
					url: href,
					query: '',
					response: JSON.stringify(response, null, 2)
				});
				if ($rootScope.root.requestQueue.length > 10) {
					$rootScope.root.requestQueue.shift();
				}

				callback && callback(response);
			})
			.error(function (data, status, headers, config) {
				// espresso.endFetch(statusId);
				$scope.savedObjects = [];
				espresso.services.handleError(data, status, object['@metadata'].href);
			})['finally'](enableSave);
		},

		////////////////////////////////////////////////////////////////////////////////////
		// Does the given column's data type require its value to be enclosed in quotes?
		formatForSQL: function (col, value) {
			if (!col ||  !col.type)
				console.log('Column has no type');
			switch(col.type) {
				case "CHAR":
				case "LONGNVARCHAR":
				case "LONGVARCHAR":
				case "NCHAR":
				case "NVARCHAR":
				case 'VARCHAR':
					if (value) {
						value = value.replace(/'/g, "''");
					}
					return "'" + value + "'";
				case "BINARY":
					var bytesStr = atob(value.value);
					var bytes = new Uint8Array(bytesStr.length);
					for (i = 0; i < bytesStr.length; ++i) {
						bytes[i] = bytesStr.charCodeAt(i);
					}
					var hexChars = bytes.map(function (byte) {
						return (byte & 0xFF).toString(16)
					}).join('');
					return "0x" + hexChars;
			}
			return value;
		},

		////////////////////////////////////////////////////////////////////////////////////
		buildParentQuery: function (parent, row, tblInfo) {
			var clause = "";
			for (var i = 0; i < parent.child_columns.length; i++) {
				if (i > 0) {
					clause += ",";
				}

				clause += $rootScope.allTables[parent.parent_table].columnsByName[parent.parent_columns[i]].name;
				//clause += parent.parent_columns[i];
				var childColName = parent.child_columns[i];
				var val = row[childColName];
				if (val === null) {
					clause += ":null";
				}
				else {
					clause += ":";

					var col = tblInfo.columnsByName[childColName];
					clause += escape(Module.formatForSQL(col, val));
				}
			}
			return clause;
		},

		////////////////////////////////////////////////////////////////////////////////////
		// Given an array of objects, all of the same type, fetch their parent objects
		// and store them in the object's __parents
		fillParents: function (children, tblInfo) {
			if ( ! children || children.length == 0) {
				return;
			}
			if (angular.isUndefined(tblInfo) || angular.isUndefined(tblInfo.parents)) {
				return;
			}

			//console.log('Filling parents for ' + tblInfo.name);
			//var numParentsToRetrieve = tblInfo.parents.length;
			var parents = {};
			for (var i = 0; i < tblInfo.parents.length; i++) {
				var theParent = tblInfo.parents[i];
				parents[theParent.name] = {};

				var allClauses = [];
				(function (theChildren) {
					_.each(theChildren, function (c) {
						if (c['@metadata'].next_batch) {
							return;
						}
						allClauses.push(Module.buildParentQuery(theParent, c, tblInfo));
					});
				})(children);
				allClauses = _.uniq(allClauses);
				var fullClause = "sysfilter=equal_or(";
				for (var j = 0; j < allClauses.length; j++) {
					if (j > 0) {
						fullClause += ",";
					}
					fullClause += "" + allClauses[j] + "";
				}
				fullClause += ')';
				if (fullClause.indexOf('undefined') > -1) {
					console.log('INVALID CLAUSE: ' + fullClause);
				}

				// Get the parents of all the rows for the current role
				(function (parent, parentName, clause) {
					Module.query(parentName, null, clause, function (parentRows) {
						// console.log("Retrieved rows for parent table " + parentName + " = " + parentRows);

						// Now figure out which parent row goes with which child row(s), and connect them
						_.each(parentRows, function (p) {
							_.each(children, function (c) {
								var match = true;
								for (var j = 0; j < parent.parent_columns.length; j++) {
									if (p[parent.parent_columns[j]] != c[parent.child_columns[j]]) {
										match = false;
										break;
									}
								}
								if ( ! match) return;
								if ( ! c.__internal.parentRows)
									c.__internal.parentRows = {};
								c.__internal.parentRows[parent.name] = p;
								if ( ! c.__original.__internal.parentRows) {
									c.__original.__internal.parentRows = {};
								}
								c.__original.__internal.parentRows[parent.name] = p;
							});
						});
						angular.forEach(parentRows, function (p, i) {
							delete p['@metadata'];
							delete p['__internal'];
							delete p['__original'];
						});
					}, true);
				})(theParent, theParent.parent_table, fullClause);
			}
		},
		appQuery: function appQuery(url) {
			var config = { headers: espresso.services.espressoHeaders, cache: false };

			if (url.substring(0, 4) != 'http') {
				url = espresso.projectUrl + url;
			}

			return $http.get(url, config);
		},
		////////////////////////////////////////////////////////////////////////////////////
		//Get a list of db objects with query. The query parameter can either be a String, which is then passed
		// as the filter for the query, or it can be an Object with several parameters.
		query: function (url, tableName, query, callback, doNotFillParents, errorCallback) {
			callback = callback || function () {};
			// var statusId = espresso.startFetch();
			if ( ! tableName) {
				tableName = url;
			}
			var config = { headers: espresso.services.espressoHeaders, cache: false };

			if (query) {
				if (query instanceof Object) {
					config.params = query;
				}
				else {
					url = $rootScope.urlAppend(url, query);
				}
			}
			var sort = Query.table(tableName).sort();
			if (sort) {
				if (angular.isUndefined(config.params)) { config.params = {}; }
				url = $rootScope.urlAppend(url, sort);
			}
			if (url.substring(0, 4) != 'http') {
				url = espresso.projectUrl + url;
			}

			return $http.get(
				url,
				config
			).success(function (response, code, headers, config) {
				// espresso.endFetch(statusId);
				_.each(response, function (row) {
					row.__internal = { parentRows: {} }; // We store extra information here
					row.__original = espresso.util.cloneObject(row); // Make a copy so we can compare
				});
				if ( ! doNotFillParents) {
					Module.fillParents(response, $rootScope.allTables[tableName]);
				}

				$rootScope.root.requestQueue.push({
					verb: 'GET',
					url: url,
					query: query,
					response: JSON.stringify(response, null, 2)
				});
				if ($rootScope.root.requestQueue.length > 10) {
					$rootScope.root.requestQueue.shift();
				}
				callback(response);
			}).error(function (data, status, headers, errorConfig) {
				//espresso.endFetch(statusId);
				if (errorCallback) {
					errorCallback(data);
				}
				else {
					espresso.services.handleError(data, status, url);
				}
			})['finally'](enableSave);
		},
		queryResource: function queryResource(url, resourceName) {
			var config = { headers: espresso.services.espressoHeaders, cache: false };
			if (url.substring(0, 4) != 'http') {
				var versionedUrlComponents = espresso.baseUrl.split('/');
				versionedUrlComponents.pop();
				versionedUrlComponents.pop();
				var versionedUrl = versionedUrlComponents.join('/') + '/' + $rootScope.root.allResources[url].apiVersion + '/';
				url = versionedUrl + url;
			}
			return $http.get(
				url,
				config
			);
		},

		///////////////////////////////////////////////////////////////////////////
		// Remove a db object
		remove: function (object, callback, errCallback) {
			var statusId = espresso.startFetch();
			// ['delete'] to get around using delete js keyword
			$http['delete'](
				object['@metadata'].href + '?checksum=' + object['@metadata'].checksum,
				{ headers: espresso.services.espressoHeaders }
			).success(function (response) {
				espresso.endFetch(statusId);
				callback && callback(response);
			}).error(function (data, status, headers, config) {
				errCallback && errCallback(data, status);
				espresso.endFetch(statusId);
				espresso.services.handleError(data, status, object['@metadata'].href);
			})['finally'](enableSave);
		},

		///////////////////////////////////////////////////////////////////////////
		// Remove some objects
		removeWithUrl: function removeWithUrl(url, callback) {
			if (url.substring(0, 4) != 'http') {
				url = baseUrl + url;
			}
			// var statusId = espresso.startFetch();
			// ['delete'] to get around using delete js keyword
			$http['delete'](
					url,
					{ headers: espresso.services.espressoHeaders }
				).success(function (response) {
					// espresso.endFetch(statusId);
					callback && callback(response);
				}).error(function (data, status, headers, config) {
					// espresso.endFetch(statusId);
					espresso.services.handleError(data, status, url);
				})['finally'](enableSave);
		},

		///////////////////////////////////////////////////////////////////////////
		// Try to connect to the server
		pingServer: function (url, apiKey, callback) {
			// var statusId = espresso.startFetch();
			$http.get(
				url,
				{ headers: {Authorization: 'espresso ' + apiKey + ":1"}}
			).success(function (response) {
				// espresso.endFetch(statusId);
				callback(true);
			}).error(function (data, status, headers, config) {
				// espresso.endFetch(statusId);
				callback(data);
			});
		}
	};
	return Module;
}]);
