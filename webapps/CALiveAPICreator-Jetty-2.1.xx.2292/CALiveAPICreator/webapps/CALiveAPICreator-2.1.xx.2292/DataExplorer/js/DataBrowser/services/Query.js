/**
 * Perhaps a home to all row retrieval parameters (filters, orders, etc)
 * Currently only used to store order Query info
 */
espresso.app.service('Query', [
	'$rootScope', 'Tables',
	function ($rootScope, Tables) {
		/**
		 *
		 */
		var Query = {
			/**
			 *
			 */
			queries : {},
			/**
			 *
			 */
			sortMap : {
				'field' : 'fields'
			},
			/**
			 *
			 */
			selected : '',

			clear : function () {
				Query.queries = {};
				Query.selected = '';
			},

			/**
			 *
			 */
			table : function (tableName) {
				if (angular.isUndefined(tableName)) {
					//getter
					return Query.selected;
				}

				//setter
				Query.selected = tableName;
				if (angular.isUndefined(Query.queries[tableName])) {
					Query.queries[tableName] = Query.initialize();
				}
				return Query;
			},
			/**
			 *
			 */
			sort : function (info) {
				if (angular.isDefined(info)) {
					if (angular.isString(info)) {
						return Query.queries[Query.selected].sort[info][0];
					}
					else {
						Query.queries[Query.selected].sort = info;
						return Query;
					}
				}
				else {
					if (angular.isDefined(Query.queries[Query.selected]) && !angular.equals(null, Query.queries[Query.selected].sort)) {
						var colName = Query.queries[Query.selected].sort.fields[0];
						var tableName  = Query.queries[Query.selected].sort.columns[0].colDef.tableName;
						var isChild = Query.queries[Query.selected].sort.columns[0].colDef.grid === "child";
						if (!isChild && $rootScope.allTables[tableName].columnsByName[colName].name) {
							colName = $rootScope.allTables[tableName].columnsByName[colName].name;
						}
						else {
							var parentSettings = Tables.getSettings(Query.queries[Query.selected].sort.columns[0].colDef.parent);
							var tableName = parentSettings.childrenSettings[tableName].tableName;
							colName = $rootScope.allTables[tableName].columnsByName[colName].name;
						}
						
						var columnDefinition, type, sortArg;
						var tableDefinition = $rootScope.allTables[Query.queries[Query.selected].sort.columns[0].colDef.tableName];
						if (tableDefinition) {
							columnDefinition = tableDefinition.columnsByName[Query.queries[Query.selected].sort.columns[0].colDef.field]
							type = tableDefinition.columnsByName[Query.queries[Query.selected].sort.columns[0].colDef.field].generic_type;
						}
						
						sortArg = Query.queries[Query.selected].sort.directions[0];
						if (type && type === 'text') {
							sortArg += '_uc'; 
						}
						return 'sysorder=(' + colName + ':' + sortArg + ')';
					}
					else {
						return null;
					}
				}
			},
			/**
			 * 
			 * @param filter {string} name of the sysfilter being used
			 * @param column {object | string} the table column settings object, or the explicit column name string
			 * @param value {string} a string of the value being filtered for
			 * @return string URL fragment
			 */
			getSysfilterFragment: function (filter, column, value) {
				var columnName = '';
				if (angular.isObject(column)) {
					//this ought to be the settings object
					columnName = column.name;
				}
				else {
					//else, this ought to be a string then
					columnName = column;
				}
				return 'sysfilter=' + filter + '(' + columnName + ':' + value + ')';
			},
			/**
			 *
			 */
			initialize : function () {
				return {
					sort : null
				};
			}
		};
		return Query;
	}
]);
