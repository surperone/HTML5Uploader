var Uploader = (function() {
	debug(navigator.userAgent);
	function Uploader(options) {
		if (!(this instanceof Uploader)) {
			return new Uploader(options);
		}
		//浏览器不支持
		if (!Uploader.isSupport()) {
			debug('浏览器不支持FormData或Ajax上传')
			throw new Error('浏览器不支持');
		}
		//合并配置
		if (isString(options)) {
			options = {trigger: options};
		}
		options || (options = {});
		var settings = {
			trigger: null,
			name: null,
			action: null,
			data: null,
			multiple: null,
			change: null,
			error: null,
			success: null,
			progress: null,
			preprocess: null,
			complete: null
		};
		if (options) {
			$.extend(settings, options);
		}
		var $trigger = $(settings.trigger);
		settings.action = settings.action || $trigger.data('action') || location.href;
		settings.name = settings.name || $trigger.attr('name') || $trigger.data('name') || 'file';
		settings.data = settings.data || parse($trigger.data('data'));
		if (settings.multiple == null) {
			settings.multiple = $trigger.prop('multiple');
		}
		//设置是否选择多图片
		$trigger.prop('multiple', !!settings.multiple);
		this.settings = settings;
		//上传队列
		this.queue = [];
		//初始化
		this.setup();
	}

	Uploader._debug = true;

	Uploader.isSupport = function() {
		return !!window.FormData;
	}
	Uploader.debug = debug;

	// initialize
	// create input, form, iframe
	Uploader.prototype.setup = function() {
		var self = this;
		var $trigger = this.getTrigger();
		$trigger.on('change', function(e) {
			var files = this.files;
			//过滤文件
			files = arrayFilter(files, function(file) {
				return file && file.name != '';
			});
			if (files.length > 0) {
				debug('已选择要上传的文件');
				// ie9 don't support FileList Object
				// http://stackoverflow.com/questions/12830058/ie8-input-type-file-get-files
				self._files = files || [{name: e.target.value}];
				var file = $trigger.val();
				if (self.settings.change) {
					self.settings.change.call(self, self._files);
				}
				else {
					self.submit();
				}
			}
		});
		return this;
	}
	Uploader.prototype.submit = function() {
		if (this._files.length < 1) {
			return this;
		}
		var settings = this.settings;
		var that = this;
		//创建上传器，加入上传队列
		$.each(this._files, function(i, file) {
			var uploadFile = new UploadFile(file, {
				data: settings.data,
				name: settings.name,
				action: settings.action
			});
			uploadFile.preprocess($.proxy(settings.preprocess, that));
			uploadFile.success($.proxy(settings.success, that));
			uploadFile.error($.proxy(settings.error, that));
			uploadFile.complete($.proxy(that._nextUpload, that));
			that.queue.push(uploadFile);
		});
		this._upload();
		return this;
	};
	Uploader.prototype._upload = function() {
		if (this.queue.length > 0 && !this.queue[0].active) {
			debug('开始上传文件(0)');
			this.queue[0].upload();
		}
	};
	Uploader.prototype._nextUpload = function() {
		if (this.queueCount() == 0) {
			debug('全部文件上传完毕');
			this.queue = [];
			this.getTrigger().val('');
			if (this.settings.complete) {
				this.settings.complete.call(this);
			}
		}
		else {
			var next = this.queueTotal() - this.queueCount();
			debug('开始上传文件(' + next + ')');
			this.queue[next].upload();
		}
	};
	Uploader.prototype.queueCount = function() {
		var queue = arrayFilter(this.queue, function(upload) {
			return !upload.state;
		});
		return queue.length;
	};
	Uploader.prototype.queueTotal = function() {
		return this.queue.length;
	};
	//触发的input file元素
	Uploader.prototype.getTrigger = function() {
		return $(this.settings.trigger);
	};
	// enable
	Uploader.prototype.enable = function() {
		this.getTrigger().prop('disabled', false);
		this.getTrigger().triggerHandler('enable');
		return this;
	};
	// disable
	Uploader.prototype.disable = function() {
		this.getTrigger().prop('disabled', true);
		this.getTrigger().triggerHandler('disable');
		return this;
	};
	Uploader.prototype.abort = function() {
		if (this.queue.length > 0) {
			$.each(this.queue, function(upload) {
				upload.abort();
			});
			this.getTrigger().triggerHandler('abort');
		}
		return this;
	};
	Uploader.prototype.on = function(event, callback) {
		this.getTrigger().on(event + '.uploader', $.proxy(callback, this));
		return this;
	};
	Uploader.prototype.off = function(event) {
		if (event == undefined) {
			event = '';
		}
		this.getTrigger().off(event + '.uploader');
		return this;
	};
	Uploader.prototype.once = function(event, callback) {
		this.getTrigger().one(event + '.uploader', $.proxy(callback, this));
		return this;
	};

	//文件上传类
	function UploadFile(file, settings) {
		this.file = file;
		this.active = false;
		this.state = 0;
		this.settings = settings;
	}

	UploadFile.prototype.upload = function() {
		this.active = true;
		if (this.settings.preprocess) {
			debug('调用上传预处理器');
			var self = this;
			//接口兼容性处理，该接口在旧版本中是传递FileList作为参数
			var file = [this.file];
			this.settings.preprocess(file, function(file) {
				debug('处理完成，开始上传');
				if (file instanceof Array) {
					file = file[0];
				}
				self._upload(file);
			});
		}
		else {
			this._upload(this.file);
		}
	};

	UploadFile.prototype._upload = function(file) {
		var self = this;
		// build a FormData
		var form = new FormData();
		var params = this.settings.data;
		params = $.isFunction(params) ? params.call(null, file) : params;
		$.each(params || {}, function(name, value) {
			form.append(name, value);
		});
		form.append(this.settings.name, file);
		//回调
		var success = this.settings.success || function() {};
		var error = this.settings.error || function() {};
		var complete = this.settings.complete || function() {};
		var progress = this.settings.progress || function() {};

		//进度
		var powerXhr = function() {
			var xhr = new XMLHttpRequest();
			var ua = navigator.userAgent.toLowerCase();
			var isWechat = typeof WeixinJSBridge != 'undefined' || ua.indexOf('micromessenger') != -1;
			var isIos = ua.indexOf('ios') != -1 || ua.indexOf('iphone') != -1 || ua.indexOf('ipad') != -1;

			var support = xhr.upload && 'onprogress' in xhr.upload && (!isWechat || isIos);

			var onProgress = function(event) {
				var percent = 0;
				var position = event.loaded || event.position || 0;
				/*event.position is deprecated*/
				var total = event.total;
				if (event.lengthComputable) {
					percent = Math.ceil(position/total*100);
				}
				debug('上传进度：' + percent + '%');
				progress(event, percent, position, total, file);
			};

			if (support) {
				xhr.upload.addEventListener('progress', onProgress, false);
			}
			else {
				debug('浏览器不支持上传进度，使用模拟进度');
				//不支持xhr.upload的上传进度事件
				var timer, process = 0;
				xhr.addEventListener('loadstart', function() {
					timer = setInterval(function() {
						if (process >= 82) {
							timer && clearInterval(timer);
						}
						else {
							process+=3;
							//do something
							debug('上传进度：' + process + '%');
							progress(event, process, 0, 0, file);
						}
					},500);

					progress(event, 0, 0, null, file);
				}, false);
				xhr.onload = function(){
					timer && clearInterval(timer);
					progress(event, 100, 0, null, file);
					process = 0;
				}
			}

			return xhr;
		};

		//默认执行一次上传进度

		//执行请求
		this.ajax = $.ajax({
			url: this.settings.action,
			type: 'post',
			dataType: 'json',
			processData: false,
			contentType: false,
			data: form,
			xhr: powerXhr,
			context: this,
			success: function() {
				debug('文件上传成功！');
				success.apply(null, arguments);
			},
			error: function(xhr, errorText) {
				debug('文件上传失败！');
				if (errorText != 'abort') {
					error.apply(null, arguments);
				}
			},
			complete: function() {
				self.state = 1;
				complete.apply(null, arguments);
			}
		});
	};

	UploadFile.prototype.abort = function() {
		this.ajax && this.ajax.abort();
	};

	UploadFile.prototype.preprocess = function(callback) {
		this.settings.preprocess = callback;
	};

	UploadFile.prototype.success = function(callback) {
		this.settings.success = callback;
	};

	UploadFile.prototype.error = function(callback) {
		this.settings.error = callback;
	};

	UploadFile.prototype.complete = function(callback) {
		this.settings.complete = callback;
	};

	// Helpers
	// -------------
	function isString(val) {
		return Object.prototype.toString.call(val) === '[object String]';
	}

	function arrayFilter(list, callback) {
		list = toArray(list);
		var _list = [];
		$.each(list, function(i, value) {
			if (callback(value, i, list)) {
				_list.push(value);
			}
		});
		return _list;
	}

	function toArray(list) {
		return list ? Array.prototype.slice.call(list) : [];
	}

	function parse(str) {
		if (!str) {
			return {};
		}
		var ret = {};
		var pairs = str.split('&');
		var unescape = function(s) {
			return decodeURIComponent(s.replace(/\+/g, ' '));
		};
		for (var i = 0; i < pairs.length; i++) {
			var pair = pairs[i].split('=');
			var key = unescape(pair[0]);
			ret[key] = unescape(pair[1]);
		}
		return ret;
	}

	function debug(msg) {
		if (!Uploader._debug) {
			return;
		}
		if (typeof msg == 'object' && msg != null && window.JSON) {
			msg = JSON.stringify(msg);
		}
		window.console && console.debug('[HTML5Uploader]:' + msg);
	}

	return Uploader;
})();
