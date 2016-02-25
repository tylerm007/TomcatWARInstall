rem

rem  Logon to local  Jetty server (if using a WAR file use http://localhost:8080/APIServer)
call lacadmin logout -a local
call lacadmin login -u admin -p Password1 http://localhost:8080/ -a local
call lacadmin use local

rem  Import the Northwind B2B Project, and 'use' it in subsequent commands
call lacadmin project delete --url_name nwindb2b
call lacadmin project import --file ../src/Northwind-B2B.json
call lacadmin project use --url_name nwindb2b

rem  Link in the library.
call lacadmin library --linkProject --name postResourceToJS
call lacadmin library --linkProject --name RESTAuthSecurityProviderCreateJS

rem  Link to the logic library (it is used by the auth provider - see readinessLabs).
call lacadmin authprovider create --name RESTAuthSecurityProviderCreateJS --createFunction RESTAuthSecurityProviderCreate --paramMap logonApiKey=Bzn8jVyfOTiIpW6UQCgy,loginBaseURL=http://localhost:8080/rest/default/nwindb2b/v1/nw%3AEmployees,loginGroupURL=http://localhost:8080/rest/default/nwindb2b/v1/nw%3ARegion --comments 'Uses NW Employees for REST Validation'
call lacadmin authprovider linkProject --name RESTAuthSecurityProviderCreateJS


rem  Data Sources [optional] for other databases - set the password
call lacadmin datasource list
rem call lacadmin datasource update --prefix nw --password password1 -- Jetty does not use pwd


echo **** Northwind-B2B imported ****

rem  close connections
call lacadmin logout -a local
