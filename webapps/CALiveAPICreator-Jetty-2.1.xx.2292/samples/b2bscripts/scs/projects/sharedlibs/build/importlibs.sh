#! /bin/bash

echo 
echo 
echo *** importing libs to $1

echo *** Note: we logout to facilitate re-execution.  In most cases, this results in an inconsequential error. 

lacadmin logout -a local
lacadmin login -u admin -p Password1 $1 -a local
lacadmin use local

# Create the AuthProvider library.
lacadmin libraries create --name RESTAuthSecurityProviderCreate --short_name restauth --libtype javascript --ver 1.0  --file ../src/RESTAuthSecurityProvider.js  --comments 'RESTAuthProvider js Demo'

# Create a new library (postResourceTo.js), and link it to the current project
lacadmin libraries create --name postResourceToJS --short_name postjs --libtype javascript --ver 1.0 --file ../src/postResourceTo.js  --comments 'postResourceTo'

echo **** libraries imported ****

# close connections
lacadmin logout -a local
