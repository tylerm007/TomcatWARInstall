
kahuna.problems = {

	ProblemsCtrl: function ProblemsCtrl($scope, $rootScope, $routeParams, $location, KahunaData) {

		$rootScope.currentPage = 'problems';
		$rootScope.currentPageHelp = 'docs/logic-designer/security/authentication#TOC-Authentication-Provider';
		$rootScope.helpDialog('problems', 'Help', localStorage['eslo-ld-learn-complete']);

		$scope.data = {};

		$scope.problemSelected = function problemSelected(p) {
			$scope.data.selectedProblem = p;
			$scope.data.selectedProblemType = p.ProblemType;
		};

		$rootScope.updateProblems($scope.selectFirstProblem);

		$scope.getProblemClass = function getProblemClass(p, idx) {
			if (p === $scope.data.selectedProblem) {
				return "SelectedItem";
			}
			return (idx % 2) ? "OddItem" : "EvenItem";
		};

		$scope.fixProblem = function fixProblem(p) {
			if (p.ProblemType.defaultfix_is_destructive) {
				if ( ! confirm('This will apply the default fix to this problem, which is destructive. Proceed?')) {
					return;
				}
			}
			if (p.status == 'F') {
				// If a problem is still in F mode, we still need to update to trigger actions
				p.status = 'f';
			}
			else {
				p.status = 'F';
			}
			KahunaData.update(p, function (data) {
				var resolution = "";
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'ProjectProblems' && modObj.ident === p.ident) {
						if (modObj.status != 'C') {
							throw "Unable to fix problem";
						}
						resolution = modObj.resolution;
						break;
					}
				}

				kahuna.util.info('Problem has been fixed' + (resolution ? " : " + resolution : ""));

				$rootScope.updateProblems($scope.selectFirstProblem);
			});
		};

		$scope.closeProblem = function closeProblem(p) {
			p.status = 'C';
			p.resolution = 'Problem was manually closed.';
			KahunaData.update(p, function (data) {
				for (var i = 0; i < data.txsummary.length; i++) {
					var modObj = data.txsummary[i];
					if (modObj['@metadata'].resource === 'ProjectProblems' && modObj.ident === p.ident) {
						if (modObj.status != 'C') {
							throw "Unable to fix problem";
						}
						break;
					}
				}

				$rootScope.updateProblems($scope.selectFirstProblem);

				kahuna.util.info('Problem has been closed.');
			});
		};

		$scope.selectFirstProblem = function selectFirstProblem() {
			if ($rootScope.problems.length > 0) {
				$scope.problemSelected($rootScope.problems[0]);
			}
			else {
				$scope.data.selectedProblem = null;
				$scope.data.selectedProblemType = null;
			}
		};

		$scope.showProblem = function showProblem(p) {
			var pageName;
			switch (p.entity_name) {
			case 'admin:resources':
			case 'admin:resourceattributes':
				pageName = 'resources';
				break;
			case 'admin:rules':
				pageName = 'rule';
				break;
			default:
				throw "Unknown problem entity: " + p.entity_name;
			}
			$location.path("/projects/" + $scope.currentProject.ident + "/" + pageName + "/" + (p.row_ident2 ? p.row_ident2 : p.row_ident));
		};
	}
};
