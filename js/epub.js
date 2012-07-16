"use strict";


function EPUB($blob) {
	this.$blob = $blob;
}

EPUB.File = function($epub, $entry) {
	this.$epub = $epub;
	this.$entry = $entry;
	this.$path = $entry.fileName;
	
	this.$dir = this.$path.split('/');
	this.$dir.pop();
	this.$dir = this.$dir.join('/')
}

EPUB.RootFile = function($file) {
	this.$epub = $file.$epub;
	this.$file = $file;
}

EPUB.Item = function($item, $rootfile) {
	this.$epub = $rootfile.$epub;
	this.$item = $item;
	this.$rootfile = $rootfile;
}

EPUB.tools = {
	
	/*
	 * @return its only arguments
	 */
	identity: function($x) {
		return $x;
	}, 
	
	/*
	 * @return a Document from an XML string
	 * @arg $xml XML string to parse
	 */
	parseXML: function ($xml, $decodeUTF8) {
		if($decodeUTF8 === true) {
			$xml = EPUB.tools.decode_utf8($xml);
		}
		var $doc = new DOMParser().parseFromString($xml, "text/xml");
		
		if($doc.childNodes[1] && $doc.childNodes[1].nodeName === "parsererror") {
			throw $doc.childNodes[1].childNodes[0].nodeValue;
		}
		
		return $doc;
	}, 
	
	/*
	 * @return a Document from a file content
	 * @arg $file file to parse
	 */
	parseXMLfile: function($file, $decodeUTF8) {
		return EPUB.tools.parseXML($file.content(), $decodeUTF8);
	}, 
	
	/*
	 * @return a function witch call $function and pass its result to a callback
	 * @arg $function function to call
	 * @arg $n position of the callback argument in the created function (false means no callback argument), defaults to 0
	 * @arg $default_callback callback to use if $n === false or callback argument is undefined
	 */
	callback: function($function, $default_callback, $n) {
		if(typeof $n === 'undefined') {
			$n = 0;
		}
		return function() {
			var 
				$args = Array.prototype.slice.call(arguments), 
				$callback;
			
			if($n !== false) {
				$callback = $args.splice($n, 1).pop();
			}
			if(typeof $callback === 'undefined') {
				$callback = $default_callback;
			}
			else if($callback === false) {
				$callback = EPUB.tools.identity;
			}
			
			return $callback($function.apply(this, $args));
		}
	}, 
	
	decode_utf8: function(s) {
		return decodeURIComponent(escape(s));
	} 
}

EPUB.prototype = (function() {
	return {
		blob: function() {
			return this.$blob;
		}, 
		
		files: function() {
			if(typeof this.$files === 'undefined') {
				var $unzipper = new JSUnzip(this.blob());
				
				if ($unzipper.isZipFile()) {
					$unzipper.readEntries();
					
					var $files = {};
					var set_file = function($path, $file, $relroot, $relpath) {
						if(typeof $relpath === 'undefined') {
							$relpath = $path;
						}
						if(typeof $relroot === 'undefined') {
							$relroot = $files;
						}
						var 
							$segments = $relpath.split("/"), 
							$base = $segments.shift(), 
							$end = $segments.join('/');
						
						if($segments.length === 0) {
							$relroot[$base] = $file;
						}
						else {
							if(typeof $relroot[$base] === 'undefined') {
								$relroot[$base] = {};
							}
							if($end !== '') {
								set_file($path, $file, $relroot[$base], $end);
							}
						}
					}
					
					$($unzipper.entries).each(function($i, $entry) {
						set_file(
							$entry.fileName, 
							new EPUB.File(this, $entry)
						);
					}.bind(this));
				}
				
				this.$files = $files;
			}
			
			return this.$files;
		},
		
		_file: function($path, $relroot, $relpath) {
			if(typeof $relpath === 'undefined') {
				$relpath = $path;
			}
			if(typeof $relroot === 'undefined') {
				$relroot = this.files();
			}
			var 
				$segments = $relpath.split("/"), 
				$base = $segments.shift(), 
				$end = $segments.join('/');
			
			if($segments.length === 0) {
				return $relroot[$base];
			}
			else {
				return this._file($path, $relroot[$base], $end);
			}
		},
		
		file: EPUB.tools.callback(
			function($path) {
				return this._file($path);
			}, 
			function ($file) {
				return $file.content();
			}, 1
		), 
		
		mimetype: function() {
			return this.file('mimetype');
		}, 
		
		metainf: function() {
			return this.file('META-INF', false);
		}, 
		
		container: function() {
			return this.file('META-INF/container.xml', EPUB.tools.parseXMLfile);
		}, 
		
		rootfiles: function($media_type) {
			var $selector = 'rootfile';
			if(typeof $media_type !== 'undefined') {
				$selector += '[media-type="'+$media_type+'"]';
			}
			return $($selector, this.container());
		}, 
		
		rootfile_path: function($media_type, $n) {
			if(typeof $n === 'undefined') {
				$n = 0;
			}
			return $(this.rootfiles($media_type).get($n)).attr('full-path');
		}, 
		
		rootfile: function($media_type, $n) {
			var $path = this.rootfile_path($media_type, $n);
			return new EPUB.RootFile(this.file($path, false));
		}, 
		
		identifier: function($media_type, $n) {
			return this.rootfile($media_type, $n).identifier();
		}, 
		
		title: function($media_type, $n) {
			return this.rootfile($media_type, $n).title();
		}, 
		
		language: function($media_type, $n) {
			return this.rootfile($media_type, $n).language();
		}, 
		
		metadata: function($name, $media_type, $n) {
			return this.rootfile($media_type, $n).metadata($name);
		}, 
		
		toc: function($media_type, $n) {
			return this.rootfile($media_type, $n).toc(false);
		}, 
		
		page: function($href, $media_type, $n) {
			return this.rootfile($media_type, $n).spine($href);
		}
	}
} ());


