// this sample illustrates that you can Load Java and JavaScript Libraries, and call them from your rules
// for instructions, please see: http://ca-doc.espressologic.com/docs/logic-designer/create/api-properties/logic-libraries

function sendEmail() {
	var result = {};
	var msg = "error";
	var configSetup = {
		to: "to",
		from: "from",
		title: "title",
		text: "text"
	};

	result.configure = function configure(myconfig) {
		configSetup.to = myconfig.to || "to";
		configSetup.from = myconfig.from || "from";
		configSetup.title = myconfig.title || "title";
		configSetup.text = myconfig.text || "text";
	};

	result.send = function send() {
		try {
			// call my mail interface here
			msg = "Send email (stub) to: " + configSetup.to + ", from: " + configSetup.from + " body text: " + configSetup.text;
		}
		catch (e) {
			return e;
		}

		return msg;
	};

	return result;
}
