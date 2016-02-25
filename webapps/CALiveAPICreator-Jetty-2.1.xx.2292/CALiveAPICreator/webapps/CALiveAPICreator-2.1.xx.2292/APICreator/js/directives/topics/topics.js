kahuna.app.directive('topics', function () {
		var Topic = {
			restrict: 'E',
			transclude: true,
			scope: {},
			controller: function ($scope, $q, KahunaData, $rootScope) {
				//////////////////////////////////////////////////
				// Topics
				$scope.data = {};
				$scope.selectedProj = angular.copy($rootScope.currentProject);

				function fetchTopics() {
					var deferred = $q.defer();
					if (!$scope.selectedProj) {
						deferred.reject();
						return deferred.promise;
					}
					KahunaData.query('admin:topics', {
						pagesize: 1000,
						sysfilter: 'equal(project_ident:' + $scope.selectedProj.ident + ')',
						sysorder: '(name:asc_uc,name:desc)'
					}, function (data) {
						$scope.data.topics = [];
						for (var i = 0; i < data.length; i += 1) {
							$scope.data.topics.push(data[i]);
						}
						if (data.length > 0) {
							$scope.data.currentTopic = $scope.data.topics[0];
						}
						$scope.$evalAsync(function () {
							deferred.resolve(data);
						});
					});
					return deferred.promise;
				}
				fetchTopics();

				$scope.$on('promptClosed', function () {
					try {
						kahuna.project.topicEditor.destroy(true);
					}
					catch (e) {
						//already destroyed?
					}
					$('topics').remove();
				});

				$scope.$on('initTopicsCK', function () {
					kahuna.project.topicEditor = CKEDITOR.replace('topicEditor');
				});

				$scope.$watch('data.topics', function watch_data_topicsTab(current) {
					if ($scope.data.topics && angular.element('#topicEditor').length) {
						kahuna.loadRemoteFile('jslib/ckeditor/ckeditor.js', 'js');
						tryCkInit(30); // Try up to 30 times
					}
				});

				$scope.$watch("data.currentTopic", function watch_data_currentTopic() {
					if ( ! $scope.data.currentTopic || !kahuna.project.topicEditor) {
						return;
					}
					if ( ! $scope.data.currentTopic.description) {
						$scope.$evalAsync(function () {
							kahuna.project.topicEditor.setData('');
						});
					}
					else {
						$scope.$evalAsync(function () {
							kahuna.project.topicEditor.setData($scope.data.currentTopic.description);
						});
					}
				});

				$scope.createTopic = function createTopic() {
					var newTopic = {
						name: "New topic (" + new Date().toUTCString() + ")",
						color: "#4444FF",
						project_ident: $rootScope.currentProject.ident
					};

					KahunaData.create("admin:topics", newTopic, function (data) {
						$scope.$evalAsync(function () {
							for (var i = 0; i < data.txsummary.length; i++) {
								var topic = data.txsummary[i];
								if (topic['@metadata'].resource === 'admin:topics' && topic['@metadata'].verb === 'INSERT') {
									$scope.data.currentTopic = topic;
									$scope.data.topics.push(topic);
								}
							}
						});
						kahuna.util.info("Created topic - " + $scope.data.currentTopic.name);
					});
				};

				$scope.deleteTopic = function deleteTopic() {
					var deleteTopic = confirm('Delete this topic: ' + $scope.data.currentTopic.name + " ?");
					if (!deleteTopic) {
						return;
					}
					KahunaData.deleteWithKey($scope.data.currentTopic['@metadata'].href, { rulesummary: true, checksum: 'override' }, {apikey: kahuna.globals.apiKeyValue},
						function (data) {
							$scope.$evalAsync(function () {
								// console.log(data);
								var promise = fetchTopics();
								promise.then(function (data) {
									if (!data.length) {
										$scope.data.currentTopic = null;
									}
								});
							});
						}
					);
				};

				$scope.saveTopic = function saveTopic() {
					if ( ! $scope.data.currentTopic)
						return;
					$scope.data.currentTopic.description = kahuna.project.topicEditor.getData();
					KahunaData.update($scope.data.currentTopic, function (data) {
						$scope.$evalAsync(function () {
							for (var i = 0; i < data.txsummary.length; i++) {
								var modObj = data.txsummary[i];
								if (modObj['@metadata'].resource === 'admin:topics' && modObj.ident === $scope.data.currentTopic.ident) {
									$scope.data.currentTopic = modObj;

									for (var i = 0; i < $scope.data.topics.length; i++) {
										if ($scope.data.topics[i].ident == modObj.ident) {
											$scope.data.topics[i] = modObj;
											break;
										}
									}
									break;
								}
							}
							kahuna.util.info("Topic was saved");

							// the select scope in IE is not reflecting name changes
							// here we grab the scope, push an empty object, digest, and then pop it off, forcing the IE DOM to refresh
							var ua = window.navigator.userAgent;
							var msie = ua.indexOf('MSIE ');
							var trident = ua.indexOf('Trident/');
							if (msie > 0 || trident > 0 || true) {
								$scope.data.topics.push({});
								var scope = angular.element('#topicList').scope();
								scope.$evalAsync(function () {
									if (!scope.data) { console.log('no .data for topics select'); return; }
									scope.data.topics = $scope.data.topics;
									scope.$apply($scope.data.topics.pop);
								});
							}
						});
					});
				};

				if (angular.isDefined($rootScope.syncAction.topicEditor)) {
					var currentAction = angular.copy($rootScope.syncAction.topicEditor);
					if (currentAction.action === 'edit') {
						$scope.data.topicsTab = true;
						var deregFun = $scope.$watch("data.topics", function () {
							$scope.data.currentTopic = _.find($scope.data.topics, function (t) {
								return t.ident === currentAction.topic.ident;
							});
							if ($scope.data.topics) {
								deregFun();
							}
						});
					}
					delete $rootScope.syncAction.topicEditor;
				}

			},
			templateUrl: 'js/directives/topics/topics.html'
		};
		return Topic;
	}
);
