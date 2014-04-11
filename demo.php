<!doctype html>
<html lang="zh-cn">
<head>
	<meta charset="UTF-8">
	<script type="text/javascript" src="/jquery.min.js"></script>
	<script type="text/javascript" src="/HTML5Uploader.js"></script>
	<script type="text/javascript" src="/makeThumb.js"></script>
	<title>HTML5Uploader.js</title>
</head>
<body>
<input type="file" name="file" id="file" />
<?php
require_once("./qiniu/http.php");
require_once("./qiniu/io.php");
require_once("./qiniu/rs.php");

$accessKey = '_j1zpW84suEITz3sWTmXBZSXfWf33UJ4Wb2vUepP';
$secretKey = 'tSwQjgPwNU9vk5oCgXGXrvFbyz1E0Vljbe3wkcz4';
Qiniu_setKeys($accessKey, $secretKey);
$putPolicy = new Qiniu_RS_PutPolicy('atuploadtest');
$token = $putPolicy->Token(null);
?>
<script type="text/javascript">
	var uploader = new Uploader({
		trigger: '#file',
		name: 'file',
		action: 'http://up.qiniu.com',
		preprocess: function(files, success, error) {
			makeThumb(files[0], {
				fill: true,
				background: '#fff',
				type: 'image/jpeg',
				size: 'cover',
				stretch: true,
				width: 300,
				height: 300,
				success: function(dataURI) {
					var blob = dataURItoBlob(dataURI);
					success([blob]);
				},
				error: error
			});
		},
		data: function() {
			return {
				token: '<?= $token; ?>',
				key: 'demo/' + Date.now()
			};
		},
		success: function(data) {
			
		}
	});
</script>
</body>
</html>
