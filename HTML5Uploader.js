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
			preprocess: null
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
			var success = function(files) {
				self._upload(files);
			};
			var error = function() {
				self._upload(self._files);
			};
			this.settings.preprocess.call(this, self._files, success, error);
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

		//进度
		var optionXhr;
		if (self.settings.progress) {
			// fix the progress target file
			optionXhr = function() {
				var xhr = $.ajaxSettings.xhr();
				if (xhr.upload) {
					xhr.upload.addEventListener('progress', function(event) {
						var percent = 0;
						var position = event.loaded || event.position;
						/*event.position is deprecated*/
						var total = event.total;
						if (event.lengthComputable) {
							percent = Math.ceil(position/total*100);
						}
						self.settings.progress.call(self, event, position, total, percent, files);
					}, false);
				}
				return xhr;
			};
		}

		//回调
		var success = this.settings.success || noop;
		var error = this.settings.error || noop;
		//执行请求
		$.ajax({
			url: this.settings.action,
			type: 'post',
			dataType: 'json',
			processData: false,
			contentType: false,
			data: form,
			xhr: optionXhr,
			context: this,
			success: success.bind(this),
			error: error.bind(this)
		});
		return this;
	};
	Uploader.prototype.setData = function(name, value) {
		if (!this.settings.data) {
			this.settings.data = {};
		}
		this.settings.data[name] = value;
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
	// enable
	Uploader.prototype.enable = function() {
		this.getTrigger().prop('disabled', false);
	};
	// disable
	Uploader.prototype.disable = function() {
		this.getTrigger().prop('disabled', true);
	};

	// Helpers
	// -------------
	function isString(val) {
		return Object.prototype.toString.call(val) === '[object String]';
	}

	function noop() {

	};

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

	//Interface
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
	MultipleUploader.prototype.submit = function() {
		$.each(this._uploaders, function(i, item) {
			item.submit();
		});
		return this;
	};
	MultipleUploader.prototype.change = function(callback) {
		$.each(this._uploaders, function(i, item) {
			item.change(callback);
		});
		return this;
	};
	MultipleUploader.prototype.success = function(callback) {
		$.each(this._uploaders, function(i, item) {
			item.success(callback);
		});
		return this;
	};
	MultipleUploader.prototype.error = function(callback) {
		$.each(this._uploaders, function(i, item) {
			item.error(callback);
		});
		return this;
	};
	MultipleUploader.prototype.progress = function(callback) {
		$.each(this._uploaders, function(i, item) {
			item.progress(callback);
		});
		return this;
	};
	MultipleUploader.prototype.preprocess = function(callback) {
		$.each(this._uploaders, function(i, item) {
			item.preprocess(callback);
		});
		return this;
	};
	MultipleUploader.prototype.enable = function() {
		$.each(this._uploaders, function(i, item) {
			item.enable();
		});
		return this;
	};
	MultipleUploader.prototype.disable = function() {
		$.each(this._uploaders, function(i, item) {
			item.disable();
		});
		return this;
	};
	MultipleUploader.isSupport = function() {
		return !!window.FormData;
	};
	MultipleUploader.Uploader = Uploader;
	return MultipleUploader;
})();


