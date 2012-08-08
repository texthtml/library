"use strict";


function EPUB($blob) {
	return Object.create(EPUB.prototype, {blob: {value: $blob}});
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
		if($n === undefined) {
			$n = 0;
		}
		return function() {
			var 
				$args = Array.prototype.slice.call(arguments), 
				$callback;
			
			if($n !== false) {
				$callback = $args.splice($n, 1).pop();
			}
			if($callback === undefined) {
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
		files: function() {
			if(this.$files === undefined) {
				var $unzipper = new JSUnzip(this.blob);
				
				if ($unzipper.isZipFile()) {
					$unzipper.readEntries();
					
					var $files = {};
					var set_file = function($path, $file, $relroot, $relpath) {
						if($relpath === undefined) {
							$relpath = $path;
						}
						if($relroot === undefined) {
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
							if($relroot[$base] === undefined) {
								$relroot[$base] = {};
							}
							if($end !== '') {
								set_file($path, $file, $relroot[$base], $end);
							}
						}
					}
					
					$unzipper.entries.forEach(function($entry) {
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
			if($relpath === undefined) {
				$relpath = $path;
			}
			if($relroot === undefined) {
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
			if($media_type !== undefined) {
				$selector += '[media-type="'+$media_type+'"]';
			}
			
			return this.container().querySelectorAll($selector);
		}, 
		
		rootfile_path: function($media_type, $n) {
			if($n === undefined) {
				$n = 0;
			}
			return this.rootfiles($media_type)[$n].getAttribute('full-path');
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
			if(this.$content === undefined) {
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
			if(this.$doc === undefined) {
				this.$doc = EPUB.tools.parseXMLfile(this.$file, true);
			}
			
			return this.$doc;
		}, 
		
		$: function($selector) {
			window.$d = this.doc();
			debugger;
			console.warn('deprecated');
			$selector = $selector.replace(/.*:/, '');
			return this.doc().querySelectorAll($selector);
		}, 
		
		$One: function($selector) {
			$selector = $selector.replace(/.*:/, '');
			return this.doc().querySelector($selector);
		}, 
		
		$All: function($selector) {
			$selector = $selector.replace(/.*:/, '');
			return this.doc().querySelectorAll($selector);
		}, 
		
		version: function() {
			return this.$One('package').getAttribute('version');
		}, 
		
		item: function($id) {
			var $item = this.$One('manifest [id='+$id+']');
			return new EPUB.Item($item, this);
		}, 
		
		item_by_href: function($href) {
			var $item = this.$One('manifest item[href="'+$href+'"]');
			return this.item($item.getAttribute('id'));
		}, 
		
		items: function($media_type) {
			return this.$All('manifest item[media-type="'+$media_type+'"]');
		}, 
		
		toc: function() {
			var $toc = this.$One('spine').getAttribute('toc');
			if($toc !== undefined) {
				$toc = this.item($toc);
			}
			
			return $toc;
		}, 
		
		spine: function($spine) {
			if($spine === undefined) {
				$spine = 0;
			}
			
			if(typeof $spine === 'number') {
				return this.item(
					Array.prototype.filter.call(this.$All('spine itemref'), function($el) {
						return $el.getAttribute('linear') !== 'no';
					})[$spine].getAttribute('idref')
				);
			}
			
			return this.item_by_href($spine);
		}, 
	};
	
	
	/*
	 * @return the trimmed text of the first node of a list of nodes (or undefined if the list is empty)
	 * $nodes nodes list
	 */
	var firstNodeText = function($nodes) {
		if($nodes.length === 0) {
			return undefined;
		}
		return {value: $nodes[0].textContent.trim(), ns: 'dc'};
	};
	
	/*
	 * @return an array of trimmed text of a list of nodes
	 * $nodes nodes list
	 */
	var nodesText = function($nodes) {
		return Array.prototype.map.call($nodes, function($node) {
			return  {value: $node.textContent.trim(), ns: 'dc'};
		});
	};
	
	var $metadata = {
		identifier:  [firstNodeText, 1, function($id) {
			if($id === undefined) {
				$id = this.$One('package').getAttribute('unique-identifier');
			}
			
			return this.$All('metadata dc:identifier[id='+$id+']');
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
			if($f === undefined) {
				$f = function() {
					return this.$All('metadata dc:'+$name);
				}
			}
			
			return EPUB.tools.callback($f, $default_callback, $n);
		}) ($val, $default_callback, $n, $f);
	}
	
	prototype.metadata = function($key) {
		if(this.$metadata === undefined) {
			this.$metadata = {};
			Array.prototype.filter.call(this.$All('metadata meta'), function($el) {
				return true;
			}).forEach(function($meta) {
				this.$metadata[$meta.getAttribute('name')] = {value: $meta.getAttribute('content')};
			}, this);
			
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
		
		if($key === undefined) {
			return this.$metadata;
		}
		
		if(this.$metadata[$key] !== undefined) {
			return this.$metadata[$key];
		}
		
		return {value: ''};
	};
	
	return prototype;
} ());


EPUB.Item.prototype = (function() {
	var $media_type_callback = {
		'application/xhtml+xml':    function() {
			return EPUB.tools.decode_utf8(this.$content);
		}, 
		'application/x-dtbncx+xml': function() {
			return EPUB.tools.decode_utf8(this.$content);
		}, 
		'text/css':                 function() {
			return this.$content.replace(/url\((.*?)\)/gi, function($_, $url) {
				if (!/^data/i.test($url)) {
					var $item = this.$rootfile.item_by_href($url);
					return "url(" + $item.dataUri + ")";
				}
			}.bind(this));
		}
	};
	return {
		file: function() {
			if(this.$file === undefined) {
				var $path = this.$rootfile.$file.$dir+'/'+this.$item.getAttribute('href');
				this.$file = this.$epub.file($path, false);
			}
			return this.$file;
		}, 
		
		media_type: function() {
			return this.$item.getAttribute('media-type');
		}, 
		
		content: function() {
			if(this.$content === undefined) {
				this.$content = this.file().content();
				var 
					$media_type = this.media_type(), 
					$callback = $media_type_callback[$media_type];
				
				if($callback !== undefined) {
					this.$content = $callback.call(this);
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
					Array.prototype.forEach.call(this.$doc.querySelectorAll('img'), function($img) {
						var $src = $img.getAttribute('src');
						if(!/^data/.test($src)) {
							var 
								$img_item = this.$rootfile.item_by_href($src), 
								$data = escape($img_item.content());
							
							$img.setAttribute('src', $img_item.dataURI());
						}
					}, this);
					
					Array.prototype.forEach.call(this.$doc.querySelectorAll('image'), function($img) {
						var $src = $img.getAttribute('xlink:href');
						if(!/^data/.test($src)) {
							var 
								$img_item = this.$rootfile.item_by_href($src), 
								$data = escape($img_item.content());
							
							$img.setAttribute('xlink:href', $img_item.dataURI());
						}
					}, this);
					
					Array.prototype.forEach.call(this.$doc.querySelectorAll('link[rel=stylesheet]'), function($link) {
						var 
							$style = document.createElement('style'), 
							$href = $link.getAttribute('href'), 
							$link_item = this.$rootfile.item_by_href($href);
						
						$style.textContent = $link_item.content();
						
						$link.parentNode.insertBefore($style, $link);
						$link.parentNode.removeChild($link);
					}, this);
				}
			}
			
			return this.$doc;
		}, 
		
		href: function() {
			return this.$item.getAttribute('href');
		}, 
		
		html: function() {
			if(this.$html === undefined) {
				this.$html = new XMLSerializer().serializeToString(this.doc());
			}
			
			return this.$html;
		}, 
		
		itemref: function() {
			return this.$rootfile.$One('itemref[idref="'+this.$item.getAttribute('id')+'"]');
		}, 
		
		next: function() {
			var 
				$next = this.itemref().nextElementSibling, 
				$id = $next === null ? undefined : $next.getAttribute('idref');
			if($id  !== undefined) {
				return this.$rootfile.$One('[id='+$id+']').getAttribute('href');
			}
		}, 
		
		prev: function() {
			var 
				$prev = this.itemref().previousElementSibling, 
				$id = $next === null ? undefined : $prev.getAttribute('idref');
			if($id !== undefined) {
				return this.$rootfile.$One('#'+$id).attr('href');
			}
		}
	};
} ());

WR.register('application/epub+zip', EPUB, 'epub');
