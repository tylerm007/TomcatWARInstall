#! /bin/bash

echo 
echo 
echo *** importing nwindb2b to $1

lacadmin logout -a local
lacadmin login -u admin -p Password1 $1 -a local
lacadmin use local

# Import the Northwind B2B Project, and 'use' it in subsequent commands
lacadmin project delete --url_name nwindb2b
lacadmin project import --file ../src/Northwind-B2B.json
lacadmin project use --url_name nwindb2b

# Link in the library.
lacadmin library --linkProject --name postResourceToJS
lacadmin library --linkProject --name RESTAuthSecurityProviderCreateJS

# Link to the logic library (it is used by the auth provider - see readinessLabs).
lacadmin authprovider create --name RESTAuthSecurityProviderCreateJS --createFunction RESTAuthSecurityProviderCreate --paramMap logonApiKey=Bzn8jVyfOTiIpW6UQCgy,loginBaseURL=http://localhost:8080/rest/default/nwindb2b/v1/nw%3AEmployees,loginGroupURL=http://localhost:8080/rest/default/nwindb2b/v1/nw%3ARegion --comments 'Uses NW Employees for REST Validation'
lacadmin authprovider linkProject --name RESTAuthSecurityProviderCreateJS


# Data Sources [optional] for other databases - set the password
lacadmin datasource list
#lacadmin datasource update --prefix nw --password password1 -- Jetty does not use pwd


echo **** Northwind-B2B imported ****

# close connections
lacadmin logout -a local
