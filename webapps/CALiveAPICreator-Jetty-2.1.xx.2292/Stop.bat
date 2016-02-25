@echo off
echo ##############################################################################
echo This will attempt to shutdown the instance of CA Live API Creator - API Server
echo If the API Server is not running, or has not been started with Start.bat
echo an error will appear that can be ignored
echo ##############################################################################

java -DSTOP.PORT=8123 -DSTOP.KEY=stop_caliveapicreator -jar start.jar --stop
