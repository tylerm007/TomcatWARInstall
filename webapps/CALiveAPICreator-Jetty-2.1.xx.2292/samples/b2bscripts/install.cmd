rem
rem import Script for Northwind-B2B Jetty sample (2 APIs)

rem import shared libs
pushd .\scs\projects\sharedlibs\build
call .\importlibs.cmd
popd

rem create pavlov API
pushd .\scs\projects\pavlov\build
call .\importpavlov.cmd
popd

rem create B2B API
pushd .\scs\projects\b2b\build
call .\importnwb2b.cmd
popd

echo **** install complete - server status follows ****
call lacadmin login -u admin -p Password1 http://localhost:8080/ -a local
call lacadmin use local

call lacadmin status
call lacadmin libraries list
call lacadmin project list

call lacadmin logout -a local
