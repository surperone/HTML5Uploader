"use strict";
module.exports = function (grunt) {
	grunt.initConfig({
		uglify: {
			html5Uploader: {
				src: ['HTML5Uploader.js', 'makeThumb.js'],
				dest: 'HTML5Uploader.min.js'
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');

	grunt.registerTask('default', ['uglify:html5Uploader']);

};