EPUB.File.prototype = (function() {
	return {
		content: function() {
			if(typeof this.$content === 'undefined') {
				this.$content = this.$entry.data;
				
				if(this.$entry.compressionMethod === 8) {
					this.$content = JSInflate.inflate(this.$content);
				}
				else if (this.$entry.compressionMethod !== 0){
					throw 'cannot uncompress '+this.$entry.fileName+' compressed with method '+this.$entry.compressionMethod;
				}
			}
			
			return this.$content;
		}
	};
} ());


EPUB.RootFile.prototype = (function() {
	var prototype = {
		doc: function() {
			if(typeof this.$doc === 'undefined') {
				this.$doc = EPUB.tools.parseXMLfile(this.$file, true);
			}
			
			return this.$doc;
		}, 
		
		$: function($selector) {
			return $($selector.replace(':', '\\\\\\:'), this.doc())
		}, 
		
		version: function() {
			return this.$('package').attr('version');
		}, 
		
		item: function($id) {
			var $item = $(this.$('manifest #'+$id));
			return new EPUB.Item($item, this);
		}, 
		
		item_by_href: function($href) {
			var $item = this.$('manifest item[href="'+$href+'"]');
			return this.item($($item).attr('id'));
		}, 
		
		items: function($media_type) {
			return this.$('manifest item[media-type="'+$media_type+'"]');
		}, 
		
		toc: function() {
			var $toc = this.$('spine').attr('toc');
			if(typeof $toc !== 'undefined') {
				$toc = this.item($toc);
			}
			
			return $toc;
		}, 
		
		spine: function($spine) {
			if(typeof $spine === 'undefined') {
				$spine = 0;
			}
			
			if(typeof $spine === 'number') {
				return this.item($(this.$('spine itemref').filter(':not([linear=no])').get($spine)).attr('idref'));
			}
			
			return this.item_by_href($spine);
		}, 
	};
	
	
	/*
	 * @return the trimmed text of the first node of a list of nodes (or undefined if the list is empty)
	 * $nodes nodes list
	 */
	var firstNodeText = function($nodes) {
		var $node = $nodes.get(0)
		if(typeof $node === 'undefined') {
			return $node;
		}
		return {value: $($nodes).text().trim(), ns: 'dc'};
	};
	
	/*
	 * @return an array of trimmed text of a list of nodes
	 * $nodes nodes list
	 */
	var nodesText = function($nodes) {
		return $nodes.map(function($i, $node) {
			return  {value: $($node).text().trim(), ns: 'dc'};
		}).toArray();
	};
	
	var $metadata = {
		identifier:  [firstNodeText, 1, function($id) {
			if(typeof $id === 'undefined') {
				$id = this.$('package').attr('unique-identifier');
			}
			
			return this.$('metadata dc:identifier').filter('#'+$id);
		}], 
		title:       [firstNodeText], 
		language:    [firstNodeText], 
		
		// optionnal
		contributor: [nodesText], 
		coverage:    [nodesText], 
		creator:     [nodesText], 
		date:        [firstNodeText], 
		description: [nodesText], 
		format:      [nodesText], 
		publisher:   [nodesText], 
		relation:    [nodesText], 
		rights:      [nodesText], 
		source:      [firstNodeText], 
		subject:     [nodesText], 
		type:        [firstNodeText], 
	};
	
	for(var $val in $metadata) {
		var 
			$default_callback = $metadata[$val][0],
			$n                = $metadata[$val][1],
			$f                = $metadata[$val][2];
		prototype[$val] = (function($name, $default_callback, $n, $f) {
			if(typeof $f === 'undefined') {
				$f = function() {
					return this.$('metadata dc:'+$name);
				}
			}
			
			return EPUB.tools.callback($f, $default_callback, $n);
		}) ($val, $default_callback, $n, $f);
	}
	
	prototype.metadata = function($key) {
		if(typeof this.$metadata === 'undefined') {
			this.$metadata = {};
			this.$('metadata meta').filter(':not([refines])').each(function($i, $meta) {
				this.$metadata[$($meta).attr('name')] = {value: $($meta).attr('content')};
			}.bind(this));
			
			for(var $nsname in this.$metadata) {
				var $name = $nsname.match(/([^:]+):(.*)/);
				if($name !== null) {
					var $ns = $name[1];
					$name = $name[2];
					
					this.$metadata[$name] = this.$metadata[$nsname];
					this.$metadata[$name].ns = $ns;
					delete this.$metadata[$nsname];
				}
			}
			
			for(var $name in $metadata) {
				this.$metadata[$name] = this[$name]();
			}
		}
		
		if(typeof $key === 'undefined') {
			return this.$metadata;
		}
		
		if(typeof this.$metadata[$key] !== 'undefined') {
			return this.$metadata[$key];
		}
		
		return {value: ''};
	};
	
	return prototype;
} ());


