@echo off
echo ##########################################################################
echo  Starting CA Live API Creator - API Server...
echo  This should take a few seconds.
echo.
echo.
echo  The Stop.sh command can be used to stop this server, or you may Ctrl-C
echo  in this window.
echo.
echo.
echo  A Java installation is required.  If the server does not start, please
echo  verify that Java version 7 or 8 is accessible from the command line.
echo.
echo.
echo  When the message "oejs.Server:main: Started @XXXXXms" appears, go to:
echo      http://localhost:8080
echo ##########################################################################
echo.
echo.
cd CALiveAPICreator
java -DSTOP.PORT=8123 -DSTOP.KEY=stop_caliveapicreator -jar ..\start.jar %1 %2 %3 %4 %5 %6 %7 %8 %9
cd ..
