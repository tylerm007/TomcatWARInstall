
// this sample illustrates that you can Load Java and JavaScript Libraries, and call them from your rules
// for instructions, please see: http://ca-doc.espressologic.com/docs/logic-designer/create/api-properties/logic-libraries

function postResourceTo ( aResourceName, anOptions, aTargetUrl, aSettings) {
		var resourceResponse = SysUtility.getResource(aResourceName, anOptions);  // resource provides name mapping
		var response =  SysUtility.restPost(aTargetUrl, null, aSettings, resourceResponse[0]);
		// log.debug('ok, using re-usable solution');
		return response;
}
