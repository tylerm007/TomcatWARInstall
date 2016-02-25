#! /bin/bash
# import Script for Northwind-B2B Jetty sample (2 APIs)

APIServerURL="http://localhost:8080"

echo
echo installing sharedlibs, pavlov, and b2b...
echo

# import shared libs
pushd ./scs/projects/sharedlibs/build
sh ./importlibs.sh $APIServerURL
popd

# create pavlov API
pushd ./scs/projects/pavlov/build
sh ./importpavlov.sh $APIServerURL
popd

# create B2B API
pushd ./scs/projects/b2b/build
sh ./importnwb2b.sh $APIServerURL
popd

echo
echo
echo **** install complete - server status follows ****
lacadmin login -u admin -p Password1 $APIServerURL -a local
lacadmin use local

lacadmin status
lacadmin libraries list
lacadmin project list

lacadmin logout -a local

