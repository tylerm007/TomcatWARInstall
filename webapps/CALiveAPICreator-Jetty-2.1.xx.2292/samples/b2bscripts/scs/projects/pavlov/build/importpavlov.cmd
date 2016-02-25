rem

rem Logon to local  Jetty server (if using a WAR file use http://localhost:8080/APIServer) 
call lacadmin logout -a local
call lacadmin login -u admin -p Password1 http://localhost:8080/ -a local
call lacadmin use local

rem Import the Pavlov API project
call lacadmin project delete --url_name pavlov
call lacadmin project import --file ../src/PavlovAPI.json

rem Fix up Auth Provider
call lacadmin project update --authprovider 1000

echo **** pavlov imported ****

rem close connections
call lacadmin logout -a local
