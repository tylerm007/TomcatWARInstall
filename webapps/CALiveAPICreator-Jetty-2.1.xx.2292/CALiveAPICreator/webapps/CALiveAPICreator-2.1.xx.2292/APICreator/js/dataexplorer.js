kahuna.dataexplorer = {

	DataExplorerCtrl: function ($rootScope, $scope, $http, $resource, $routeParams, $location, KahunaData) {
		$rootScope.updateDataExplorerUrl();

		kahuna.layout.close('east');
		$rootScope.currentPage = 'dataexplorer';
		$rootScope.currentPageHelp = 'docs/rest-apis/urls#TOC-API-version-Request';
		$rootScope.helpDialog('dataexplorer', 'Help', localStorage['eslo-ld-learn-complete']);

		console.log('alpha');
	}
};
