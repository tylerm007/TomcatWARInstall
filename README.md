#Install API Creator on Tomcat

CA Live API Creator provides multiple ways to run the service, in the cloud, on-premise using a VM appliance, or as a WAR file.  These are the instructions for running a WAR file on Apache Tomcat.

Before you start:
```
1) Download and install MySQL
2) Download Apache Tomcat 7.0.x
3) Make sure you are running Java 7.x or higher 
```
##Step 1 - Download the ZIP file from GitHub Tomcat WAR install

Copy the contents of the ZIP file to %TOMCAT_HOME%/webapps
(The 2 WAR files are APICreator and DataExplorer)

##Step 2 - Create a global connection string 

Windows Example (in a command window): 
```
 set MYSQLCONNSTR_AdminDB=Database=dbtest;Data Source=localhost:3306;User Id=dbtest;Password=Password!
 ```
The database should be created first in MySQL and should be an empty database that will be used to store the metadata repository.

##Step 3. Start your tomcat service 
```
$%TOMCAT_HOME%/bin/startup.sh
```
##Step 4) In your browser type:
```
http://localhost:8080/APICreator/#
```

WAIT about 1 minute while the repository is being configured the first time.
DEBUG Logs (catalina.DATE.log and esspresso.DATE.log) are located:
%TOMCAT_HOME%/logs 

NOTE: If you wish to use JNDI (replaces global adminDB setting above)
Modify the %TOMCAT_HOME%/conf/server.xml and add 
```
<Context docBase="\" path="/" reloadable="true">
           <Resource accessToUnderlyingConnectionAllowed="true" 
	        auth="Container" 
	        defaultAutoCommit="false" 
	        driverClassName="com.mysql.jdbc.Driver" 
	        initialSize="5" 
	        logAbandoned="true" 
	        maxActive="20" 
	        maxIdle="10" 
	        maxWait="30000" 
	        minIdle="5" 
	        name="jdbc/AdminDB" 
	        password="password!" 
	        removeAbandoned="true" 
	        removeAbandonedTimeout="30" 
	        type="javax.sql.DataSource"
	        url="jdbc:mysql://localhost:3306/admin_db?characterEncoding=utf8" 
	        username="admin_usr" 
	        validationQuery="select 1"/>
            </Context>
```
docs: http://ca-doc.espressologic.com/docs/installing-on-tomcat
