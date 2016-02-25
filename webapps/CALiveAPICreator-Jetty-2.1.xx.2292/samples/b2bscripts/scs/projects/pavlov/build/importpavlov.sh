#! /bin/bash

echo 
echo 
echo *** importing pavlov to $1

lacadmin logout -a local
lacadmin login -u admin -p Password1 $1 -a local
lacadmin use local

# Import the Pavlov API project
lacadmin project delete --url_name pavlov
lacadmin project import --file ../src/PavlovAPI.json

# Fix up Auth Provider
lacadmin project update --authprovider 1000

echo **** pavlov imported ****

# close connections
lacadmin logout -a local
