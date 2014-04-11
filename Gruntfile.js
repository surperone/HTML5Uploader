"use strict";
module.exports = function (grunt) {

	grunt.initConfig({
		uglify: {
			html5Uploader: {
				src: 'html5Uploader.js',
				dest: 'html5Uploader.min.js'
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('default', ['uglify:html5Uploader']);

};
