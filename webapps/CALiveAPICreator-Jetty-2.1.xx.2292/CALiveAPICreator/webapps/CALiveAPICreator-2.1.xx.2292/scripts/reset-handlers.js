$(document).ready(function () {
	//inputs
	var $submit = $('#submit');
	
	function postPasswordUpdate(data) {
		var url = window.location.href.replace("setAdminPasswords.html", "") + "rest/abl/admin/v2/@authentication?enablePasswordChange!=true";
		$('.control-label').html("");
		$.ajax({
			url: url,
			type: "POST",
			data: JSON.stringify(data),
			contentType: "application/json",
			success: function (res) {
				
	
				if (data.username == "sa") {
						$('.sa-feedback').removeClass("has-error").addClass("has-success").find('.control-label').html("Successfully updated");
				}

				if (data.username == "admin") {
						$('.admin-feedback').removeClass("has-error").addClass("has-success").find('.control-label').html("Successfully updated");
				}
			},
			"error": function (res) {
				var parsedReply = JSON.parse(res.responseText);
				if (data.username == "sa") {
					$('.sa-feedback').removeClass("has-success").addClass("has-error").find('.control-label').html(parsedReply.errorMessage);
				}
				
				if (data.username == "admin") {
					$('.admin-feedback').removeClass("has-success").addClass("has-error").find('.control-label').html(parsedReply.errorMessage);
				}
			}
		});
		
	}
	
	$submit.click(function (event) {
		event.preventDefault();
		
		var form = $('#form').serializeArray();
		var data = _.object(_.pluck(form, 'name'), _.pluck(form, 'value'));
		
		console.log(form, data);
		
		if (data.sa) {
			var saData = {
				"username": "sa",
				"password": data.saPassword,
				"new_password": data.sa
			};
			postPasswordUpdate(saData);
		}
		
		if (data.admin) {
			var adminData = {
					username: "admin",
					password: data.adminPassword,
					new_password: data.admin
				};
				postPasswordUpdate(adminData);
			}
	});
});