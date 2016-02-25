espresso.app.directive("espressoDetail",
		['$compile', 'Tables', 'Notifications', 'EspressoData', '$rootScope', '$modal', 'Notifications', 'Events', 'Masks',
		function ($compile, Tables, Notifications, EspressoData, $rootScope, $modal, Notifications, Events, Masks) {
	var $scope = $rootScope.$new(true);
	$scope.imageUrls = {};
	var Directive = null;

	// this defines no new template, because it uses the default directive template
	function setAsNumber($scope, input) {
		$scope.inputType = "text"; //if this is set to number, currencies cell formats won't output in some browsers
		$scope.inputStyle = "text-align: right; width: 300px;";
		
	}

	function setAsDate($scope, input) {
		$scope.inputFormat = 'yyyy-MM-dd';
		$scope.inputType = "text";
		$scope.inputClass = 'dateTypeInput';
		$scope.inputStyle = "width: 300px;";
		if ($scope.col.mask) {
			$scope.labelMask = "label-format='" + $scope.col.mask + "'";
		}
		var newCode =
			"<div style='{{containerExpressionStyles}};' class=\"{{parentDef && 'parent-lookup-column'}} date-input-container\">" +
				"<input ng-trim='false' ng-hide='editMode' type=\"text\" data-format='{{inputFormat}}' class=\"form-control scalarInput {{inputClass}} eslo-form-input\" id=\"att{{col.name}}\" " +
						"data-ng-model=\"row." + $scope.col.dataSource + "\" style=\"{{inputStyle}} display: inline-block;{{result}};\" " +
						"ng-readonly=\"!valueIsEditable\" " +
						"espresso-mask espresso-track-model ng-click=';clickReadonlyValue();'/>" +
						'<div espresso-date-input ng-model="row.' + $scope.col.dataSource + '" settings-reference="formTable" col="col"></div>' +
				"<span><button class='fa fa-caret-square-o-up parentSelectButton' " +
				"style='font-size: 12pt; display: inline-block;' " +
					"ng-show='editMode' " +
					"ng-click='parentSelectFunction(col)' title='Select parent'></button></span>" +
				"<span><button class='fa fa-search-plus parentNavButton' " +
					"style='font-size: 12pt; display: inline-block;' " +
					"ng-click='parentZoom()' title='Zoom in on parent'></button></span>" +
			"</div>";
		input.replaceWith($compile(newCode)($scope));
	}

	function setAsDateTime($scope, input) {
		$scope.inputFormat = 'yyyy-MM-dd HH:mm:ss';
		$scope.inputType = "text";
		$scope.inputClass = 'dateTypeInput';
		$scope.inputStyle = "width: 300px;";
		if ($scope.col.mask) {
			$scope.labelMask = "label-format='" + $scope.col.mask + "'";
		}
		else {
			$scope.labelMask = "label-format='" + $scope.inputFormat + "'";
		}
		var newCode =
			"<div class='date-input-container'>" +
				"<input ng-trim='false' ng-hide='editMode' type=\"text\" data-format='{{inputFormat}}' class=\"form-control scalarInput {{inputClass}} eslo-form-input\" id=\"att{{col.name}}\" " +
						"data-ng-model=\"row." + $scope.col.dataSource + "\" style=\"{{inputStyle}} display: inline-block;{{result}}\" " +
						"ng-readonly=\"!valueIsEditable\" " +
						"espresso-mask espresso-track-model ng-click=';clickReadonlyValue();'/>" +
						'<div espresso-date-input ng-model="row' + $scope.col.dataSource + '" settings-reference="formTable" col="col"></div>' +
				"<span><button class='fa fa-caret-square-o-up parentSelectButton' " +
				"style='font-size: 12pt; display: inline-block;' " +
					"ng-show='editMode' " +
					"ng-click='parentSelectFunction(col)' title='Select parent'></button></span>" +
				"<span><button class='fa fa-search-plus parentNavButton' " +
					"style='font-size: 12pt; display: inline-block;' " +
					"ng-click='parentZoom()' title='Zoom in on parent'></button></span>" +
			"</div>";
		input.replaceWith($compile(newCode)($scope));
	}

	function setAsTime($scope, input) {
		$scope.inputFormat = 'HH:mm:ss';
		$scope.inputType = "text";
		$scope.inputClass = 'dateTypeInput';
		$scope.inputStyle = "width: 300px;";
	}

	function setAsTimestamp($scope, input) {
		//console.log('timestamp');
		$scope.inputFormat = 'yyyy-MM-ddTHH:mm:ss.sss';
		$scope.inputType = "text";
		$scope.inputClass = 'dateTypeInput';
		$scope.inputStyle = "width: 300px;";
		if ($scope.col.mask) {
			$scope.labelMask = "label-format='" + $scope.col.mask + "'";
		}
		else {
			$scope.labelMask = "label-format='" + $scope.inputFormat + "'";
		}
		var newCode = "<div>" +
				"<input ng-trim='false' ng-hide='editMode' type=\"text\" class=\"form-control scalarInput {{inputClass}} eslo-form-input\" id=\"att{{col.name}}\" " +
					"data-ng-model=\"row." + $scope.col.dataSource + "\" style=\"{{inputStyle}} display: inline-block;{{result}}\" " +
					"ng-readonly=\"!valueIsEditable\" " +
					"espresso-mask espresso-track-model ng-click=';clickReadonlyValue();'/>" +
					'<div espresso-date-input ng-model="row.' + $scope.col.dataSource + '" settings-reference="formTable" col="col"></div>' +
				"<span><button class='fa fa-caret-square-o-up parentSelectButton' " +
					"style='font-size: 12pt; display: inline-block;{{result}}' " +
					"ng-show='editMode' " +
					"ng-click='parentSelectFunction(col)' title='Select parent'></button></span>" +
				"<span><button class='fa fa-search-plus parentNavButton' " +
					"style='font-size: 12pt; display: inline-block;' " +
					"ng-click='parentZoom()' title='Zoom in on parent'></button></span>" +
			"</div>";
		input.replaceWith($compile(newCode)($scope));
	}

	function setAsBoolean($scope, input) {
		// For checkboxes, we have to compile the code, otherwise Angular doesn't
		// know that it's a checkbox.
		var newCode =
			"<div class='boolean-input-container'>" +
				"<input type=\"checkbox\" class=\"form-control scalarInput eslo-form-input\" id=\"att{{col.name}}\" " +
					"ng-model=\"row[col.dataSource]\" style=\"{{inputStyle}};{{result}}\" " +
					"ng-readonly=\"!valueIsEditable\"  ng-disabled='!valueIsEditable' " +
					"ng-click=';clickReadonlyValue();'/>" +
			"</div>";
		input.replaceWith($compile(newCode)($scope));
	}

	function setAsBinary($scope, input) {
		var newCode =
			'<div class="well">' +
				'<div class="btn-group">' +
					'<div id="content{{col.name}}"></div>' +
					'<span ng-if="columnSettings.hexViewable && row[col.name].value && row[col.name].length <= 128" ' +
						'ng-init="convertToHex(row[col.name].value)" ng-click="viewHex(row[col.name])">{{hexedColumnValue}}</span>' +
					'<button ng-if="columnSettings.hexViewable" ng-hide="row[col.name].url || row[col.name].length <= 128" ng-click="viewHex(row[col.name])">hex value</button>' +
					'<button class="dropdown-toggle" data-toggle="dropdown" ng-hide="columnSettings.hexViewable">&hellip;</button>' +
					'<ul class="dropdown-menu" role="menu" style="cursor: pointer;{{result}}">' +
						'<li><a ng-click="showAsImage(col)">Show as image</a>' +
						'<li><a ng-click="showAsSound(col)">Show as sound</a>' +
						'<li ng-show="$root.root.editMode"><a ng-click="uploadFile()">Upload file&hellip;</a>' +
						'<li ng-if="isDownloadable" ng-show="$root.root.editMode"><a ng-click="downloadFile()">Download file&hellip;</a>' +
					'</ul>' +
			'</div>';
		input.replaceWith($compile(newCode)($scope));
		if ($scope.col.binaryType == 'Image') {
			$scope.$evalAsync(function () { Directive.showAsImage($scope.col); });
		}
		if ($scope.col.binaryType === 'Audio') {
			$scope.$evalAsync(function () { Directive.showAsSound($scope.col); });
		}
	}

	function setAsText($scope, input) {
		$scope.inputType = "text";
		if ($scope.col) {
			$scope.inputStyle = "width: 300px;";
			var textTemplate = Masks.getTemplate($scope.col.mask);
			
			if (textTemplate) {
				input.replaceWith($compile(textTemplate)($scope));
			}
		}
		return '';
	}

	Directive = {
		restrict: "E",        // directive is an Element (not Attribute)
		replace: true,
		scope: {              // set up directive's isolated scope
			tableName: "=",   // Both passed by reference
			col: "=",
			row: "=",
			editMode: "=",
			parentSelectFunction: "="
		},
		template:             // replacement HTML (can use our scope vars here)
			"<div>" +
				"<input ng-trim='false' ng-change='updateFormInput();' type=\"text\" data-format='{{inputFormat}}' class=\"form-control scalarInput {{inputClass}} eslo-form-input\" id=\"att{{col.name}}\" " +
						"ng-model=\"row[col.dataSource]\" ng-blur='onBlurEvent();' style=\"{{inputStyle}} display: inline-block;{{result}};\" " +
						"ng-readonly=\"!valueIsEditable\" " +
						"espresso-mask espresso-track-model ng-click=';clickReadonlyValue();'/>" +
				"<span espresso-input-actions data-actions='parentSelect,downloadable,parentZoom,nullable'></span>" +
			"</div>",
		replace: true,        // replace original markup with template
		transclude: false,    // do not copy original HTML content
		link: function ($scope, element, attrs, controller) {
			$scope.popupExternalModal = function popupExternalModal(url) {
				$modal.open({
					backdrop	: true,
					keyboard	: true,
					templateUrl	: 'templates/modals/iframePopup.html',
					resolve : {
						row: function () {return $scope.row;},
						col: function () {return $scope.col;}
					},
					controller : function (row, $scope, col) {
						$scope.url = row[col.name];
					},
					windowClass: 'full-screen-modal'
				});
			};
			var $detailsScope = angular.element('.details-content').scope();
			var tableInfo = Tables.getDetails($scope.tableName);
			var input = element.find("input");
			$scope.inputClass = '';
			$scope.inputFormat = '';
			$scope.labelMask = '';

			var attribute = $scope.row[$scope.col.name];
			$scope.genericTypeSwitchBoolean = $scope.col.generic_type;
			
			if ($scope.col.generic_type != 'binary' && angular.isObject(attribute) && attribute.url) {
				$scope.genericTypeSwitchBoolean = 'binary';
				$scope.isOversizedColumn = true;
			}
			
			switch ($scope.genericTypeSwitchBoolean) {
			case 'boolean':
				setAsBoolean($scope, input);
				break;
			case 'number':
				setAsNumber($scope, input);
				break;
			case 'date':
				switch ($scope.col.type) {
				default:
					setAsDateTime($scope, input);
					break;
				case 'DATE':
					setAsDate($scope, input);
					break;
				case 'DATETIME':
					setAsDateTime($scope, input);
					break;
				case 'TIME':
					setAsTime($scope, input);
					break;
				case 'TIMESTAMP':
					setAsTimestamp($scope, input);
					break;
				}
				break;
			case 'binary':
				setAsBinary($scope, input);
				break;
			case 'text':
				setAsText($scope, input);
				break;
			case 'other':
				setAsText($scope, input);
				break;
			}

			if ($scope.col.parentRole) {
				var parentTemplate =
					"<div>" +
						"<table><tr><td>" +
							"<input ng-trim='false' espresso-track-model type=\"text\" class=\"form-control scalarInput eslo-form-input\" id=\"att{{col.name}}\" " +
									"ng-model=\"row." + $scope.col.dataSource + "\" style=\"{{inputStyle}};{{result}};\" " +
									"ng-readonly=\"!valueIsEditable\" " +
									"espresso-mask/>" +
							"</td><td>" +
								"<button ng-click='clickReadonlyValue(); parentSelectFunction(col)' " +
									"ng-show='showLookupButton'><i class=\"fa fa-caret-square-o-up\"></i></button>" +
						"</td></tr></table>" +
						//"{{row." + $scope.col.dataSource + "}}" +
					"</div>";
				input.replaceWith($compile(parentTemplate)($scope));
			}

			$scope.$watch("row", function (newVal, oldVal) {
				if ($scope.inputType) {
					input.attr('type', $scope.inputType);
				}
				if ($scope.col.parentRole) {
					$scope.valueIsEditable = false;
					if ($scope.editMode)
						$scope.showLookupButton = true;
				}
				else
					$scope.valueIsEditable = $scope.col.is_editable && $scope.editMode;
			});

			$scope.$watch("editMode", function () {
				$scope.valueIsEditable = $scope.col.is_editable && $scope.editMode;
				if ($scope.col.parentRole) {
					$scope.valueIsEditable = false;
					//console.log('DetailInput: editMode has changed: ' + $scope.editMode);
					$scope.showLookupButton = $scope.editMode && ($scope.col.parentRole != null);
					//console.log('DetailInput: editMode has changed: ' + $scope.showLookupButton +
					//		' for column ' + $scope.col.name);
				}
			});
			$scope.imageUrls = {};
		
			$scope.setImageValue = function setImageValue() {
				//Column.isType('image')
				//FormRow.hasColumn($scope.col.name)
					//FormRow.getColumn($scope.col.name).value
					//else
					//FormRow.getColumn($scope.col.name).url
				//$scope.updateImageUrls(url) -> $scopeimageUrls[$scope.col.name]
				//$scope.insertImages() -> $(#content + $scope.col.name).html(<img/)
				if ($scope.col.binaryType != 'image') {
					return;
				}
				if ($detailsScope.scalarRow[$scope.col.name] && $detailsScope.scalarRow[$scope.col.name].value) {
					url = "data:image/png;base64," + $detailsScope.scalarRow[$scope.col.name].value;
				}
				else if ($detailsScope.scalarRow[$scope.col.name].url) {
					url = $detailsScope.scalarRow[$scope.col.name].url + "?auth=" + espresso.globals.apiKeyValue + ":1&time=" + Math.floor(new Date().getTime()/1000);
				}
				else {
					$('#content' + col.name).html('');
					return;
				}
				$scope.imageUrls[$scope.col.name] = url;
				$('#content' + $scope.col.name).html('<img class="scalarImage typeA" src="'+
						$scope.imageUrls[$scope.col.name] +'&time=' + new Date().getTime() + '" style="max-height: 200px;"/>');
			},

			$scope.uploadFile = function uploadFile() {
				if ($scope.row['@metadata'].action === 'INSERT' || !$scope.row['@metadata'].href) {
					Notifications.warnPopup('A record must be saved before uploading files assigned to it.');
					return;
				}
				if ( ! $rootScope.root.editMode) {
					alert('This can only be done in Edit mode');
					return;
				}
				(function (sc) {
					var instance = $modal.open({
						backdrop	: true,
						keyboard	: true,
						templateUrl	: 'templates/modals/uploadFile.html',
						controller	: 'espresso.FileUploadCtrl',
						resolve		: {
							row: function () { return $scope.row; },
							col: function () { return $scope.col; },
							callback : function () { return function (data) {
								var $listScope = angular.element('#leftGridContainer').scope();
								var listRowIndex = $listScope.gridData.indexOf($listScope.grid.gridOptions.selectedItems[0]);
								$listScope.gridData[listRowIndex][$scope.col.name] = data[0][$scope.col.name];
								var gridData = angular.copy($listScope.gridData);
								$listScope.gridData = [];
								//$detailsScope.scalarRow = data[0];
								sc.setImageValue();
								$listScope.gridData = gridData;
								Events.broadcast('RefreshMainGrid');
								$listScope.$evalAsync(function () {
									$listScope.gridData[listRowIndex]['@metadata']['checksum'] = data[0]['@metadata']['checksum'];
									var currentAction = angular.copy($listScope.gridData[listRowIndex]['@metadata'].action);
									$listScope.gridData[listRowIndex]['@metadata'].action = currentAction;
									if (!currentAction) {
										//there was no current action, copy the current into the original so the UI does not prompt to save changes
										$listScope.gridData[listRowIndex]['__original'] = angular.copy($listScope.gridData[listRowIndex])
									}
									//console.log($listScope.gridData[listRowIndex]);
									$listScope.grid.gridOptions.selectedItems[0] = $listScope.gridData[listRowIndex];
									//$listScope.grid.gridOptions.selectItem(listRowIndex, false);
								});
							}; }
						}
					});
					instance.result['finally'](function () {
						Events.broadcast('RefreshMainGrid');
					});
				})($scope);
			};

			// Show the nav button to the parent?
			if (tableInfo.parents) {
				parentLoop:
				for (var i = 0; i < tableInfo.parents.length; i++) {
					for (var j = 0; j < tableInfo.parents[i].child_columns.length; j++) {
						if (tableInfo.parents[i].child_columns[j] == $scope.col.name) {
							$scope.parentDef = tableInfo.parents[i];
							break parentLoop;
						}
					}
				}
			}
			if ( ! $scope.parentDef) {
				element.find('button.parentNavButton').replaceWith("");
				element.find('button.parentSelectButton').replaceWith("");
			}
		},

		showAsImage: function showAsImage(col, isSaveNecessary) {
			var url = "";
			var $detailsScope = angular.element('.details-content').scope();
			if (angular.isUndefined($detailsScope.scalarRow) && angular.isUndefined($detailsScope.scalarRow[col.name])) {
				//we arrived here via a look up and the scalarRow is not updated yet?
				return;
			}
			if ($detailsScope.scalarRow[col.name].value) {
				url = "data:image/png;base64," + $detailsScope.scalarRow[col.name].value;
			}
			else {
				//the value being undefined does not always mean the url is defined
				if ($detailsScope.scalarRow[col.name].url) {
					url = $detailsScope.scalarRow[col.name].url + "?auth=" + espresso.globals.apiKeyValue + ":1&time=" + Math.floor(new Date().getTime()/1000);
				}
				else {
					Notifications.info('No binary data found.');
					return;
				}
			}

			if (isSaveNecessary === true) {
				scalarTableSettings = Tables.getSettings(Tables.formTable);
				scalarTableSettings.columnFormats[col.name].binaryType = 'image';
				Tables.saveTableSettings(scalarTableSettings.name);
			}
			
			$scope.$watch('col.mask', function (current, previous) {
				setAsText($scope);
			}, true);
			$scope.imageUrls[col.name] = url;
			$detailsScope.$watch('scalarRow', function updateImageOnRowChange(current, previous) {
				if (col.binaryType != 'Image' && col.binaryType != 'image') {
					return;
				}
				if ( angular.isUndefined($detailsScope.scalarRow[col.name]) || angular.equals($detailsScope.scalarRow[col.name], null) ) {
					//console.log('Column null or not found: ' + col.name);
					$('#content' + col.name).html('');
					return;
				}
				if ($detailsScope.scalarRow[col.name] && $detailsScope.scalarRow[col.name].value) {
					url = "data:image/png;base64," + $detailsScope.scalarRow[col.name].value;
				}
				else if ($detailsScope.scalarRow[col.name].url) {
					url = $detailsScope.scalarRow[col.name].url + "?auth=" + espresso.globals.apiKeyValue + ":1";
				}
				else {
					$('#content' + col.name).html('');
					return;
				}
				$scope.imageUrls[col.name] = url;
				$('#content' + col.name).html('<img class="scalarImage" src="'+ $scope.imageUrls[col.name] +'" style="max-height: 200px;"/>');
				//console.log($('#content' + col.name).find('img').attr('src'));
			});
		},

		showAsSound: function showAsSound(col, isSaveNecessary) {
			try {
				if (!$detailsScope) {return;}
			} catch(e) {
				//redigest, because JS is tripping on an undefined variable
				$rootScope.$evalAsync(function () {
					Events.broadcast('RefreshMainGrid');
				});
				return;
			}
			var url = $detailsScope.scalarRow[col.name].url + "?auth=" + espresso.globals.apiKeyValue + ":1";
			if (isSaveNecessary === true) {
				$detailsScope.scalarTableSettings.columnFormats[col.name].binaryType = 'audio';
				$detailsScope.scalarTableSettings.columnFormats[col.name].extensionType = 'mpeg';
				Tables.saveTableSettings($detailsScope.scalarTableSettings.name);
			}
			$('#content' + col.name).html('<audio controls><source src="' + url + '" type="audio/'+
					$detailsScope.scalarTableSettings.columnFormats[col.name].extensionType+
			'">Not supported by browser</audio>');
		},
		/////////////////////////////////////////////////////////////////////////////
		controller: ["$scope",'$rootScope', 'Events', '$modal', 'EspressoData', 'Device', 'Notifications',
		function ($scope, $rootScope, Events, $modal, EspressoData, Device, Notifications) {
			$scope.onBlurEvent = function () {
				if ($scope.col.generic_type === 'number') {
					Events.broadcast('ColumnSettingsUpdate');
				}
			};
			

			var scalarTableSettings = Tables.getSettings(Tables.formTable);
			var scalarColumns = scalarTableSettings.scalarColumns;
			if (scalarColumns) {
				$scope.columnSettings = scalarColumns[$scope.col.name];
			}
			$scope.convertToHex = function (value) {
				$scope.hexedColumnValue = '';
				_.each(value, function (e, i) {
					$scope.hexedColumnValue += e.charCodeAt(0).toString(16);
					$scope.hexedColumnValue += ' ';
				});
				
			};
			$scope.viewHex = function (value) {
				if (value.url) {
					alert('Binary values of this length are not viewable as a hex');
				}
				binaryValue = value.value;
				var modal =  $modal.open({
					backdrop	: true,
					keyboard	: true,
					template	: '<div>{{hexString}}</div>',
					scope: $scope,
					controller	: [
						'$scope', '$modalInstance',
						function ($scope, $modalInstance) {
							$scope.hexString = '';
							_.each(binaryValue, function (e, i) {
								$scope.hexString += e.charCodeAt(0).toString(16);
								$scope.hexString += ' ';
							});
							$scope.cancel = function cancel() {
								$modalInstance.close();
							};
						}]
				});
			};
			
			$scope.foreignKeys = {};
			$scope.foreignTables = {};
			$scope.createForeignKeyList = function createForeignKeyList() {
				var details = Tables.getDetails($scope.tableName);
				
				_.each(details.parents, function (relationship, index) {
					_.each(relationship.child_columns, function (columnName, i) {
						if (angular.isUndefined($scope.foreignKeys[columnName])) {
							$scope.foreignKeys[columnName] = {};
						}
						$scope.foreignKeys[columnName][relationship.name] = relationship.child_columns;
						$scope.foreignTables[relationship.name] = relationship.parent_table;
					});
				});
			};
			$scope.createForeignKeyList();
			
			$scope.isForeignKeyColumn = function (columnName) {
				return angular.isDefined($scope.foreignKeys[columnName]);
			};
			
			//a complex foreign key column may be a index for more than one relationship
			$scope.isComplexForeignColumn = function isComplexForeignColumn(columnName) {
				return true;
				if ($scope.foreignKeys[columnName]) {
					var relationships = _.values($scope.foreignKeys[columnName]);
					
					if (relationships.length > 1) {
						return true;
					}
				}
				return false;
			};
			
			$scope.promptToNullifyRelationshipColumns = function promptToNullifyRelationshipColumns(columnName) {
				var modal =  $modal.open({
					backdrop	: true,
					keyboard	: true,
					templateUrl	: 'templates/modals/complexRelationshipNullification.html',
					scope: $scope,
					controller	: [
						'$scope', '$modalInstance', 'relationships', 'columnName', 'parentTables',
						function ($scope, $modalInstance, relationships, columnName, parentTables) {
							
							$scope.relationships = relationships
							$scope.parentTables = parentTables;
							
							$scope.closeAndNullify = function closeAndNullify() {
								$scope.$emit('nullifyColumns', [columnName]);
								$modalInstance.close();
							};
							
							$scope.cancel = function cancel() {
								$modalInstance.close();
							};
						}],
					resolve		: {
						relationships: function () { return $scope.foreignKeys[columnName]; },
						columnName: function () { return columnName; },
						parentTables: function () { return $scope.foreignTables; }
					}
				});
			};
			
			$scope.$on('nullifyColumns', function (event, columns) {
				_.each(columns, function (columnName, index) {
					if ($scope.row && columnName && $scope.row[columnName]) {
						$scope.row[columnName] = null;
					}
				});
			});
			
			//nullify a single attribute, or prompt to nullify a multi-column index
			$scope.nullify = function nullify() {
				if ($scope.isForeignKeyColumn($scope.col.name)) {
					if ($scope.isComplexForeignColumn($scope.col.name)) {
						$scope.promptToNullifyRelationshipColumns($scope.col.name);
					}
					else {
						$scope.$broadcast('nullifyColumns', _.values($scope.foreignKeys[$scope.col.name])[0]);
					}
				}
				else {
					$scope.$broadcast('nullifyColumns', [$scope.col.name]);
				}
			};
			
			var columnName = $scope.col.name;
			$scope.isDownloadable = true;
			$scope.downloadFile = function downloadFile() {
				if ($scope.isBinaryWithValue()) {
					//download binary value
					var binary = $scope.getBinaryValue();
					$scope.promptExtensionModal('binary', binary);
				}
				else {
					if ($scope.isPlainText()) {
						$scope.promptExtensionModal('plaintext', $scope.row[columnName]);
					}
					else {
						//download binary url
						var url = $scope.getBinaryUrl();
						$scope.promptExtensionModal('url', url);
					}
				}
			};

			$scope.promptExtensionModal = function promptExtensionModal(type, value) {
				//grab suspected extension type;
				var instance = $modal.open({
					backdrop	: true,
					keyboard	: true,
					templateUrl	: 'templates/modals/downloadExtensionType.html',
					controller	: ['$scope', '$http', '$modalInstance', function ($scope, $http, $modalInstance) {
						//set options here
						$scope.extension = '';
						$scope.file = {};
						$scope.supportedExtensions = {
							'Plain Text' : '.txt',
							'PNG' : '.png',
							'Generic' : ''
						};

						$scope.updateExtension = function updateExtension(scope) {
							$scope.extension = scope.extension;
						};
						function download(ext, url) {
							var a = document.createElement('a');

							a.download = $scope.file.name + ext;
							a.href = url;
							a.click();
						}

						$scope.startDownload = function startDownload() {
							if (angular.equals($scope.file.name, '') || !$scope.file.name) {
								$scope.file.name = 'file';
							}
							if (type == 'url') {
								var url = value + "?auth=" + espresso.globals.apiKeyValue + ":1&downloadName=" + $scope.file.name + $scope.extension;
								console.log(url);
								//download($scope.extension, url);
								window.open(url);
							}
							else {
								if (type == 'plaintext') {
									download($scope.extension, 'data:text/octet-stream;plain,' + escape(value));
								}
								else {
									download($scope.extension, 'data:image/jpeg;base64,' + value);
									//window.open('data:image/jpeg;base64,' + value);
								};
							}
							$modalInstance.close();
						};
					}],
					resolve		: {
						childTableInfo: function(){ return currentTableDetails; },
						childRow: function(){ return $scope.selectedRows[0]; },
						roleNames: function(){ return [roleName]; },
						callback : function(){ return $scope.parentSelected; }
					},
					resolve: {}
				});
			};
			$scope.getBinaryValue = function getBinaryValue() {
				return $scope.row[columnName].value;
			};;
			$scope.getBinaryUrl = function getBinaryUrl() {
				return $scope.row[columnName].url;
			};
			//in relation to file type
			$scope.isBinaryWithValue = function isBinaryWithValue() {
				return angular.isDefined($scope.row[columnName].value);
			};
			//in relation to file type
			$scope.isPlainText = function isPlainText() {
				return angular.isUndefined($scope.row[columnName].value) && angular.isUndefined($scope.row[columnName].url);
			};

			$rootScope.containerExpressionStyles = {};
			$scope.expressionsMode = false;
			Events.on('ToggleFormExpressions', function (event, data) {
				$scope.expressionsMode = !$scope.expressionsMode;
			});

			$scope.$watch('expressionsMode', function toggleExpressionEvaluations(current) {
				if (current) {
					Evaluator({}).build();
				}
				else {
					Evaluator($scope.col.eval).build();
				}
			});

			function evaluateExpression(data) {
				var result = false;
				if (!data || !data.expression) {return '';} //if the expression is an empty string, return empty string;
				var row = $scope.row;
				var hasRole = $scope.hasRole;
				var action = $scope.action;
				var parents = $scope.parents;
				var evaluatesTo = $scope.$eval(data.expression);
				//console.log(evaluatesTo, data.expression, data.onTrue, data.onFalse);
				if (evaluatesTo) {
					return data.onTrue;
				}
				return data.onFalse;
			}

			$scope.hasRole = function (role) {
				if ($scope.row['__internal'].parentRows[role]) {
					return true;
				}
				return false;
			};

//			$scope.$watch('row[' + $scope.col.name + ']', function (current, previous) {
//				var scalarTableSettings = Tables.getSettings(Tables.formTable);
//				if (!current && scalarTableSettings.columnFormats[$scope.col.name]['default'] ) {
//					console.log($scope.col.name, current, scalarTableSettings.columnFormats[$scope.col.name]['default']);
//					$scope.row[$scope.col.name] = scalarTableSettings.columnFormats[$scope.col.name]['default'];
//				}
//			});

			
			$scope.$watch('row', function (current, previous) {
				if ($scope.row) {					
					
					if ($scope.row['__internal'] && $scope.row['__internal'].parentRows && _.keys($scope.row['__internal'].parentRows).length>0) {
						$scope.parents = $scope.row['__internal'].parentRows;
					}
					$scope.action = $scope.row['@metadata'].action;
					setTimeout(function () {
						Evaluator($scope.col.eval).build();
						if (!angular.equals(previous['__original'], current['__original'])) {
							$scope.$broadcast('RefreshDetailInput');
						}
					}, 0);
				}
			}, true);
			var tableInfo = Tables.getDetails($scope.tableName);
			var $detailsScope = angular.element('.details-content').scope();
			
			$scope.updateFormInput = function updateFormInput(booleanUtf8Encode) {
				if (booleanUtf8Encode) {
					//$scope.row[columnName] = unescape($scope.row[columnName].replace(' ', '+'));
				}

				$scope.$evalAsync(function () {
					Events.broadcast('UpdateFormInput');
				});
			};

			Events.on('ColumnExpressionUpdate', function (event, data) {
				$scope.result = '';
				$rootScope.containerExpressionStyles[$scope.col.name] = '';
				if (data.column.name == $scope.col.name) {
					Evaluator(data.eval).build();
				}
			});

			var Evaluator = function (evals) {
				var evaluator = {};
				var cssBaseClass = 'custom-' + S($scope.tableName).slugify().s;
				var containerClass = 'column-container-' + S($scope.col.name).slugify().s;

				evaluator.teardown = function () {
					angular.element('style[class^=' + cssBaseClass + '-' + S($scope.col.name).slugify().s + ']').remove();
				};
				evaluator.styles = '';
				evaluator.evaluate = function (expression, index) {
					var customClass = cssBaseClass + '-' + S($scope.col.name).slugify().s + '-' + index;
					var raw = expression.selector.split(',')[0];
					var selector = '.' + containerClass + ' ' + raw;

					if (raw == '') {
						return;
					}

					//remove classes
					angular.element('.' + customClass).removeClass(customClass);

					//add classes and style element
					if (expression.selector.charAt(0) == '/') {
						selector = expression.selector.replace('/', '').split(',')[0];
					}
					var $selected = angular.element(selector);

					$selected.addClass(customClass);
					var styleElementString = '<style>#app .' + customClass + '{' + evaluateExpression(expression) + '}</style>';
					evaluator.styles += styleElementString;
					angular.element(styleElementString)
						.addClass(customClass)
						.appendTo('body');
				};
				//arg: when defined, it will set expressionsMode to value
					//otherwise expressionsMode always assumes true
				evaluator.build = function (setExpressionModeBool) {
					evaluator.teardown();
					angular.forEach(evals, evaluator.evaluate);
				};
				return evaluator;
			};
			$scope.Evaluator = Evaluator; //for testing purposes
			
			$scope.clickReadonlyValue = function (value) {
				if ( !$rootScope.root.editMode ) {
					Notifications.error('You are not in edit mode -- switch to edit mode if you want to edit this value.');
				}
			};
			var col = $scope.col;
			$detailsScope.$watch('scalarRow', function updateImageOnRowChange(current, previous) {
				if ($scope.col.binaryType != 'image') {
					return;
				}
				if ( angular.isUndefined($detailsScope.scalarRow[col.name]) || angular.equals($detailsScope.scalarRow[col.name], null) ) {
					//console.log('Column null or not found: ' + col.name);
					$('#content' + col.name).html('');
					return;
				}
				if ($detailsScope.scalarRow[col.name] && $detailsScope.scalarRow[col.name].value) {
					url = "data:image/png;base64," + $detailsScope.scalarRow[col.name].value;
				}
				else if ($detailsScope.scalarRow[col.name].url) {
					url = $detailsScope.scalarRow[col.name].url + "?auth=" + espresso.globals.apiKeyValue + ":1&time=" + Math.floor(new Date().getTime()/1000);
				}
				else {
					$('#content' + col.name).html('');
					return;
				}
				$scope.imageUrls[col.name] = url;
				$('#content' + col.name).html('<img class="scalarImage" src="'+ $scope.imageUrls[col.name] +'" style="max-height: 200px;"/>');
				//console.log($('#content' + col.name).find('img').attr('src'));
			});
			$scope.getParentValue = function (roleName) {
				return "Value for " + roleName;
			};

			$scope.showAsImage = function (col) {
				Directive.showAsImage(col, true);
			};

			$scope.showAsSound = function (col) {
				Directive.showAsSound(col, true);
			};

			$scope.parentZoom = function () {
				if (EspressoData.isSaveable()) {
					Notifications.promptUnsaved();
				}
				else {
					if ( ! $scope.row)
						return;

					// Build the filter to get the parent
					var filter = "";
					for (var i = 0; i < $scope.parentDef.parent_columns.length; i++) {
						if (i > 0)
							filter += "&";
						filter += $scope.parentDef.parent_columns[i];
						filter += "=";
						var prefix = "";
						var value = '' + $scope.row[$scope.parentDef.child_columns[i]];
						switch (tableInfo.columnsByName[$scope.col.name].type) {
							case 'CHAR':
							case 'NCHAR':
							case 'NVARCHAR':
							case 'VARCHAR':
								prefix = "'";
								break;
						}

						filter += prefix + value.replace(/'/, "''") + prefix;
					}

					// Get the details on the parent table
					var tblDetails = $rootScope.allTables[$scope.parentDef.parent_table];

					// Retrieve the parent
					EspressoData.query($scope.parentDef.parent_table, null, filter, function (data) {
						(function () {
							var $childrenScope = angular.element('#childCollections').scope();
							$childrenScope.parentZoom(data[0], $scope.parentDef.parent_table);
						})();
					});
				}
			};
		}]
	};
	return Directive;
}]);
