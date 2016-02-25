kahuna.services = {
	kahunaHeaders: '',

	handleError: function handleError(data, status, url) {
		if (data && data.errorMessage) {
			alert(data.errorMessage);
		}
		else if (data && data.error) {
			alert(data.error);
		}
		else {
			if (status === 0) {
				console.log('Error ' + status);
			}
			else {
				alert('Error ' + status);
			}
		}
	}
};

angular.module('AdminServices', ['ngResource']).service('KahunaData', function ($http) {

	return {
		// Create a db object on server
		create: function create(className, data, callback, errorCallback) {
			var url = kahuna.baseUrl + className;
			var statusId = kahuna.startFetch();
			return $http.post(
				url,
				data,
				{ headers: kahuna.services.kahunaHeaders, timeout: 180000 }
			)
			.success(function (response) {
				kahuna.endFetch(statusId);
				callback && callback(response);
			})
			.error(function (errorData, status, headers, config) {
				console.log('KahunaData.create error: ' + errorData + " - " + status);
				kahuna.endFetch(statusId);
				(errorCallback || kahuna.services.handleError)(errorData, status, url);
			});
		},

		// Update a db object on server
		update: function update(object, callback, errorCallback) {
			var statusId = kahuna.startFetch();
			var href = null;
			if ($.isArray(object)) {
				if ( ! object.length) {
					return;
				}
				href = object[0]['@metadata'].href;
			}
			else {
				href = object['@metadata'].href;
			}
			return $http.put(href, object,
					{ headers: kahuna.services.kahunaHeaders, timeout: 180000 }
			)
			.success(function (response) {
				kahuna.endFetch(statusId);
				for (var name in response) {
					if (object.hasOwnProperty(name)) {
						object[name] = response[name];
					}
				}
				callback && callback(response);
			})
			.error(function (data, status, headers, config) {
				kahuna.endFetch(statusId);
				(errorCallback || kahuna.services.handleError)(data, status, href);
			});
		},

		// Update several db objects on server
		updateList: function updateList(resourceName, objects, callback, errorCallback) {
			var statusId = kahuna.startFetch();
			var url = kahuna.baseUrl + resourceName;
			return $http.put(url, objects,
				{ headers: kahuna.services.kahunaHeaders, timeout: 180000 }
			)
			.success(function (response) {
				kahuna.endFetch(statusId);
				callback && callback(response);
			})
			.error(function (data, status, headers, config) {
				kahuna.endFetch(statusId);
				(errorCallback || kahuna.services.handleError)(data, status, url);
			});
		},

		// Get a db object by id
		get: function get(className, objectId, callback, errorCallback) {
			var statusId = kahuna.startFetch();
			var url = kahuna.baseUrl + className + '/' + objectId;
			return $http.get(
				url,
				{ headers: kahuna.services.kahunaHeaders }
			).success(function (response) {
				kahuna.endFetch(statusId);
				callback && callback(response);
			}).error(function (data, status, headers, config) {
				kahuna.endFetch(statusId);
				(errorCallback || kahuna.services.handleError)(data, status, url);
			});
		},

		// Do a GET without an Auth Token
		rawGet: function rawGet(url, callback, errorCallback) {
			return $http.get(
				url,
				{ }
			).success(function (response) {
				callback && callback(response);
			}).error(function (data, status, headers, config) {
				(errorCallback || kahuna.services.handleError)(data, status, url);
			});
		},

		// Get a list of db objects
		list: function list(className, callback, errorCallback) {
			var statusId = kahuna.startFetch();
			return $http.get(
				kahuna.baseUrl + className,
				{ headers: kahuna.services.kahunaHeaders }
			).success(function (response) {
				kahuna.endFetch(statusId);
				callback && callback(response);
			}).error(function (data, status, headers, config) {
				kahuna.endFetch(statusId);
				(errorCallback || kahuna.services.handleError)(data, status, kahuna.baseUrl + className);
			});
		},

		// Get a list of objects from the given URL
		getUrl: function getUrl(url, callback, errorCallback) {
			var statusId = kahuna.startFetch();
			return $http.get(
					url,
					{ headers: kahuna.services.kahunaHeaders }
				).success(function (response) {
					kahuna.endFetch(statusId);
					callback && callback(response);
				}).error(function (data, status, headers, config) {
					kahuna.endFetch(statusId);
					(errorCallback || kahuna.services.handleError)(data, status, url);
				});
		},

		// Get related db object(s) by role name
		getRelated: function getRelated(className, object, roleName, callback, errorCallback) {
			return $http.get(
				object[roleName].href,
				// kahuna.baseUrl + 'data/' + className + '/' + objectId + '/' + roleName,
				{ headers: kahuna.services.kahunaHeaders }
			).success(function (response) {
				callback && callback(response);
			}).error(function (data, status, headers, config) {
				(errorCallback || kahuna.services.handleError)(data, status, object[roleName].href);
			});
		},

		// Get a list of db objects with query. The query parameter can either be a String, which is then passed
		// as the filter for the query, or it can be an Object with several parameters.
		query: function query(url, query, callback, errorCallback) {
			var statusId = kahuna.startFetch();
			var config = { headers: kahuna.services.kahunaHeaders };
			if (query) {
				if (query instanceof Object) {
					config.params = query;
				}
				else {
					config.params = { filter: query };
				}
			}
			if (url.substring(0, 4) != 'http') {
				url = kahuna.baseUrl + url;
			}
			return $http.get(
				url,
				config
			).success(function (response) {
				kahuna.endFetch(statusId);
				callback && callback(response);
			}).error(function (data, status, headers, errorConfig) {
				kahuna.endFetch(statusId);
				(errorCallback || kahuna.services.handleError)(data, status, url);
			});
		},

		// Get a list of db objects with query. The query parameter can either be a String, which is then passed
		// as the filter for the query, or it can be an Object with several parameters.
		// filterResource should be e.g. sysfilter.Customer
		// query should be e.g. equal(name: 'Acme')
		queryWithFilter: function queryWithFilter(url, filterResource, query, callback, errorCallback) {
			var statusId = kahuna.startFetch();
			var config = { headers: kahuna.services.kahunaHeaders };
			if (query) {
				if (query instanceof Object) {
					config.params = query;
				}
				else {
					config.params = {};
					config.params[filterResource] = query;
				}
			}
			if (url.substring(0, 4) != 'http') {
				url = kahuna.baseUrl + url;
			}
			return $http.get(
				url,
				config
			).success(function (response) {
				kahuna.endFetch(statusId);
				callback && callback(response);
			}).error(function (data, status, headers, errorConfig) {
				kahuna.endFetch(statusId);
				(errorCallback || kahuna.services.handleError)(data, status, url);
			});
		},

		// Get a list of db objects with a specific Auth Token
		queryWithKey: function queryWithKey(url, query, key, callback, errorCallback) {
			var statusId = kahuna.startFetch();
			var config = { headers: { Authorization: "CALiveAPICreator " + key.apikey + ":1" } };
			if (query) {
				config.params = { filter: query };
			}
			if (url.substring(0, 4) != 'http') {
				url = kahuna.baseUrl + url;
			}
			return $http.get(
				url,
				config
			).success(function (data, status, hdrs, conf) {
				kahuna.endFetch(statusId);
				callback && callback(data, status, hdrs);
			}).error(function (data, status, headers, errorConfig) {
				kahuna.endFetch(statusId);
				(errorCallback || kahuna.services.handleError)(data, status, url);
			});
		},

		// Flexible create for use in REST Lab
		createWithKey: function createWithKey(url, data, params, key, callback, errorCallback) {
			var statusId = kahuna.startFetch();
			var config = { headers: {Authorization: "CALiveAPICreator " + key.apikey + ":1"}, timeout: 180000 };
			if (params) {
				config.params = params;
			}
			if (url.substring(0, 4) != 'http') {
				url = kahuna.baseUrl + url;
			}
			return $http.post(
					url,
					data,
					config
				)
				.success(function (successData, status, hdrs, conf) {
					kahuna.endFetch(statusId);
					callback && callback(successData);
				})
				.error(function (errorData, status, headers, errorConfig) {
					kahuna.endFetch(statusId);
					(errorCallback || kahuna.services.handleError)(errorData, status, url);
				});
		},

		// Flexible update for use in REST Lab
		updateWithKey: function updateWithKey(url, data, params, key, callback, errorCallback) {
			var statusId = kahuna.startFetch();
			var config = { headers: { Authorization: "CALiveAPICreator " + key.apikey + ":1" }, timeout: 600000 };
			if (params) {
				config.params = params;
			}
			if (url.substring(0, 4) != 'http') {
				url = kahuna.baseUrl + url;
			}
			return $http.put(
					url,
					data,
					config
				)
				.success(function (successData, status, hdrs, conf) {
					kahuna.endFetch(statusId);
					callback && callback(successData, status, hdrs);
				})
				.error(function (errorData, status, headers, errorConfig) {
					kahuna.endFetch(statusId);
					(errorCallback || kahuna.services.handleError)(errorData, status, url);
				});
		},

		// Flexible delete for use in REST Lab
		deleteWithKey: function deleteWithKey(url, params, key, callback, errorCallback) {
			var statusId = kahuna.startFetch();
			var config = { headers: {Authorization: "CALiveAPICreator " + key.apikey + ":1"} };
			if (params) config.params = params;
			if (url.substring(0, 4) != 'http') {
				url = kahuna.baseUrl + url;
			}
			return $http['delete'](
					url,
					config
				)
				.success(function (data, status, hdrs, conf) {
					kahuna.endFetch(statusId);
					callback && callback(data, status, hdrs);
				})
				.error(function (data, status, headers, errorConfig) {
					kahuna.endFetch(statusId);
					(errorCallback || kahuna.services.handleError)(data, status, url);
				});
		},

		// Remove a db object
		remove: function remove(object, callback, errorCallback) {
			var statusId = kahuna.startFetch();
			return $http['delete'](
				object['@metadata'].href + '?checksum=' + object['@metadata'].checksum,
				{ headers: kahuna.services.kahunaHeaders }
			).success(function (response) {
				kahuna.endFetch(statusId);
				callback && callback(response);
			}).error(function (data, status, headers, config) {
				kahuna.endFetch(statusId);
				(errorCallback || kahuna.services.handleError)(data, status, object['@metadata'].href);
			});
		},

		// Remove some objects
		removeWithUrl: function removeWithUrl(url, callback, errorCallback) {
			if (url.substring(0, 4) != 'http') {
				url = kahuna.baseUrl + url;
			}
			var statusId = kahuna.startFetch();
			return $http['delete'](
					url,
					{ headers: kahuna.services.kahunaHeaders }
				).success(function (response) {
					kahuna.endFetch(statusId);
					callback && callback(response);
				}).error(function (data, status, headers, config) {
					kahuna.endFetch(statusId);
					(errorCallback || kahuna.services.handleError)(data, status, url);
				});
		},

		// Get metadata objects
		getMeta: function getMeta(url, callback, errorCallback) {
			if (kahuna.cache[url]) {
				callback && callback(kahuna.cache[url]);
				return;
			}
			var statusId = kahuna.startFetch();
			if (url.substring(0, 4) != 'http') {
				url = kahuna.baseUrl + url;
			}
			return $http['get'](
				url,
				{ headers: kahuna.services.kahunaHeaders }
			).success(function (response) {
				kahuna.endFetch(statusId);
				callback && callback(response);
			}).error(function (data, status, headers, config) {
				kahuna.endFetch(statusId);
				(errorCallback || kahuna.services.handleError)(data, status, url);
			});
		},

		// Try to connect to the server
		pingServer: function pingServer(url, apiKey, callback, errorCallback) {
			var statusId = kahuna.startFetch();
			return $http.get(
				url,
				{ headers: {Authorization: 'CALiveAPICreator ' + apiKey + ":1"}}
			).success(function (response) {
				kahuna.endFetch(statusId);
				callback && callback(true);
			}).error(function (data, status, headers, config) {
				kahuna.endFetch(statusId);
				(errorCallback || callback) && (errorCallback || callback)(data);
			});
		}
	};
});
