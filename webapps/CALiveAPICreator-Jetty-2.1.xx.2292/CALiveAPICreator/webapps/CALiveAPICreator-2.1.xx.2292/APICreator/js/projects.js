kahuna.project = {

	ProjectCtrl : function ($rootScope, $scope, $http, $resource, $routeParams,
			$location, $modal, $log, $timeout, $route, $q,
			KahunaData, Project, Delta, Notices) {
		"use strict";
		$rootScope.currentPage = 'projects';
		$rootScope.currentPageHelp = 'docs/logic-designer/project';
		$rootScope.helpDialog('project', 'Help', localStorage['eslo-ld-learn-complete']);

		$scope.data = {};
		$scope.data.currentAuthType = undefined;
		$scope.data.currentAuthProvider = undefined;
		$scope.data.authTypes = [];
		$scope.data.authProviders = [];

		$scope.selectedProj = angular.copy($scope.currentProject);

		$('.ResizableTd').resizable({
			handles : 'e',
			minWidth : 40
		});

		$rootScope.$on('$locationChangeStart', function on_projects_$LocationChangeStart(event, next, current) {
			var path = $location.url();
			if (!Delta.isReviewed()) {
				event.preventDefault();
				Delta.review()
					.then(function () {
						// resume navigation
						$location.path(path);
					})['catch'](function () {
						Delta.reviewed = false;
						Notices.confirmUnsaved().then(function (save) {
							if (save) {
								Delta.scope.saveProject();
								Delta.scope.saveProjectOptions();
							}
							$location.path(path);
						});
					});
			}
		});

		$scope.projectsInitialized = false;
		$scope.showOptions = function showOptions() {
			if ($scope.selectedProj) {
				KahunaData.query('ProjectOptions', {
					pagesize : 100,
					sysfilter : "equal(project_ident:" + $scope.selectedProj.ident + ")"
				}, function query_ProjectOptions_success(data) {
					$scope.projectOptions = {};
					$scope.projectOptionValues = {};
					for (var i = 0; i < data.length; i++) {
						$scope.projectOptions[data[i].projectoptiontype_ident] = data[i];
						$scope.projectOptionValues[data[i].projectoptiontype_ident] = data[i].option_value;
					}

					if (kahuna.meta.projectOptionTypes) {
						for (var optTypeIdx in kahuna.meta.projectOptionTypes) {
							var theOptionType = kahuna.meta.projectOptionTypes[optTypeIdx];
							if ( ! $scope.projectOptions[theOptionType.ident]) {
								$scope.projectOptions[theOptionType.ident] = {
									option_value: theOptionType.default_value,
									project_ident: $scope.selectedProj.ident,
									projectoptiontype_ident: theOptionType.ident,
									created_from_default: true
								};
								$scope.projectOptionValues[theOptionType.ident] = theOptionType.default_value;
							}
						}
					}

					$scope.$broadcast('fetchProjectOptions');
				}, function query_ProjectOptions_error(data) {
					if (data && data[0]) {
						kahuna.util['error']('There was a problem refreshing: "' + $scope.projectOptions[data[0].projectoptiontype_ident] + '"');
					}
				});
			}
			else {
				// console.log('The selected project is not ready to query options');
			}
		};
		$scope.showOptions();

		$scope.initSnapshot = function initSnapshot() {
			$scope.projectsInitialized = true;
			Delta.put($scope)
				.snapshot('selectedProj')
				.snapshot('projectOptionValues');
		};

		$scope.initProject = function initProject() {
			$scope.$broadcast('fetchProjectOptions');
		};

		$scope.$on('fetchProjectOptions', function () {
			$scope.fetchProjectOptions();
		});

		$scope.fetchProjectOptions = function fetchProjectOptions() {
			if (!kahuna.meta.projectOptionTypes || kahuna.meta.projectOptionTypes.length === 0) {
				KahunaData.query('admin:projectoptiontypes', {
					pagesize : 100,
					sysfilter: 'equal(system_only: false)'
				}, function (data) {
					if (angular.isUndefined($scope.projectOptions)) {
						return;
					}
					kahuna.meta.projectOptionTypes = data;
					kahuna.meta.projectOptionTypeEnums = {};
					for (var i = 0; i < kahuna.meta.projectOptionTypes.length; i++) {
						var optType = kahuna.meta.projectOptionTypes[i];
						if (optType.data_type == 'enum') {
							if ( ! optType.valid_values)
								alert('Project option type ' + optType.ident + ' is an enum but does not have valid_values');
							else
								kahuna.meta.projectOptionTypeEnums[optType.ident] = optType.valid_values.split(',');
						}
					}
					$scope.optionTypes = data;
					$scope.optionTypeEnums = kahuna.meta.projectOptionTypeEnums;

					for (var optTypeIdx in kahuna.meta.projectOptionTypes) {
						var theOptionType = kahuna.meta.projectOptionTypes[optTypeIdx];
						if ( ! $scope.projectOptions[theOptionType.ident]) {
							$scope.projectOptions[theOptionType.ident] = {
								option_value: theOptionType.default_value,
								project_ident: $scope.selectedProj.ident,
								projectoptiontype_ident: theOptionType.ident,
								created_from_default: true
							};
							$scope.projectOptionValues[theOptionType.ident] = theOptionType.default_value;
						}
					}
					if (!$scope.projectsInitialized) {
						$scope.initSnapshot();
					}
				});
			}
			else {
				$scope.optionTypes = kahuna.meta.projectOptionTypes;
				$scope.optionTypeEnums = kahuna.meta.projectOptionTypeEnums;
				if (!$scope.projectsInitialized) {
					$scope.initSnapshot();
				}
			}
		}

		$scope.createProject = function createProject() {
			var newProjectName = 'New project';
			var newUrlName = 'newProj';
			if ($rootScope.allProjects) {
				for (var i = 1; i < 10000; i++) {
					newProjectName = 'New project ' + i;
					newUrlName = 'newProj' + i;
					for ( var projIdent in $rootScope.allProjects) {
						if ($rootScope.allProjects[projIdent].name === newProjectName || $rootScope.allProjects[projIdent].url_name === newUrlName) {
							newProjectName = null;
							break;
						}
					}
					if (newProjectName != null)
						break;
				}
			}

			var newProject = {
				account_ident: $rootScope.currentAccount.ident,
				name: newProjectName,
				url_name: newUrlName,
				is_active: true
			};
			KahunaData.create("AllProjects", newProject, function (data) {
				kahuna.meta.reset();
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === "AllProjects" && modObj['@metadata'].verb === 'INSERT') {
						// TODO - this is not really right, but do it for now.
						modObj.Tables = { href : kahuna.baseUrl + "@tables?projectId=" + modObj.ident };
						modObj.Views = { href : kahuna.baseUrl + "@views?projectId=" + modObj.ident };
						modObj.Procedures = { href : kahuna.baseUrl + "@procedures?projectId=" + modObj.ident };
						modObj.Resources = { href : kahuna.baseUrl + "@resources?projectId=" + modObj.ident };
						$rootScope.allProjects.push(modObj);
						$rootScope.currentProject = modObj;
						// kahuna.putInScope('currentProject', modObj);
						$scope.selectedProj = modObj;
						if (kahuna.restlab) {
							kahuna.restlab.history = [];
						}
						break;
					}
				}
				$scope.showOptions();
			});
		};

		$scope.deleteProject = function deleteProject() {
			Project.destroy($scope.currentProject);
			return;
		};

		$scope.saveProject = function saveProject() {
			Delta.reset();
			$rootScope.verifyProject(function () {
				console.log($scope.selectedProj);
				KahunaData.update($scope.selectedProj, function (data) {
					for (var i = 0; i < data.txsummary.length; i++) {
						var modObj = data.txsummary[i];
						if (modObj['@metadata'].resource === 'AllProjects' && modObj.ident === $scope.selectedProj.ident) {
							// TODO - this is not realladdy right, but do it for now.
							modObj.Tables = { href : kahuna.baseUrl + "@tables?projectId=" + modObj.ident };
							modObj.Views = { href : kahuna.baseUrl + "@views?projectId=" + modObj.ident };
							modObj.Procedures = { href : kahuna.baseUrl + "@procedures?projectId=" + modObj.ident };
							modObj.Resources = { href : kahuna.baseUrl + "@resources?projectId=" + modObj.ident };
							var idx = -1;
							for (var i = 0; i < $rootScope.allProjects.length; i++) {
								if ($rootScope.allProjects[i].ident === $scope.selectedProj.ident) {
									idx = i;
									break;
								}
							}
							$rootScope.allProjects[idx] = modObj;
							$rootScope.currentProject = modObj;
							$scope.selectedProj = modObj;
						}
					}
					kahuna.applyFunctionInScope($scope, function () {
						kahuna.setDataExplorerUrl($rootScope, $scope.selectedProj);
					});
					kahuna.util.info('Project was saved');
				});
			});
		};

		$scope.exportProject = function exportProject() {
			if ($scope.selectedProj.name === '') {
				alert('API Name cannot be blank for export.');
			}
			var iframe = document.getElementById("downloadIframe");
			iframe.src = kahuna.baseUrl + "ProjectExport/" + $scope.selectedProj.ident + "?auth=" + kahuna.globals.apiKeyValue + ":1&downloadName="
					+ $scope.selectedProj.name + ".json&pagesize=1000";
			return false;
		};

		$scope.upcaseName = function upcaseName(arg) {
			return arg.name.toUpperCase();
		};

		// $scope.projectSelected = function projectSelected() {
		//   fetchProjLibs();
		//   $scope.showOptions();
		// };

		if ($routeParams.action === 'create') {
			$scope.createProject();
		}

		$scope.saveProjectOptions = function saveProjectOptions() {
			Delta.reset();
			var queue = [];
			var i;
			for (i = 0; i < kahuna.meta.projectOptionTypes.length; i++) {
				var optType = kahuna.meta.projectOptionTypes[i];
				if ($scope.projectOptions[optType.ident] && !$scope.projectOptions[optType.ident].created_from_default) {
					$scope.projectOptions[optType.ident].option_value = $scope.projectOptionValues[optType.ident];
					delete $scope.projectOptions[optType.ident].ProjectOptionTypes;
					(function () {
						var optTypeSave = optType;
						queue.push(KahunaData.update($scope.projectOptions[optType.ident], function (data) {
							if (data.txsummary.length > 0) {
								if ($scope.$$phase) {
									$scope.projectOptions[optTypeSave.ident] = data.txsummary[0];
									$scope.projectOptionValues[optTypeSave.ident] = $scope.projectOptions[optTypeSave.ident].option_value;
								}
								else {
									$scope.$apply(function () {
										$scope.projectOptions[optTypeSave.ident] = data.txsummary[0];
										$scope.projectOptionValues[optTypeSave.ident] = $scope.projectOptions[optTypeSave.ident].option_value;
									});
								}
								kahuna.util.info('Option ' + optTypeSave.name + ' was saved');
							}
							else {
								// console.log(optTypeSave.name, data);
							}
						},
						function (data) {
							kahuna.util['error']('There was an error saving option: "' + optTypeSave.name + '"');
						}));
					})();
				}
				else {
					var newOpt = {
						option_value : $scope.projectOptionValues[optType.ident],
						project_ident : $scope.selectedProj.ident,
						projectoptiontype_ident : optType.ident
					};
					(function () {
						var optTypeSave = optType;
						queue.push(KahunaData.create('admin:projectoptions', newOpt, function (data) {
							// $scope.projectOptions[optTypeSave.ident] = data.txsummary[0];

							if ($scope.$$phase)
								$scope.projectOptions[optTypeSave.ident] = data.txsummary[0];
							else {
								$scope.$apply(function () {
									$scope.projectOptions[optTypeSave.ident] = data.txsummary[0];
								});
							}
							kahuna.util.info('Option ' + optTypeSave.name + ' was created');
						},
						function (data) {
							kahuna.util['error']('There was an error creating option "' + optTypeSave.name + '"');
						}));
					})();
				}
			}

			var requests = $q.all(queue).then(
				function () {
					$scope.showOptions();
				},
				function (res) {
					$scope.showOptions();
				}
			);
		};

		//////////////////////////////////////////////////////////////////////////////
		// Libraries
		KahunaData.query('Libraries', {
			pagesize: 100,
			sysfilter: "equal(system_only:false,account_ident:null)",
			sysorder: "(name:asc_uc,name:desc)"
		}, function query_Libraries_success(data) {
			$scope.data.libs = data;
		});

		// Wait until a project has been selected before retrieving the list of libraries for that account
		$scope.$watch('selectedProj', function watch_projects_selectedProj() {
			if ( ! $scope.selectedProj)
				return;
			KahunaData.query('admin:logic_libraries', {
				pagesize: 100,
				sysfilter: "equal(system_only:false,account_ident:" + $scope.selectedProj.account_ident + ")",
				sysorder: "(name:asc_uc,name:desc)"
			}, function query_admin_logic_libraries_success(data) {
				$scope.data.acctlibs = data;
			});
		});

		function fetchProjLibs() {
			$scope.data.usedLibs = {};
			if (!$scope.selectedProj)
				return;
			KahunaData.query('admin:project_libraries', {
				pagesize : 100,
				sysfilter : "equal(project_ident:" + $scope.selectedProj.ident + ")"
			}, function query_admin_project_libraries_success(data) {
				$scope.data.oldLibs = {};
				var i;
				for (i = 0; i < data.length; i++) {
					$scope.data.usedLibs[data[i].logic_library_ident] = true;
					$scope.data.oldLibs[data[i].logic_library_ident] = data[i];
				}
			});
		}

		fetchProjLibs();

		$scope.createLib = function createLib() {
			$scope.data.action = "insert";
			$scope.data.library = {
				name: "New library",
				group_name: "newlib",
				lib_name: "newlib",
				version: "1.0",
				description: "This is a library",
				doc_url: "",
				ref_url: "",
				system_only: false,
				logic_type: "javascript",
				account_ident: $scope.selectedProj.account_ident
			};
			var dialogOpts = {
					backdrop: 'static',
					keyboard: true, // Can close with escape
					templateUrl:  'partials/library-editor.html',
					controller: 'kahuna.project.LibraryEditController',
					resolve: {
						library : function () { return $scope.data.library; },
						action: function () { return $scope.data.action; },
						callback: function () { return function (lib) {
							kahuna.applyFunctionInScope($scope, function () {
								$scope.data.library = null;
								$scope.data.acctlibs.push(lib);
							});
						};}
					}
				};
				$modal.open(dialogOpts);
		};

		$scope.editLib = function editLib(lib) {
			$scope.data.action = "update";
			$scope.data.library = lib;
			var dialogOpts = {
					backdrop: 'static',
					keyboard: true, // Can close with escape
					templateUrl:  'partials/library-editor.html',
					controller: 'kahuna.project.LibraryEditController',
					resolve: {
						library : function () { return $scope.data.library; },
						action: function () { return $scope.data.action; },
						callback: function () { return function (editedLib) {
							kahuna.applyFunctionInScope($scope, function () {
								$scope.data.library = null;
								for (var i = 0; i < $scope.data.acctlibs.length; i++) {
									if ($scope.data.acctlibs[i]['@metadata'].href === editedLib['@metadata'].href) {
										$scope.data.acctlibs[i] = editedLib;
										break;
									}
								}
							});
						};}
					}
				};
				$modal.open(dialogOpts);
		};

		$scope.saveLibs = function saveLibs() {
			var i = 0;
			var modifs = [];
			var theLibs = _.union($scope.data.libs, $scope.data.acctlibs);
			for (i = 0; i < theLibs.length; i++) {
				var lib = theLibs[i];
				if ($scope.data.usedLibs[lib.ident]) {
					if (!$scope.data.oldLibs[lib.ident]) {
						modifs.push({
							'@metadata' : {
								action : 'INSERT'
							},
							project_ident : $scope.selectedProj.ident,
							logic_library_ident : lib.ident
						});
					}
				}
				else {
					var oldLib = $scope.data.oldLibs[lib.ident];
					if (oldLib) {
						oldLib['@metadata'].action = 'DELETE';
						modifs.push(oldLib);
					}
				}
			}

			KahunaData.updateList("admin:project_libraries", modifs, function updateList_admin_project_libraries_success(data) {
				fetchProjLibs();
				kahuna.util.info('Project was saved');
			});
		};

		$scope.deleteLib = function deleteLib(lib) {
			if ( ! confirm('Are you sure you want to delete this library (' + lib.name + ')?'))
				return;
			KahunaData.remove(lib, function () {
				var idx = $scope.data.acctlibs.indexOf(lib);
				$scope.data.acctlibs.splice(idx, 1);
				kahuna.util.info('Library was deleted');
			}, function (e) {
				kahuna.util.error("Unable to delete library: " + JSON.stringify(e));
			});
		};

		////////////////////////////////////////////////////////////
		// Controller for the library editing dialog
		kahuna.project.LibraryEditController = function LibraryEditController($scope, $modalInstance, library, action, callback) {
			$scope.library = library;
			$scope.cancelEdit = function cancelEdit() {
				$modalInstance.close();
				$scope.upload.library = null;
			};

			$scope.upload = {
					uploaded: 0,
					progressBarType: "info"
					};

			$scope.fileSelected = function fileSelected() {
				$log.log('File chosen');
				var f = $('#libFile')[0].files[0];
				$scope.upload.fileSize = f.size + " bytes";
				$scope.upload.fileType = f.type;
			};

			$scope.uploadProgress = function uploadProgress(e) {
				if (e.lengthComputable) {
					kahuna.applyFunctionInScope($scope, function () {
						$scope.upload.uploaded = Math.floor(e.loaded * 100 / e.total);
						$scope.upload.progressBarMessage = "" + $scope.upload.pctUploaded + "%";
					});
					$log.log('Progress: ' + e.loaded + " out of " + e.total);
				}
			};

			$scope.saveLib = function saveLib() {
				$log.log('Saving library');
				if (action === "insert") {
					KahunaData.create("admin:logic_libraries", library, function create_admin_logic_libraries_success(data) {
						kahuna.applyFunctionInScope($scope, function () {
							$scope.library = data.txsummary[0];
							if ($('#libFile')[0].files.length) {
								$scope.uploadCode(function () {
									callback && callback(data.txsummary[0]);
									$modalInstance.close();
									kahuna.util.info('Library was created');
								});
							}
							else {
								callback && callback($scope.library);
								$modalInstance.close();
								kahuna.util.info('Library was created');
							}

							$scope.library = null;
						});
					}, function (e) {
						// Error
						$log.error('Creation of library failed: ' + JSON.stringify(e));
						espresso.util.error('Creation of library failed: ' + JSON.stringify(e));
						$scope.library = null;
						$modalInstance.close();
					});
				}
				else {
					delete library.code;
					KahunaData.update(library, function update_library_success(data) {
						kahuna.applyFunctionInScope($scope, function () {
							$scope.library = data.txsummary[0];
							if ( ! $scope.library)
								$scope.library = library;
							if ($('#libFile')[0].files.length) {
								$scope.uploadCode(function afterLibUpdate(data2) {
									callback && callback(data2);
									$modalInstance.close();
									$scope.library = null;
									kahuna.util.info('Library was updated');
								});
							}
							else {
								callback && callback($scope.library);
								$modalInstance.close();
								$scope.library = null;
								kahuna.util.info('Library was updated');
							}
						});
					});
				}
			};

			$scope.uploadCode = function uploadCode(fun) {
				var formData = new FormData();
				formData.append('checksum', $scope.library['@metadata'].checksum);
				formData.append('authorization', kahuna.globals.apiKeyValue + ':1');
				formData.append('code', $('#libFile')[0].files[0]);
				$.ajax({
					url: $scope.library['@metadata'].href,
					type: 'POST',
					xhr: function () {
						// Custom XMLHttpRequest
						var myXhr = $.ajaxSettings.xhr();
						if (myXhr.upload) {
							myXhr.upload.addEventListener('progress', $scope.uploadProgress, false);
						}
						return myXhr;
					},
					beforeSend: function () {
					},
					success: function (data) {
						kahuna.applyFunctionInScope($scope, function () {
							$scope.upload.progressBarMessage = "Upload complete";
							$scope.upload.progressBarType = "success";
						});
						$log.info('Upload complete');
						fun && fun(data.txsummary[0]);
					},
					error: function (err) {
						kahuna.applyFunctionInScope($scope, function () {
							if (err && err.responseJSON && err.responseJSON.errorMessage) {
								$scope.upload.errorMessage = err.responseJSON.errorMessage;
							}
							$scope.upload.progressBarType = "danger";
							$scope.upload.progressBarMessage = "Upload failed";
						});
						kahuna.util.error("File upload failed");
						$log.error("Error during upload");
					},
					// Form data
					data: formData,
					// Options to tell jQuery not to process data or worry about content-type.
					cache: false,
					contentType: false,
					processData: false
				});
			};
		};

		function fetchAuthProviders() {
			if (!$scope.selectedProj) {
				return;
			}
			KahunaData.query('admin:authproviders', {
				pagesize: 100,
				sysfilter: 'equal(account_ident:' + $rootScope.currentAccount.ident + ')',
				sysorder: '(name:asc_uc,name:desc)'
			}, function query_admin_authproviders_success(data) {
				kahuna.applyFunctionInScope($scope, function () {
					for (var i = 0; i < data.length; i += 1) {
						data[i].isChanged = false;
						$scope.data.authProviders.push(data[i]);
					}
					if (data.length > 0) {
						$scope.data.currentAuthProvider = $scope.data.authProviders[0];
						authProviderSelected();
					}
				});
			});
		}

		function fetchAuthTypes() {
			KahunaData.query('admin:auth_types', {
				pagesize : 100
			}, function (data) {
				kahuna.applyFunctionInScope($scope, function () {
					$scope.data.authTypes.splice(0, $scope.data.authTypes.length);
					for (var i = 0; i < data.length; i += 1) {
						$scope.data.authTypes.push(data[i]);
					}
				});
			});
		}

		fetchAuthTypes();
		$timeout(fetchAuthProviders, 500);

		function findAuthType(ident) {
			for (var i = 0; i < $scope.data.authTypes.length; i += 1) {
				if (ident === $scope.data.authTypes[i].ident) {
					return $scope.data.authTypes[i];
				}
			}
			return null;
		}

		// AUTH PROVIDER SECTION

		function authTypeSelected() {
			var prov = $scope.data.currentAuthProvider;
			if (! $scope.data.currentAuthProvider) {
				return;
			}
			prov.isChanged = true;
			prov.auth_type_ident = $scope.data.currentAuthType.ident;
			prov.class_name = $scope.data.currentAuthType.class_name;
			prov.param_map = null;
			$scope.data.currentAuthProviderConfiguration = null;
			if (!$scope.data.currentAuthType.config_name) {
				prov.bootstrap_config_value = null;
				$scope.data.currentAuthProviderConfiguration = null;
			}

			saveAndConfigureAuthProvider($scope.data.currentAuthProvider);
		}
		$scope.authTypeSelected = authTypeSelected;

		function authProviderSelected() {
			if ($scope.data.currentAuthProvider) {
				$scope.data.currentAuthType = findAuthType($scope.data.currentAuthProvider.auth_type_ident);
				configureAuthProvider();
			}
			else {
				$scope.data.currentAuthType = null;
			}
		}
		$scope.authProviderSelected = authProviderSelected;

		function deleteAuthProvider(provider) {
			if (null === provider) {
				return;
			}

			for (var i = 0; i < $scope.data.authProviders.length;  i+= 1) {
				if (provider === $scope.data.authProviders[i]) {
					var foundIndex = i;
					if (null === provider.ident) {
						$scope.data.authProviders.splice(foundIndex, 1);
						if ($scope.data.currentAuthProvider === provider) {
							var newidx = Math.min(foundIndex, $scope.data.authProviders.length - 1);
							if (newidx < 0) {
								$scope.data.currentAuthProvider = null;
							}
							else {
								$scope.data.currentAuthProvider = $scope.data.authProviders[newidx];
							}
						}
					}
					else {
						var toDelete = {
							ident : provider.ident,
							'@metadata' : provider['@metadata']
						};
						KahunaData.remove(toDelete, function remove_authprovider_success(deldata) {
							kahuna.applyFunctionInScope($scope, function () {
								$scope.data.authProviders.splice(foundIndex, 1);
								if ($scope.data.currentAuthProvider === provider) {
									var newidx = Math.min(foundIndex, $scope.data.authProviders.length - 1);
									if (newidx < 0) {
										$scope.data.currentAuthProvider = null;
									}
									else {
										$scope.data.currentAuthProvider = $scope.data.authProviders[newidx];
									}
								}
							});
						});
					}
				}
			}
		}
		$scope.deleteAuthProvider = deleteAuthProvider;

		function createAuthProvider() {
			$scope.data.currentAuthType = $scope.data.authTypes[0];
			var newauthprovider = {
				isChanged: true,
				ident: null,
				name: "New Provider (" + new Date().toUTCString() + ")",
				auth_type_ident: $scope.data.currentAuthType.ident,
				class_name: $scope.data.currentAuthType.class_name,
				account_ident: $rootScope.currentAccount.ident
			};

			$scope.data.authProviders.push(newauthprovider);
			$scope.data.currentAuthProvider = newauthprovider;
			saveAndConfigureAuthProvider(newauthprovider);
		}
		$scope.createAuthProvider = createAuthProvider;

		function saveAuthProvider(provider, fun) {
			if (!provider) {
				return;
			}
			var newprovider = {
				ident: provider.ident,
				name: provider.name,
				comments: provider.comments,
				auth_type_ident: provider.auth_type_ident,
				class_name: provider.class_name,
				class_location: "",
				bootstrap_config_value: provider.bootstrap_config_value,
				param_map: provider.param_map,
				account_ident: provider.account_ident
			};

			if (!provider.ident) {
				KahunaData.create("admin:authproviders", newprovider, function create_admin_authproviders_success(newresult) {
					kahuna.applyFunctionInScope($scope, function () {
						for (var i = 0; i < newresult.txsummary.length; i++) {
							var modObj = newresult.txsummary[i];
							if (modObj['@metadata'].resource === 'admin:authproviders' && modObj['@metadata'].verb === 'INSERT') {
								provider.ident = modObj.ident;
								provider.isChanged = false;
								provider["@metadata"] = modObj["@metadata"];
							}
						}
					});
					kahuna.util.info("Created Authentication Provider - " + provider.name);
					fun && fun();
				});
			}
			else {
				newprovider["@metadata"] = provider["@metadata"];
				KahunaData.update(newprovider, function update_authprovider_success(newresult) {
					kahuna.applyFunctionInScope($scope, function () {
						for (var i = 0; i < newresult.txsummary.length; i++) {
							var modObj = newresult.txsummary[i];
							if (modObj['@metadata'].resource === 'admin:authproviders' && modObj.ident === provider.ident) {
								provider["@metadata"] = modObj["@metadata"];
							}
						}
						provider.isChanged = false;
					});
					kahuna.util.info("Saved Authentication Provider - " + provider.name);
					fun && fun();
				});
			}
		}
		$scope.saveAuthProvider = saveAuthProvider;

		function revertAuthProvider(provider) {
			if (!provider) {
				return;
			}
			for (var i = 0; i < $scope.data.authProviders.length; i += 1) {
				if ($scope.data.authProviders[i] === provider) {
					if (null === provider.ident) {
						$scope.data.authProviders.splice(i, 1);
						if (provider === $scope.data.currentAuthProvider) {
							$scope.data.currentAuthProvider = null;
						}
					}
					else {
						var foundIndex = i;
						KahunaData.query("admin:authproviders",
							{
								pagesize: 100,
								sysfilter: 'equal(ident:' + provider.ident + ')'
							}, function (oldauth) {
								kahuna.applyFunctionInScope($scope, function () {
									if (0 === oldauth.length) {
										$scope.data.authProviders.splice(foundIndex, 1);
										if (provider === $scope.data.currentAuthProvider) {
											$scope.data.currentAuthProvider = null;
										}
									}
									else {
										oldauth[0].isChanged = false;
										$scope.data.authProviders[foundIndex] = oldauth[0];
										if (provider === $scope.data.currentAuthProvider) {
											$scope.data.currentAuthProvider = oldauth[0];
										}
									}
								});
						});
					}
				}
			}
		}
		$scope.revertAuthProvider = revertAuthProvider;

		function configureAuthProvider() {
			$scope.data.currentAuthProviderConfiguration = null;
			$scope.data.authProviderConfigurationError = "Fetching";
			KahunaData.query('@auth_provider_info/' + $scope.data.currentAuthProvider.ident, {projectId: $scope.currentProject.ident}, function configSuccessCallback(authconfiginfo) {
				kahuna.applyFunctionInScope($scope, function () {
					$scope.data.authProviderConfigurationError = null;
					$scope.data.currentAuthProviderConfiguration = authconfiginfo;
				});
			}, function configErrorCallback(data, status, url) {
				$log.info("auth provider info returned error " + JSON.stringify(data));
				var msg = data.errorMessage;
				var internalError = "Internal Server Error:";
				if (0 == (msg.toLowerCase()).indexOf(internalError.toLowerCase())) {
					msg = msg.substring(internalError.length);
				}
				$scope.data.authProviderConfigurationError = msg;
			});
		}
		$scope.configureAuthProvider = configureAuthProvider;

		function saveAndConfigureAuthProvider() {
			saveAuthProvider($scope.data.currentAuthProvider, configureAuthProvider);
		}
		$scope.saveAndConfigureAuthProvider = saveAndConfigureAuthProvider;

		function authConfigValueChanged() {
			var prov = $scope.data.currentAuthProvider;
			prov.isChanged = true;
			var parms = "";
			var fields = $scope.data.currentAuthProviderConfiguration.fields;
			var values = $scope.data.currentAuthProviderConfiguration.current;
			for (var i = 0; i < fields.length; i+= 1) {
				if (i > 0) {
					parms = parms + ",";
				}
				parms = parms + encodeURIComponent(fields[i].name) + "=" + encodeURIComponent(values[fields[i].name] || "");
			}
			prov.param_map = parms;
		}
		$scope.authConfigValueChanged = authConfigValueChanged;

		function authProviderValueChanged() {
			$scope.data.currentAuthProvider.isChanged = true;
		}
		$scope.authProviderValueChanged = authProviderValueChanged;

		function bootstrapConfigValueChanged() {
			$scope.data.currentAuthProvider.isChanged = true;
		}
		$scope.bootstrapConfigValueChanged = bootstrapConfigValueChanged;

		/////////////////////////////////////////////////////////
		// Filters

		function fetchFilters() {
			var deferred = $q.defer();
			if (!$scope.selectedProj) {
				deferred.reject();
				return deferred.promise;
			}
			KahunaData.query('admin:named_filters', {
				pagesize: 1000,
				sysfilter: 'equal(project_ident:' + $scope.selectedProj.ident + ')',
				sysorder: '(name:asc_uc,name:desc)'
			}, function (data) {
				kahuna.applyFunctionInScope($scope, function () {
					$scope.data.filters = [];
					for (var i = 0; i < data.length; i += 1) {
						$scope.data.filters.push(data[i]);
					}
					if (data.length > 0) {
						$scope.data.currentFilter = $scope.data.filters[0];
					}
					$scope.$evalAsync(function () {
						deferred.resolve(data);
					});
				});
			});
			return deferred.promise;
		}
		fetchFilters();

		$scope.createFilter = function createFilter() {
			var newFilter = {
				name: "New filter (" + new Date().toUTCString() + ")",
				filter_text: "",
				project_ident: $scope.currentProject.ident
			};

			KahunaData.create("admin:named_filters", newFilter, function (data) {
				kahuna.applyFunctionInScope($scope, function () {
					for (var i = 0; i < data.txsummary.length; i++) {
						var filter = data.txsummary[i];
						if (filter['@metadata'].resource === 'admin:named_filters' && filter['@metadata'].verb === 'INSERT') {
							$scope.data.currentFilter = filter;
							$scope.data.filters.push(filter);
						}
					}
				});
				kahuna.util.info("Created filter - " + $scope.data.currentFilter.name);
			});
		};

		$scope.deleteFilter = function deleteFilter() {
			var delFilter = window.confirm('Delete this filter: ' + $scope.data.currentFilter.name + " ?");
			if (!delFilter) {
				return;
			}
			KahunaData.deleteWithKey($scope.data.currentFilter['@metadata'].href, { rulesummary: true, checksum: $scope.data.currentFilter['@metadata'].checksum }, {apikey: kahuna.globals.apiKeyValue},
				function (data) {
					$scope.$evalAsync(function () {
						// console.log(data);
						var promise = fetchFilters();
						promise.then(function (data) {
							if (!data.length) {
								$scope.data.currentFilter = null;
							}
						});
					});
				}
			);
		};

		$scope.saveFilter = function saveFilter() {
			if ( ! $scope.data.currentFilter)
				return;
			KahunaData.update($scope.data.currentFilter, function (data) {
				kahuna.applyFunctionInScope($scope, function () {
					for (var i = 0; i < data.txsummary.length; i++) {
						var modObj = data.txsummary[i];
						if (modObj['@metadata'].resource === 'admin:named_filters' && modObj.ident === $scope.data.currentFilter.ident) {
							$scope.data.currentFilter = modObj;

							for (var i = 0; i < $scope.data.filters.length; i++) {
								if ($scope.data.filters[i].ident == modObj.ident) {
									$scope.data.filters[i] = modObj;
									break;
								}
							}
							break;
						}
					}
					kahuna.util.info("Filter was saved");

					// the select scope in IE is not reflecting name changes
					// here we grab the scope, push an empty object, digest, and then pop it off, forcing the IE DOM to refresh
					var ua = window.navigator.userAgent;
					var msie = ua.indexOf('MSIE ');
					var trident = ua.indexOf('Trident/');
					if (msie > 0 || trident > 0 || true) {
						$scope.data.filters.push({});
						var scope = angular.element('#filterList').scope();
						scope.$evalAsync(function () {
							scope.data.filters = $scope.data.filters;
							$timeout(function () {$scope.data.filters.pop();}, 1000);
						});
					}
				});
			});
		};

		/////////////////////////////////////////////////////////
		// Sorts

		function fetchSorts() {
			var deferred = $q.defer();
			if (!$scope.selectedProj) {
				deferred.reject();
				return deferred.promise;
			}
			KahunaData.query('admin:named_sorts', {
				pagesize: 1000,
				sysfilter: 'equal(project_ident:' + $scope.selectedProj.ident + ')',
				sysorder: '(name:asc_uc,name:desc)'
			}, function (data) {
				kahuna.applyFunctionInScope($scope, function () {
					$scope.data.sorts = [];
					for (var i = 0; i < data.length; i += 1) {
						$scope.data.sorts.push(data[i]);
					}
					if (data.length > 0) {
						$scope.data.currentSort = $scope.data.sorts[0];
					}
					$scope.$evalAsync(function () {
						deferred.resolve(data);
					});
				});
			});
			return deferred.promise;
		}
		fetchSorts();

		$scope.createSort = function createSort() {
			var newSort = {
				name: "New sort (" + new Date().toUTCString() + ")",
				sort_text: "",
				project_ident: $scope.currentProject.ident
			};

			KahunaData.create("admin:named_sorts", newSort, function (data) {
				kahuna.applyFunctionInScope($scope, function () {
					for (var i = 0; i < data.txsummary.length; i++) {
						var sort = data.txsummary[i];
						if (sort['@metadata'].resource === 'admin:named_sorts' && sort['@metadata'].verb === 'INSERT') {
							$scope.data.currentSort = sort;
							$scope.data.sorts.push(sort);
						}
					}
				});
				kahuna.util.info("Created sort - " + $scope.data.currentSort.name);
			});
		};

		$scope.deleteSort = function deleteSort() {
			var delSort = window.confirm('Delete this sort: ' + $scope.data.currentSort.name + " ?");
			if (!delSort) {
				return;
			}
			KahunaData.deleteWithKey($scope.data.currentSort['@metadata'].href, { rulesummary: true, checksum: $scope.data.currentSort['@metadata'].checksum }, {apikey: kahuna.globals.apiKeyValue},
				function (data) {
					$scope.$evalAsync(function () {
						// console.log(data);
						var promise = fetchFilters();
						promise.then(function (data) {
							if (!data.length) {
								$scope.data.currentSort = null;
							}
						});
					});
				}
			);
		};

		$scope.saveSort = function saveSort() {
			if ( ! $scope.data.currentSort)
				return;
			KahunaData.update($scope.data.currentSort, function (data) {
				kahuna.applyFunctionInScope($scope, function () {
					for (var i = 0; i < data.txsummary.length; i++) {
						var modObj = data.txsummary[i];
						if (modObj['@metadata'].resource === 'admin:named_sorts' && modObj.ident === $scope.data.currentSort.ident) {
							$scope.data.currentSort = modObj;

							for (var i = 0; i < $scope.data.sorts.length; i++) {
								if ($scope.data.sorts[i].ident == modObj.ident) {
									$scope.data.sorts[i] = modObj;
									break;
								}
							}
							break;
						}
					}
					kahuna.util.info("Sort was saved");

					// the select scope in IE is not reflecting name changes
					// here we grab the scope, push an empty object, digest, and then pop it off, forcing the IE DOM to refresh
					var ua = window.navigator.userAgent;
					var msie = ua.indexOf('MSIE ');
					var trident = ua.indexOf('Trident/');
					if (msie > 0 || trident > 0 || true) {
						$scope.data.sorts.push({});
						var scope = angular.element('#orderList').scope();
						scope.$evalAsync(function () {
							scope.data.sorts = $scope.data.sorts;
							$timeout(function () {$scope.data.sorts.pop();}, 1000);
						});
					}
				});
			});
		};

		/////////////////////////////////////////////////////////
		// Latest changes

		$scope.data.numAudits = 20;
		$scope.data.showAudit = {};

		$scope.getAudits = function getAudits() {
			KahunaData.query('audits',
					{
						sysfilter: "equal(project_ident:" + $rootScope.currentProject.ident + ",nest_level:0)",
						pagesize: $scope.data.numAudits,
						sysorder: "(ts:desc)"
					},
					function (data) {
						// Remove next_page link if present
						if (data.length > $scope.data.numAudits) {
							data.splice($scope.data.numAudits, 1);
						}
						_.each(data, function (d) {
							switch (d.action_type) {
							case 'R': d.action = 'Read'; break;
							case 'I': d.action = 'Insert'; break;
							case 'U': d.action = 'Update'; break;
							case 'D': d.action = 'Delete'; break;
							default: d.action = 'Unknown';
							}

							d.table_name = d.table_name.substring(6);
							switch (d.table_name) {
							case 'apiversions': d.nav_id = d.pk; break;
							case 'resources': d.nav_id = d.pk; break;
							}
						});
						kahuna.applyFunctionInScope($scope, function () {
							$scope.data.LatestAudits = data;
						});
					});
		};

		$scope.$watch("data.auditVisible", function (newValue, oldValue) {
			if (!newValue || oldValue || newValue === oldValue) {
				return;
			}
			$scope.getAudits();
		});

		$scope.$watch("data.numAudits", function (newValue, oldValue) {
			if (!newValue || !$rootScope.currentProject) {
				return;
			}
			$scope.data.numAudits = newValue;
			$scope.getAudits();
		});

		$scope.flipAuditDetail = function flipAuditDetail(ident) {
			$scope.data.showAudit[ident] = !$scope.data.showAudit[ident];
			if ($scope.data.showAudit[ident]) {
				$('#auditDetailButton' + ident).html('Hide details');
			}
			else {
				$('#auditDetailButton' + ident).html('Show details');
			}
		};

		/////////////////////////////////////////////////////////
		// Snapshots

		$scope.snapshotProject = function snapshotProject(callback) {

			kahuna.util.info('Taking snapshot ...');
			var projVersion = {
				name: "Snapshot " + (new Date()).getTime(),
				format_ident: 1,
				project_ident: $scope.selectedProj.ident
			};
			KahunaData.create("admin:project_versions", projVersion, function snapshot_project_success(data) {
				kahuna.applyFunctionInScope($scope, function () {
					// $scope.library = data.txsummary[0];
					kahuna.util.info('Snapshot has been taken');
					callback && callback();
					fetchSnapshots();
				});
			});
		};

		function fetchSnapshots() {
			var deferred = $q.defer();
			if (!$scope.selectedProj) {
				deferred.reject();
				return deferred.promise;
			}
			KahunaData.query('admin:project_versions', {
				pagesize: 1000,
				sysfilter: 'equal(project_ident:' + $scope.selectedProj.ident + ')',
				sysorder: '(version_datetime:desc)'
			}, function (data) {
				kahuna.applyFunctionInScope($scope, function () {
					$scope.data.snapshots = [];
					for (var i = 0; i < data.length; i += 1) {
						$scope.data.snapshots.push(data[i]);
					}
					if (data.length > 0) {
						$scope.data.currentSnapshot = $scope.data.snapshots[0];
					}
					$scope.$evalAsync(function () {
						deferred.resolve(data);
					});
				});
			});
			return deferred.promise;
		}
		fetchSnapshots();

		$scope.deleteSnapshot = function deleteSnapshot() {
			var delSnap = window.confirm('Are you sure you want to delete this snapshot: ' + $scope.data.currentSnapshot.name + " ? This cannot be undone!");
			if (!delSnap) {
				return;
			}
			KahunaData.deleteWithKey($scope.data.currentSnapshot['@metadata'].href, { rulesummary: false, checksum: $scope.data.currentSnapshot['@metadata'].checksum }, {apikey: kahuna.globals.apiKeyValue},
				function (data) {
					kahuna.util.info("Snapshot was deleted");
					$scope.$evalAsync(function () {
						// console.log(data);
						var promise = fetchSnapshots();
						promise.then(function (data) {
							if (!data.length) {
								$scope.data.currentSnapshot = null;
							}
						});
					});
				}
			);
		};

		$scope.saveSnapshot = function saveSnapshot(callback) {
			if ( ! $scope.data.currentSnapshot) {
				return;
			}
			KahunaData.update($scope.data.currentSnapshot, function (data) {
				kahuna.applyFunctionInScope($scope, function () {
					for (var i = 0; i < data.txsummary.length; i++) {
						var modObj = data.txsummary[i];
						if (modObj['@metadata'].resource === 'admin:project_versions' && modObj.ident === $scope.data.currentSnapshot.ident) {
							$scope.data.currentSnapshot = modObj;

							for (var i = 0; i < $scope.data.snapshots.length; i++) {
								if ($scope.data.snapshots[i].ident == modObj.ident) {
									$scope.data.snapshots[i] = modObj;
									break;
								}
							}
							break;
						}
					}
					kahuna.util.info("Snapshot was saved");
					callback && callback();
				});
			});
		};

		$scope.restoreSnapshotDialog = function restoreSnapshotDialog() {

			$modal.open({
				template: "<div style='padding: 25px;'><h2>Restore a snapshot</h2>" +
					"<p>If you restore this snapshot, the contents of the current API will be thrown away " +
					"and replaced with the contents of this snapshot. It is recommended that you take " +
					"a snapshot now, just in case.</p>" +
					"<button class='btn' ng-click='cancelSnapshot()'>Cancel</button>" +
					"<button class='btn btn-primary' style='width: 15em;' ng-click='snapshotThenRestore()'>Take a snapshot, then restore</button>" +
					"<button class='btn' ng-click='restoreWithNoSnapshotSnapshot()'>Restore</button>" +
					"</div>",
				keyboard: true,
				size: 'large',
				scope: $scope,
				controller: function ($scope, $modalInstance, $timeout) {
					$scope.cancelSnapshot = function snapshotModalCancel() {
						$modalInstance.close();
						kahuna.util.info('Snapshot restore was cancelled');
					};
					$scope.snapshotThenRestore = function snapshotModalBackup() {
						$modalInstance.close();
						$scope.snapshotProject($scope.restoreSnapshot);
					};
					$scope.restoreWithNoSnapshotSnapshot = function snapshotModalCancel() {
						$modalInstance.close();
						$scope.restoreSnapshot();
					};
				}
			});
			return;
		};

		$scope.restoreSnapshot = function restoreSnapshot(callback) {
			kahuna.util.info('Restoring snapshot ...');
			var restore = {
				name: "New snapshot restore " + new Date(),
				project_version_ident: $scope.data.currentSnapshot.ident
			};
			KahunaData.create("admin:project_version_restores", restore, function restore_project_success(data) {
				kahuna.applyFunctionInScope($scope, function () {
					// $scope.library = data.txsummary[0];
					if (callback) {
						callback();
					}
					else {
						kahuna.util.info('Snapshot has been restored');
					}
				});
			});
		};
	}
};
