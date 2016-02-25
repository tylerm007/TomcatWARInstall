/**
 * @ngdoc controller
 * @name AuthorLogin
 */
espresso.app.controller('espresso.AppSettingsCtrl', [
	'$scope' , 'Tables' , '$rootScope' , '$modal', '$modalInstance', '$http', 'Settings', 'Events', 'Notifications',
	function ($scope , Tables , $rootScope , $modal, $modalInstance, $http, Settings, Events, Notifications) {

		$scope.controls = {};
		$scope.helpers = {};
		$scope.data = {};
		$scope.params = {};
		$scope.selectedSkin = [];
		var headers = {Authorization: "CALiveAPICreator " + $rootScope.root.authorInfo.apikey + ":1"};

		$scope.controls.closeAppSettings = function closeAppSettings() {
			$modalInstance.close();
		};

		$scope.helpers.resetDefaultWindows = function resetDefaultWindows() {
			$scope.params.defaultWindows.main = false;
			$scope.params.defaultWindows.form = false;
			$scope.params.defaultWindows.child = false;
		};

		var tables  = _.keys($rootScope.allTables);

		var defaultLinkState = {
			name: null,
			table: $rootScope.allTables[tables[0]].name,
			main: true,
			form: true,
			child: true
		};
		$scope.data.newLink = angular.copy(defaultLinkState);
		$scope.controls.addNewLink = function addNewLink() {
			if (!$scope.data.newLink.name) {
				Notifications.error( 'New links must have a name to be appended to the menu.');
				return;
			}
			var meta = {
				name: '__settings__',
				links: []
			};

			if ($rootScope.root.appSettingObjects['__settings__']) {
				var rawMetaSettings = JSON.parse($rootScope.root.appSettingObjects['__settings__'].json);
				meta.links = rawMetaSettings.links;
			}

			meta.links.push($scope.data.newLink);

			Settings.saveMetaSettings(meta);

			$rootScope.links = meta.links;

			$scope.data.newLink = angular.copy(defaultLinkState);
		};

		$scope.params.defaultWindows = {};
		$scope.params.defaultTable = Tables.getDefaultTable();
		$scope.params.windowsTable = $rootScope.allTables[tables[0]].name;
		$scope.helpers.resetDefaultWindows();
		$scope.params.windowTableSettings = {};

		$scope.$watch('params.windowsTable', function (current, previous) {
			$scope.params.windowTableSettings = Tables.getSettings(current);
			$scope.helpers.resetDefaultWindows();
			_.each($scope.params.windowTableSettings.windows, function (window) {
				$scope.params.defaultWindows[window] = true;
			});

			if (previous != current) {
				Tables.saveTableSettings(previous);
			}
		});

		$scope.$watch('params.defaultWindows', function (current) {
			var windows = [];
			_.each(current, function (displayed, window) {
				if (displayed) {
					windows.push(window);
				}
			});
			$scope.params.windowTableSettings.windows = windows;
		}, true);

		$scope.getAllSkins = function getAllSkins() {
			var skinsUrl = $rootScope.root.authorInfo.url + 'app_skins';
			$http.get(skinsUrl, {headers: headers, params: {
				sysfilter: "equal(app_ident:" + espresso.settings.ident + ')',
				inlinelimit: 0,
				inline:"name,description"
			}})
			.success(function(data) {
				espresso.util.setInScopeFun($scope, function() {
					$scope.skins = data;
					if (espresso.settings.skin_ident) {
						for (var i = 0; i < $scope.skins.length; i++) {
							$scope.selectedSkin[i] = false;
							if ($scope.skins[i].ident == espresso.settings.skin_ident)
								$scope.selectedSkin[i] = true;
						}
					}
				});
			})
			.error(function() {
				espresso.util.error("Error getting app_skins");
			});
		};

		$scope.controls.saveGeneralSettings = function () {
			var newDefaultTable = Tables.getSettings($scope.params.defaultTable);
			Tables.setDefaultTable($scope.params.defaultTable);
			Tables.saveTableSettings($scope.params.defaultTable).success(function () {
				Tables.saveTableSettings($scope.params.windowsTable);
			});
			$scope.controls.closeAppSettings();
		};

		$scope.controls.saveSkinSettings = function() {
			var selSkin = null;
			for (var i = 0; i < $scope.skins.length; i++) {
				if ($scope.selectedSkin[i]) {
					selSkin = $scope.skins[i];
					break;
				}
			}

			var appToSave = null;
			if (selSkin && selSkin.ident != espresso.settings.skin_ident) {
				appToSave = espresso.settings;
				appToSave.skin_ident = selSkin.ident;
//				var skinUrl = espresso.projectUrl + '@app_skin/' + $rootScope.root.appObject.ident;
//				$rootScope.setUserCSS(skinUrl);
			}
			else if ( ! selSkin && espresso.settings.skin_ident) {
				appToSave = espresso.settings;
				appToSave.skin_ident = null;
//				$rootScope.setUserCSS(null);
			}
			if (appToSave) {
				$http.put(appToSave['@metadata'].href, espresso.settings, {headers: headers})
				.success(function(data) {
					espresso.settings = data.txsummary[0];
					espresso.util.info("Application was saved");
					if (espresso.settings.skin_ident) {
						var skinUrl = espresso.projectUrl + '@app_skin/' + espresso.settings.ident;
						$rootScope.setUserCSS(skinUrl);
					}
					else {
						$rootScope.setUserCSS(null);
					}
					$modalInstance.close();
				})
				.error(function() {
					espresso.util.error("Error while saving app");
					$modalInstance.close();
				});
			}
		};

		$scope.root.appObject = espresso.settings;

		$scope.$watch("root.appObject", function () {
			if (!espresso.settings)
				return;
			$scope.getAllSkins();
		});

		$scope.createSkin = function createSkin() {
			var newSkin = {
				name: "New skin",
				description: "This is a new skin",
				app_ident: espresso.settings.ident
			};
			var skinsUrl = $rootScope.root.authorInfo.url + 'app_skins';
			$http.post(skinsUrl, newSkin, {headers: headers})
			.success(function(data) {
				$scope.skins.push(data.txsummary[0]);
			})
			.error(function() {
				espresso.util.error("Error while creating new skin");
			});
		};

		$scope.skinSelected = function skinSelected(skin) {

			for (var i = 0; i < $scope.skins.length; i++) {
				if ($scope.skins[i].ident != skin.ident)
					$scope.selectedSkin[i] = false;
			}

//			var selSkin = null;
//			for (var i = 0; i < $scope.skins.length; i++) {
//				if ($scope.selectedSkin[i]) {
//					selSkin = $scope.skins[i];
//					break;
//				}
//			}
//
//			var appToSave = null;
//			if (selSkin && selSkin.ident != $rootScope.root.appObject.skin_ident) {
//				appToSave = $rootScope.root.appObject;
//				appToSave.skin_ident = selSkin.ident;
//				var skinUrl = espresso.projectUrl + '@app_skin/' + $rootScope.root.appObject.ident;
//				$rootScope.setUserCSS(skinUrl);
//				$rootScope.root.appObject.skin_ident = selSkin.ident;
//			}
//			else if ( ! selSkin && $rootScope.root.appObject.skin_ident) {
//				appToSave = $rootScope.root.appObject;
//				appToSave.skin_ident = null;
//				$rootScope.setUserCSS(null);
//				$rootScope.root.appObject.skin_ident = null;
//			}
		};

		$scope.deleteSkin = function deleteSkin(skin) {
			if ( ! confirm('Delete this skin (' + skin.name + ')?')) {
				return;
			}
			var activeSkin;
			angular.forEach($scope.selectedSkin, function (element, index) {
				if (element) {
					activeSkin = angular.copy($scope.skins[index]);
				}
			});
			$http["delete"](skin['@metadata'].href, {headers: headers, params: {checksum: skin['@metadata'].checksum}})
			.success(function () {
				for (var i = 0; i < $scope.skins.length; i++) {
					if ($scope.skins[i]['@metadata'].href == skin['@metadata'].href) {
						$scope.skins.splice(i, 1);
						$scope.selectedSkin.splice(i, 1);
						break;
					}
				}
				if (activeSkin) {
					angular.forEach($scope.selectedSkin, function (element, index) {
						if ($scope.skins[index] && $scope.skins[index]['@metadata'].href == activeSkin['@metadata'].href) {
							element = true;
						}
						else {
							false;
						}
					});
				}
			});
		};

		$scope.editSkin = function editSkin(skin) {
			var options = {
					backdrop: 'static',
					keyboard: true,
					templateUrl:  'templates/modals/skinEditor.html',
					controller: 'espresso.SkinEditorCtrl',
					resolve: {
						skin: function () { return skin; }
					}
				};
			$modal.open(options).result.then(function (a) {
				console.log('Skin edit dialog returned');
				$scope.getAllSkins();
			});
		};
		
		
		$scope.controls.saveLinkSettings = function saveLinkSettings() {
			var meta = {
				name: '__settings__',
				links: $rootScope.links
			};

			Settings.saveMetaSettings(meta);
			$scope.controls.closeAppSettings();
		};
		
		$scope.controls.remove = function removeLink(index) {
			$rootScope.links.splice(index, 1);
		};
		
		$scope.initSortable = function initSortable() {
			var $sortable = $('.sortable');
			
			$sortable.sortable({
				revert: true,
				handle: '.link-drag-handle',
				//connectWith: '.sortable',
				stop: function stopSortColumnOrder(event, ui) {
					$scope.$evalAsync(function () {
						console.log('stopped');
						var reorder = [];
						
						$('.link-item').each(function (index, element) {
							reorder.push($rootScope.links[$(element).data('link-index')]);
						});
						
						$rootScope.links = reorder;
					});
				}
			});
		};
	}
]);

