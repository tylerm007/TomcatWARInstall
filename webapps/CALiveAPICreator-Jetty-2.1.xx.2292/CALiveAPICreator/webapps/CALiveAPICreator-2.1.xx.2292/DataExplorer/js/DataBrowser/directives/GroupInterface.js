espresso.app.directive('groupInterface', [

	function () {
		var GroupInterface = {
			restrict: 'A',
			scope: {
				group: '=',
				columns: '=',
				params: '=',
				index: '='
			},
			template: '<div class="grouping-area">' +
				'<form class="form-inline">' +
					'<div class="input-group">' +
						'<input ng-trim="false" ng-model="group.title" class="form-control form-inline" placeholder="Group Title">' +
						//'<div class="input-group-addon" ng-click="actions.addColumn()"><i class="fa fa-plus"></i></div>' +
						'<div class="input-group-addon" ng-click="actions.deleteGroup()"><i class="fa fa-times"></i></div>' +
					'</div>' +
				'</form>' +
				'<ul class="sortable grouping">' +
				'<li class="column-item btn-group" ng-repeat="key in group.columns" data-column-key="{{key}}">' +
					'<a class="btn btn-blank">{{columns[key].alias}}</a>' +
					'<a class="btn btn-blank" ng-click="removeColumn(columns[key]);"><i class="fa fa-times"></i></a></li>' +
				'</ul>' +
				'<button class="btn btn-default" ng-click="placeColumn();">Add Column</button>' +
			'</div>',
			//link: function (scope, element, attrs, controller) {},
			controller: [
				'$scope', 'Notifications', 'Events', '$modal',
				function ($scope, Notifications, Events, $modal) {
					$scope.removeColumn = function (column) {
						if (angular.isObject($scope.group.columns)) {
							$scope.group.columns = _.filter($scope.group.columns, function (value) {
								if (column.name == value) {
									return false;
								}
								return true;
							});
						}
						else {
							$scope.group.columns = _.without($scope.group.columns, column);
						}
					};
					$scope.actions = {
						deleteGroup: function deleteGroup() {
							//test case: sliced array equals expected result
							//test case: error/fail on columns in group

				 			var columnsCount = _.keys($scope.params.groups[$scope.index].columns).length;
				 			if (columnsCount>0) {
				 				Notifications.error('Groups with nested columns cannot be deleted. Please remove them before deleting.');
				 			}
				 			else {
				 				$scope.params.groups.splice($scope.index, 1);
				 			}
						}
					};
					var columns = $scope.columns;
					
					$scope.placeColumn = function () {
						$modal.open({
							controller: function ($modalInstance, scope, $scope) {
								//$scope = scope;
								$scope.columns = columns;
								$scope.addColumnToGroup = function (column) {
									if (angular.isObject(scope.group.columns)) {
										var vals = _.values(scope.group.columns);
										scope.group.columns[vals.length] = column.name;
									}
									else {
										scope.group.columns.push(column.name);
									}
									$modalInstance.close();
								};
							},
							resolve: {
								scope: function () { return $scope; }
							},
							template: '<div class="margin-15" ng-repeat="(key, value) in columns "><div class="btn btn-default" ng-click="addColumnToGroup(value)">{{value.alias}}</div></div>'
						});
						console.log( $scope);
					};
			 		Events.broadcast('OptionsRefreshSortable');
				}
			]
		};
		return GroupInterface;
	}
]);
