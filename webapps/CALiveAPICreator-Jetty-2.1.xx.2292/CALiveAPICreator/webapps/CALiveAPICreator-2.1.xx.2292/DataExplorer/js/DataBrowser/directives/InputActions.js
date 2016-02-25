espresso.app.directive( 'espressoInputActions' , [
	
	function(){
		var Directive = {
			restrict : 'A',
			template : 
				'<div class="btn-group" ng-if="displayable && col.generic_type != \'binary\'" ng-show="hasActionables">' +
					'<div id="action-menu-{{col.name}}"></div>' +
					'<button class="dropdown-toggle medium-gray" data-toggle="dropdown" ng-hide="columnSettings.hexViewable"><i style="font-size:18px" class="fa fa-ellipsis-h"></i></button>' +
					'<ul class="dropdown-menu" role="menu" style="cursor: pointer;{{result}}">' +
						"<li ng-if='parentDef' ng-init='doDisplay(\"parentSelect\");'><a class='parentSelectButton' " +
							"ng-show='editMode' " +
							"ng-click='parentSelectFunction(col)'>Select Parent</a></li>" +
						"<li ng-if='parentDef' ng-init='doDisplay(\"parentZoom\");'><a class='parentNavButton' " +
							"ng-click='parentZoom()' title='Zoom in on parent'>Parent Zoom</a></li>" +
						'<li ng-if="col.downloadable" ng-init="doDisplay(\'downloadable\')"><a ' +
							'ng-click="downloadFile()"' +
							'>Download</a></li>' +
						"<li ng-if='col.is_nullable && col.is_editable' ng-init='doDisplay(\"nullable\")' ng-show='col.generic_type != \"binary\"'><a ng-if='col.is_editable' " +
							"ng-click='nullify();updateFormInput();' title='NULL'>Set to NULL</a></li>" +
						"<li ng-if='col.mask==\"link\"' ng-init='doDisplay(\"link\")' ng-show='col.generic_type != \"binary\"'><a " +
							" href='{{row[col.dataSource]}}' target='_blank'>External Link</a></li>" +
						"<li ng-if='col.mask==\"popup\"' ng-init='doDisplay(\"popup\")' ng-show='col.generic_type != \"binary\"'><a " +
							" href='javascript:void(0);' ng-click='popupExternalModal(row[col.dataSource])' target='_blank'>Modal Link</a></li>" +
						"<li ng-if='col.mask==\"imgSrc\"' ng-init='doDisplay(\"imgSrc\")'><a " +
							" href='{{row[col.dataSource]}}' target='_blank'>External Link</a></li>" +
						"<li ng-if='col.generic_type == \"date\" && col.is_editable' ng-init='doDisplay(\"nullable\")'><a " +
							"ng-click='clickThroughToDate($event);' title='Set Date Input'>Set Date Input</a></li>" +
					'</ul>' +
				'</div>',
			link : function( scope , element , attributes , controller ) {
				scope.actions = {};
				scope.displayable = true;
				if (attributes.actions) {
					var actions = attributes.actions.split(',');
					_.each(actions, function (element, index) {
						scope.actions[element] = true;
					});
				}
				else {
					scope.displayable = false;
				}
			},
			controller : function ($scope) {
				$scope.clickThroughToDate = function (event) {
					$(event.target).closest('.column-container').find('.fa-calendar').click();
				};
				$scope.doDisplay = function (action) {
					$scope.actions[action] = true;
					// if one element is visible, the menu is displayable
					$scope.hasActionables = true;
				};
			}
		};
		return Directive;
}]);