////////////////////////////////////////////////////////////////////////////////////////////////////

espresso.app.controller( 'espresso.SkinEditorCtrl', [
	'$scope' , 'Tables' , '$rootScope' , '$timeout', '$modalInstance', '$http', 'Settings', 'skin',
	function( $scope , Tables , $rootScope , $timeout, $modalInstance, $http, Settings, skin ){

		$scope.skin = skin;
		var headers = {
			Authorization: "CALiveAPICreator " + $rootScope.root.authorInfo.apikey + ":1",
			'X-CALiveAPICreator-ResponseFormat': 'json'
		};

		$scope.closeSkinModal = function closeSkinModal() {
			$modalInstance.close();
		};

		$scope.updateSkin = function updateSkin() {
			var skinCopy = espresso.util.cloneObject($scope.skin);
			delete skinCopy.css;
			$http.put($scope.skin['@metadata'].href, skinCopy, {headers: headers})
			.success(function(data) {
				$scope.skin = data.txsummary[0];
				espresso.util.info('Skin was saved');
				$scope.closeSkinModal();
			})
			.error(function() {
				espresso.util.error('Error saving skin');
				$scope.closeSkinModal();
			});
		};

		$scope.saveSkin = function saveSkin() {
			if ($('#skinFile')[0].files[0]) {
				$scope.uploadStylesheet($scope.updateSkin);
			}
			else
				$scope.updateSkin();
		};

		$scope.uploadStylesheet = function uploadStylesheet(fun) {
			var formData = new FormData();
			formData.append('checksum', $scope.skin['@metadata'].checksum);
			formData.append('authorization', $rootScope.root.authorInfo.apikey + ':1');
			formData.append('css', $('#skinFile')[0].files[0]);
			$.ajax({
				url: $scope.skin['@metadata'].href,
				type: 'POST',
				xhr: function () {
					// Custom XMLHttpRequest
					var myXhr = $.ajaxSettings.xhr();
					// if (myXhr.upload){
					//   myXhr.upload.addEventListener('progress', $scope.uploadProgress, false);
					// }
					return myXhr;
				},
				beforeSend: function () {
				},
				success: function (d) {
					//espresso.util.info("Upload complete");
					espresso.util.setInScopeFun($scope, function() {
					$scope.skinUploadMessage = "Upload complete";
						$timeout(function() { $scope.skinUploadMessage = null; }, 3000);
					});
					console.log('Upload complete');
					$scope.skin["@metadata"] = d.txsummary[0]["@metadata"];
					$scope.css = d.txsummary[0].css;
					if (fun) fun(d.txsummary[0]);
				},
				error: function (err) {
					var msg = "File upload failed";
					if (err && err.responseJSON && err.responseJSON.errorMessage) {
						msg += " : " + err.responseJSON.errorMessage;
					}
					espresso.util.error(msg);
					console.log(msg);
				},
				// Form data
				data: formData,
				// Options to tell jQuery not to process data or worry about content-type.
				cache: false,
				contentType: false,
				processData: false
			});
		};
	}
]);
