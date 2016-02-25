kahuna.account = {

	AccountCtrl: function ($rootScope, $scope, $http, $resource, $routeParams, $location, KahunaData) {

		$rootScope.currentPage = 'account';
		$rootScope.currentPageHelp = 'docs';
		$scope.data = {};

		$scope.saveAccount = function saveAccount() {
			KahunaData.update($rootScope.currentAccount, function (data) {
				if (data.txsummary.length == 1) {
					$rootScope.currentAccount = data.txsummary[0];
				}
			});
		};

		$scope.deleteUser = function deleteUser() {
			if ( ! confirm('Delete user ' + $scope.data.currentUser.name + ' ?')) {
				return;
			}
			KahunaData.remove($scope.data.currentUser, function (data) {
				kahuna.util.info('User ' + $scope.data.currentUser.name + ' was deleted');
				var idx = $scope.data.users.indexOf($scope.data.currentUser);
				$scope.data.users.splice(idx, 1);
				if (idx > 0) {
					$scope.data.currentUser = $scope.data.users[idx - 1];
				}
				else if ($scope.data.users.length > 0) {
					$scope.data.currentUser = $scope.data.users[0];
				}
				else {
					$scope.data.currentUser = null;
				}
				$scope.data.userPassword = passwordPlaceholder;
			});
		};

		var passwordPlaceholder = "????????";
		KahunaData.queryWithFilter('admin:users', 'sysfilter', 'like(data:\'%' + $scope.currentAccount.ident + '%\')', function (data) {
			$scope.data.users = data;
			$scope.data.nextBatch = false;
			if (data.length > 0) {
				if (data[data.length - 1]['@metadata'].next_batch) {
					$scope.data.nextBatch = data[data.length - 1]['@metadata'].next_batch;
					$scope.data.users.pop();
				}
			}
			if (data.length > 0 && ! $scope.data.currentUser) {
				$scope.data.currentUser = data[0];
				$scope.data.userPassword = passwordPlaceholder;
			}
		});

		function findRoleIndex(name) {
			if ( ! $scope.roles) {
				return -1;
			}
			for (var i = 0; i < $scope.roles.length; i++) {
				if (name == $scope.roles[i].name) {
					return i;
				}
			}
			return -1;
		}

		$scope.showUserRoles = function showUserRoles() {
			$scope.selectedRoles = [];
			if ( ! $scope.data.currentUser) {
				return;
			}

			var rolesStr = $scope.data.currentUser.roles;
			if (!rolesStr || rolesStr.trim().length == 0) {
				return;
			}

			var roleParts = rolesStr.split(",");
			for (var i = 0; i < roleParts.length; i++) {
				var idx = findRoleIndex(roleParts[i]);
				if (idx != -1) {
					$scope.selectedRoles[idx] = true;
				}
			}
		};

		$scope.roles = 'Account admin,Account reader,';

		$scope.$watch('data.currentUser', function (current) {
			if (angular.isUndefined(current)) {
				return;
			}
			if (current.roles.match(/\bAccount admin\b/g)) {
				$scope.data.accountAdminRole = true;
			}
			else {
				$scope.data.accountAdminRole = false;
			}
			if (current.roles.match(/\bAccount reader\b/g)) {
				$scope.data.accountReaderRole = true;
			}
			else {
				$scope.data.accountReaderRole = false;
			}
		}, true);

		$scope.toggleRoles = function toggleRoles() {
			$scope.data.currentUser.roles = "";
			if ($scope.data.accountAdminRole) {
				$scope.data.currentUser.roles += "Account admin,";
			}
			if ($scope.data.accountReaderRole) {
				$scope.data.currentUser.roles += "Account reader,";
			}
		};

		$scope.createUser = function createUser() {
			KahunaData.create('admin:users', {
				name: "User" + (new Date()).getTime(),
				fullname: "New user",
				email: "new@user.com",
				status: 'A',
				apikey_lifespan: null,
				roles: $scope.roles,
				data: 'accountIdent=' + $scope.currentAccount.ident,
				project_ident: 3
			},
			function (data) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:users' && modObj['@metadata'].verb === 'INSERT') {
						$scope.data.users.push(modObj);
						$scope.data.currentUser = modObj;
						$scope.data.userPassword = passwordPlaceholder;
						break;
					}
				}
			});
		};

		$scope.userSelected = function userSelected(user) {
			$scope.data.currentUser = user;
			$scope.showUserRoles();
			$scope.data.userPassword = passwordPlaceholder;

			if (user.apikey_lifespan) {
				$scope.data.keyDays = Math.floor(user.apikey_lifespan/86400);
				$scope.data.keyHours = Math.floor((user.apikey_lifespan - ($scope.data.keyDays * 86400)) / 3600);
				$scope.data.keyMinutes = Math.floor((user.apikey_lifespan - (($scope.data.keyDays * 86400) + ($scope.data.keyHours * 3600))) / 60);
			}
		};

		$scope.saveUser = function saveUser(user) {
			if ($scope.data.userPassword == passwordPlaceholder) {
				delete $scope.data.currentUser.password_hash;
			}
			else {
				$scope.data.currentUser.password_hash = $scope.data.userPassword;
			}
			var lifespan = 0;
			if ($scope.data.keyDays) lifespan += $scope.data.keyDays*86400;
			if ($scope.data.keyHours) lifespan += $scope.data.keyHours*3600;
			if ($scope.data.keyMinutes) lifespan += $scope.data.keyMinutes*60;
			if (lifespan > 0) {
				$scope.data.currentUser.apikey_lifespan = lifespan;
			}
			KahunaData.update($scope.data.currentUser, function (data) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'admin:users' && modObj.ident === $scope.data.currentUser.ident) {
						// kahuna.setInScope($scope, "currentUser", modObj);
						$scope.data.currentUser = modObj;
						for (var j = 0; j < $scope.data.users.length; j++) {
							if ($scope.data.users[j].ident == modObj.ident) {
								$scope.data.users[j] = modObj;
								break;
							}
						}
						break;
					}
				}
				kahuna.util.info('User ' + $scope.data.currentUser.name + ' was saved');
			});
		};
		$scope.getUserClass = function getUserClass(user, idx) {
			if (user.ident == $scope.data.currentUser.ident) {
				return "SelectedItem";
			}
			return (idx % 2) ? "OddItem" : "EvenItem";
		};

		$scope.deleteAccount = function deleteAccount() {
			if ( ! confirm("Are you ABSOLUTELY SURE you want to delete this account (" + $scope.currentAccount.name +
			")? This will delete all projects, rules, resources, and everything else associated with this account." +
			"If you confirm that this account should be deleted, you will be logged out.")) {
				return;
			}

			if ( ! confirm("Sorry for being a pain, but please confirm that you want to delete this account (" + $scope.currentAccount.name +
					")? This cannot be undone.")) {
				return;
			}

			KahunaData.remove($scope.currentAccount, function (data) {
				kahuna.util.info('Account ' + $scope.currentAccount.name + ' was deleted.');
				$rootScope.logout();
				delete kahuna;
				alert('Your account has been deleted, along with all projects and all related information.\n' +
						'Click OK to go to the CA Technologies Live API home page.');
				window.location = "http://www.espressologic.com";
			});
		};
	}
};
