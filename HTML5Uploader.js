var Uploader = (function() {
	function Uploader(options) {
		if (!(this instanceof Uploader)) {
			return new Uploader(options);
		}
		//不支持
		if (!window.FormData) {
			throw new Error('浏览器不支持');
		}

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

		this.settings = settings;

		this.setup();
	}

	// initialize
	// create input, form, iframe
	Uploader.prototype.setup = function() {
		var self = this;
		var $trigger = this.getTrigger();
		$trigger.on('change', function(e) {
			var files = this.files;
			if (files && files.length > 0 && files[0].name != '') {
				// ie9 don't support FileList Object
				// http://stackoverflow.com/questions/12830058/ie8-input-type-file-get-files
				self._files = this.files || [{name: e.target.value}];
				var file = $trigger.val();
				if (self.settings.change) {
					self.settings.change.call(self, self._files);
				}
				else if (file) {
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
		else if (this.settings.preprocess) {
			var self = this;
			this.settings.preprocess.call(this, self._files, function(files) {
				self._upload(files);
			});
		}
		else {
			this._upload(this._files);
		}
		return this;
	};
	//上传
	Uploader.prototype._upload = function(files) {
		var self = this;
		// build a FormData
		var form = new FormData();
		var params = this.settings.data;
		params = $.isFunction(params) ? params.call(this, files) : params;
		$.each(params || {}, function(name, value) {
			form.append(name, value);
		});
		if (this.settings.multiple) {
			$.each(files, function(i, file) {
				var name = self.settings.name + '[' + i + ']';
				form.append(name, file);
			});
		}
		else {
			form.append(this.settings.name, files[0]);
		}

		//回调
		var success = this.settings.success || function() {};
		var error = this.settings.error || function() {};
		var complete = this.settings.complete || function() {};
		var progress = this.settings.progress || function() {};

		//进度
		var powerXhr = function() {
			var xhr = new XMLHttpRequest();
			//不支持xhr.upload的上传进度事件
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
				progress.call(self, event, percent, position, total, files);
			};

			if (support) {
				xhr.upload.addEventListener('progress', onProgress, false);
			}
			else {
				xhr.addEventListener('progress', onProgress, false);
				xhr.addEventListener('loadstart', function() {
					progress.call(self, event, 0, 0, 0, files);
				}, false);
			}

			return xhr;
		};

		//默认执行一次上传进度

		//执行请求
		this._ajax = $.ajax({
			url: this.settings.action,
			type: 'post',
			dataType: 'json',
			processData: false,
			contentType: false,
			data: form,
			xhr: powerXhr,
			context: this,
			success: success,
			error: function(xhr, error) {
				if (error == 'abort') {
					error.apply(this, arguments);
				}
			},
			complete: function() {
				this.getTrigger().val('');
				complete.apply(this, arguments);
			}
		});
		return this;
	};
	Uploader.prototype.setData = function(name, value) {
		if (!this.settings.data) {
			this.settings.data = {};
		}
		this.settings.data[name] = value;
		return this;
	};
	//触发的input file元素
	Uploader.prototype.getTrigger = function() {
		return $(this.settings.trigger);
	};
	// handle change event
	// when value in file input changed
	Uploader.prototype.change = function(callback) {
		callback && (this.settings.change = callback);
		return this;
	};
	//上传成功回调
	Uploader.prototype.success = function(callback) {
		callback && (this.settings.success = callback);
		return this;
	};
	//错误回调
	Uploader.prototype.error = function(callback) {
		callback && (this.settings.error = callback);
		return this;
	};
	//上传进度回调
	Uploader.prototype.progress = function(callback) {
		callback && (this.settings.progress = callback);
		return this;
	};
	//预处理器
	Uploader.prototype.preprocess = function(callback) {
		callback && (this.settings.preprocess = callback);
		return this;
	};
	//完成回调
	Uploader.prototype.complete = function(callback) {
		callback && (this.settings.complete = callback);
		return this;
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
		if (this._ajax) {
			this._ajax.abort();
			this.getTrigger().triggerHandler('abort');
			this._ajax = null;
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

	// Helpers
	// -------------
	function isString(val) {
		return Object.prototype.toString.call(val) === '[object String]';
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

	//接口
	function MultipleUploader(options) {
		if (!(this instanceof MultipleUploader)) {
			return new MultipleUploader(options);
		}
		if (isString(options)) {
			options = {trigger: options};
		}
		var $trigger = $(options.trigger);
		var uploaders = [];
		$trigger.each(function(i, item) {
			options.trigger = item;
			uploaders.push(new Uploader(options));
		});
		this._uploaders = uploaders;
	}

	MultipleUploader.isSupport = function() {
		return !!window.FormData;
	};

	var methods = [
		'submit', 'change', 'success', 'error', 'complete', 'progress', 'preprocess',
		'enable', 'disable', 'abort',
		'on', 'off', 'once'
	];

	$.each(methods, function(i, method) {
		MultipleUploader.prototype[method] = function() {
			var args = arguments;
			$.each(this._uploaders, function(i, $item) {
				$item[method].apply($item, args);
			});
			return this;
		};
	});


	MultipleUploader.Uploader = Uploader;
	return MultipleUploader;

})();
