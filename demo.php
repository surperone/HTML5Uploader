<!doctype html>
<html lang="zh-cn">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0">
	<script type="text/javascript" src="./jquery.min.js"></script>
	<script type="text/javascript" src="./HTML5Uploader.js?<?= time(); ?>"></script>
	<script type="text/javascript" src="./makeThumb.js?<?= time(); ?>"></script>
	<title>HTML5Uploader.js</title>
</head>
<body>
<?php
require_once("./qiniu/http.php");
require_once("./qiniu/io.php");
require_once("./qiniu/rs.php");

$accessKey = 'jZpEEbK-tElCcE5Z7ANp-IaSSljrsq5AklVV3OhS';
$secretKey = 'jFB_4zvsHS7_mAglI511QzD6FlN0AQ25qodI1V-o';
Qiniu_setKeys($accessKey, $secretKey);
$putPolicy = new Qiniu_RS_PutPolicy('pbwci');
$putPolicy->Expires = 60 * 30;
$putPolicy->SaveKey = 'test/$(etag)';
$putPolicy->MimeLimit = 'image/*';
$token = $putPolicy->Token(null);
?>

<input type="file" name="file" id="file" accept="image/*" />
<input type="hidden" name="url" id="url" accept="image/*" multiple />

<div id="progress">进度：<span></span></div>
<div id="img"></div>
<script type="text/javascript">
	var uploader = new Uploader({
		trigger: '#file',
		action: 'http://up.qiniu.com',
		data: {
			token: '<?= $token; ?>'
		},
		change: function() {
			this.submit();
			this.abort();
		},
		progress: function(e, rate) {
			$('#progress span').text(rate+'%');
		},
		success: function(data) {
			var url = 'http://pbwci.qiniudn.com/'+data.key;
			$('#url').val(url);
			$('#img').html('<img style="max-width: 100%;" src="'+url+'" />');
		},
		error: function() {
			console.dir(arguments);
		}
	});
</script>
</body>
</html>