EPUB.Item.prototype = (function() {
	var $media_type_callback = {
		'application/xhtml+xml':    EPUB.tools.decode_utf8, 
		'application/x-dtbncx+xml': EPUB.tools.decode_utf8
	};
	return {
		file: function() {
			if(typeof this.$file === 'undefined') {
				var $path = this.$rootfile.$file.$dir+'/'+this.$item.attr('href');
				this.$file = this.$epub.file($path, false);
			}
			return this.$file;
		}, 
		
		media_type: function() {
			return this.$item.attr('media-type');
		}, 
		
		content: function() {
			if(typeof this.$content === 'undefined') {
				this.$content = this.file().content();
				var 
					$media_type = this.media_type(), 
					$callback = $media_type_callback[$media_type];
				
				if(typeof $callback !== 'undefined') {

					this.$content = $callback(this.$content);
				}

				if($media_type === 'text/css') {
					this.$content = this.$content.replace(/url\((.*?)\)/gi, function($_, $url) {
						console.log('css', $url);
						if (!/^data/i.test($url)) {
							var $item = this.$rootfile.item_by_href($url);
							return "url(" + $item.dataUri + ")";
						}
					}.bind(this));
				}
			}
			return this.$content;
		}, 
		
		dataURI: function() {
			return 'data:' + this.media_type( ) +',' + escape(this.content());
		}, 
		
		doc: function() {
			if(typeof this.$doc) {
				this.$doc = EPUB.tools.parseXML(this.content());
				
				var $media_type = this.media_type();
				
				if($media_type === 'application/xhtml+xml') {
					
					$('img', this.$doc).each(function($i, $img) {
						var $src = $($img).attr('src');
						if(!/^data/.test($src)) {
							var 
								$img_item = this.$rootfile.item_by_href($src), 
								$data = escape($img_item.content());
							
							$($img).attr('src', $img_item.dataURI());
						}
					}.bind(this));
					
					$('image', this.$doc).each(function($i, $img) {
						var $src = $($img).attr('xlink:href');
						if(!/^data/.test($src)) {
							var 
								$img_item = this.$rootfile.item_by_href($src), 
								$data = escape($img_item.content());
							
							$($img).attr('xlink:href', $img_item.dataURI());
						}
					}.bind(this));
					
					$('link[rel=stylesheet]', this.$doc).each(function($i, $link) {
						var 
							$style = $('<style scoped="scoped"/>'), 
							$href = $($link).attr('href'), 
							$link_item = this.$rootfile.item_by_href($href);
						
						$style.text($link_item.content());
						
						$($link).replaceWith($style);
					}.bind(this));
				}
			}
			
			return this.$doc;
		}, 
		
		href: function() {
			return $(this.$item).attr('href');
		}, 
		
		html: function() {
			if(typeof this.$html === 'undefined') {
				this.$html = new XMLSerializer().serializeToString(this.doc());
			}
			
			return this.$html;
		}, 
		
		itemref: function() {
			return this.$rootfile.$('itemref[idref="'+$(this.$item).attr('id')+'"]');
		}, 
		
		next: function() {
			var $id = $(this.itemref()).next().attr('idref');
			if(typeof $id !== 'undefined') {
				return this.$rootfile.$('#'+$id).attr('href');
			}
		}, 
		
		prev: function() {
			var $id = $(this.itemref()).prev().attr('idref');
			if(typeof $id !== 'undefined') {
				return this.$rootfile.$('#'+$id).attr('href');
			}
		}
	};
} ());

WR.register('application/epub+zip', EPUB, 'epub');
