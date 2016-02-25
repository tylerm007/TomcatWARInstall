rem

echo *** Note: we logout to facilitate re-execution.  In most cases, this results in an inconsequential error. 
rem Logon to local  Jetty server (if using a WAR file use http://localhost:8080/APIServer)
call lacadmin logout -a local
call lacadmin login -u admin -p Password1 http://localhost:8080/ -a local
call lacadmin use local

rem Create the AuthProvider library.
call lacadmin libraries create --name RESTAuthSecurityProviderCreate --short_name restauth --libtype javascript --ver 1.0 --file ../src/RESTAuthSecurityProvider.js  --comments RESTAuthProvider js Demo

rem Create a new library (postResourceTo.js), and link it to the current project
call lacadmin libraries create --name postResourceToJS --short_name postjs --libtype javascript --ver 1.0 --file ../src/postResourceTo.js  --comments postResourceTo

echo **** libraries imported ****

rem close connections
call lacadmin logout -a local
