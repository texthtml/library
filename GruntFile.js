module.exports = function(grunt) {
	grunt.initConfig({
		requirejs: {
			compile: {
				options: {
					baseUrl: 'js/', 
					name: 'index.prod', 
					mainConfigFile: 'js/index.prod.js', 
					out: 'js/index.min.js', 
					optimize: 'uglify2'
				}
			}
		}, 
		uglify: {
			zipworker: {
				files: {
					'js/vendor/min/inflate.js': 'components/zip.js/WebContent/inflate.js'
				}
			}, 
			requirejs: {
				files: {
					'js/vendor/min/require.js': 'components/requirejs/require.js'
				}
			}, 
			modernizr: {
				files: {
					'js/vendor/min/modernizr.js': 'components/modernizr/modernizr.js'
				}
			}
		}, 
		cssjoin: {
			join: {
				files: {
					'style/index.all.css' : 'style/index.css'
				}
			}
		}, 
		cssmin: {
			compress: {
				files: {
					'style/index.min.css' : 'style/index.all.css'
				}, 
				options: {
					root: '.'
				}
			}
		}
	});
	
	grunt.loadNpmTasks('grunt-cssjoin');
	grunt.loadNpmTasks('grunt-css');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-requirejs');
	
	grunt.registerTask('index.html', function() {
		grunt.file.copy('index.html', 'index.min.html', {
			process: function(html) {
				return html
					.replace(/index.([a-z]{1,3})/g, 'index.min.$1')
					.replace(/components\/requirejs\/require.([a-z]{1,3})/g, 'js/vendor/min/require.$1')
					.replace(/components\/modernizr\/modernizr.([a-z]{1,3})/g, 'js/vendor/min/modernizr.$1');
			}
		});
	});
	
	grunt.registerTask('index.js', function() {
		grunt.file.copy('js/index.js', 'js/index.prod.js', {
			process: function(js) {
				return js
					.replace(/\?rand='\+Math\.random\(\)/, '\'')
					.replace(/(zip.workerScriptsPath.*)components\/zip\.js\/WebContent/g, '$1js/vendor/min');
			}
		});
	});
	
	grunt.registerTask('default', ['cssjoin', 'cssmin', 'index.html', 'index.js', 'uglify', 'requirejs']);
};