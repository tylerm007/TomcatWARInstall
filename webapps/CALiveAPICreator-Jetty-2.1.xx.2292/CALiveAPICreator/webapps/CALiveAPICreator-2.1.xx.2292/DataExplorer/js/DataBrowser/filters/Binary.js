/**
 *
 */
espresso.app.filter('binary', [
	'$rootScope', 'Tables', 'Settings',
	function ($rootScope, Tables, Settings) {
		//info: table = the role name if gridArea is the childGrid
		return function (input, table, column, gridArea) {
			var append, authSession, bytes, columnName, columnSplit, filterTableSettings, format, gridColumnsByDataSource, isDemoBinary, parentSettings, role, scalarTableSettings, settings;
			if (angular.isDefined(input) && input) {
				//it's not null
				scalarTableSettings = {};
				if (!angular.equals(Tables.formTable, '')) {
					scalarTableSettings = Tables.getSettings(Tables.formTable);
				}
				if (!S(column).contains('__internal')) {
					// column belongs to this table
					if (gridArea && gridArea === 'childGrid') {
						//this is being called from the childBinary.html template
						// table is a child to the scalar
						if (scalarTableSettings.childrenSettings[table]) {
							format = scalarTableSettings.childrenSettings[table].columnFormats[column];
						}
						else {
							format = scalarTableSettings.columnFormats[column];
						}
					}
					else {
						settings = Tables.getSettings(Tables.mainTable);
						// ah ... the simplicity of the main grid
						format = settings.columnFormats[column];
					}
				}
				else {
					// column belongs to a parent, which one?!
					columnSplit = S(column).replaceAll('__internal.parentRows.', '').split('.');
					role = columnSplit[0];
					columnName = columnSplit[1];
					if (gridArea && gridArea === 'childGrid' ) {
						// this is being called from the childBinary.html template
						// we only need to inspect List parentSettings as a result
						if (scalarTableSettings.childrenSettings[table + 'List']) {
							format = scalarTableSettings.childrenSettings[table + 'List'].parentSettings[role].columnFormats[columnName];
						}
						else {
							if (scalarTableSettings.childrenSettings[table + 'List']) {
								format = scalarTableSettings.childrenSettings[table + 'List'].columnFormats[column];
							}
							else {
								format = scalarTableSettings.columnFormats[column];
							}
						}
					}
					else {
						//all area's outside the child grid use the same settings
						settings = Tables.getTableSettings(table);
						parentSettings = settings.parentSettings[role];
						format = parentSettings.columnFormats[columnName];
					}
				}

				if (!format) {
					try {
						// assumed child grid:
						scalarTableSettings = Tables.getSettings(Tables.formTable);
						filterTableSettings = scalarTableSettings.childrenSettings[table];
						gridColumnsByDataSource = _.indexBy(filterTableSettings.gridColumns, 'dataSource')
						format = gridColumnsByDataSource[column];
					}
					catch(e) {
						// this was not a binary parent column
					}
				}

				try {
					isDemoBinary = $rootScope.isDemoApp && format && format.generic_type == 'binary';
				}
				catch (e) {
					// format may still not be defined
				}
				if ((format && format.binaryType && input.length != 0) || isDemoBinary) {
					// defined binary type, output in the appropriate format
					if (format.binaryType === 'Image' || format.binaryType === 'image' || isDemoBinary) {
						if (angular.isDefined(input.value) && input.value.length) {
							return '<img class="row-image" src="data:image/jpeg;base64,' + input.value + '" />';
						}
						if (angular.isDefined(input.url)) {
							authSession = Settings.getAuthSession();
							append = Settings.getStamp(input.url);
							if ($rootScope.pictureUpdated) {
								append = Settings.setStamp(input.url, '&time=' + Math.floor(new Date().getTime()/1000));
								$rootScope.setPictureUpdatedStatus(false);
							}
							return '<img class="row-image" src="' + input.url + '?auth=' + authSession.apikey + ':1' + append + '" />';
						}
					}
				}
				bytes = numeral( input.length ).format( '0 b' ) + ' binary';
				return bytes;
			}
			else {
				//it's null, do nothing
				return input;
			}
		};
	}
]);
