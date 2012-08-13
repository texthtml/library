(function($wr) {
	"use strict";
	
	var EPub = {
		spine: function($spine, $callback) {
			var 
				$fct = function($href) {
					this.file($href, function($file) {
						console.log($href, $file);
						if($file === null) {
							this.filenames(function($fn) {
								console.log($fn.indexOf($href), $fn);
							});
						}
						else {
						$file.render($callback);
					}
					}.bind(this));
				}.bind(this);
			
			if($spine === undefined) {
				$spine = 0;
			}
			
			if(typeof $spine === 'number') {
				this.itemrefs(function($itemrefs) {
					this.rootfile(function($rootfile) {
						$rootfile.one('[id="' + $itemrefs[$spine].getAttribute('idref') + '"]', function($item) {
							$fct($item.getAttribute('href'));
						});
					}.bind(this));
				}.bind(this));
			}
			else {
				$fct($spine);
			}
		}, 
		
		item: function($id) {
			this.rootfile(function($rootfile) {
				 
			}).bind(this);
		}, 
		
		itemrefs: function($callback) {
			if(this.$itemrefs === undefined) {
				this.rootfile(function($rootfile) {
					$rootfile.all('spine itemref', function($itemrefs) {
						this.$itemrefs = $itemrefs;
						$callback($itemrefs);
					}.bind(this));
				}.bind(this));
			}
			else {
				$callback(this.$itemrefs);
			}
		}, 
		
		title: function($callback) {
			this.metadata(function($titles) {
				var 
					$title = $titles.length > 0 ? $titles[0].value : null;
				
				$callback($title);
			}, 'title');
		}, 
		
		metadata: function($callback, $aliases) {
			var 
				$metadata_aliases = $aliases, 
				$metadata_names = {
						identifier   : 'identifier', 
						title        : 'title', 
						language     : 'language', 
						contributor  : 'contributor', 
						coverage     : 'coverage', 
						creator      : 'creator', 
						date         : 'date', 
						description  : 'description', 
						format       : 'format', 
						publisher    : 'publisher', 
						relation     : 'relation', 
						rights       : 'rights', 
						source       : 'source', 
						subject      : 'subject', 
						type         : 'type', 
						series_index : 'meta[name="calibre:series_index"]', 
						series       : 'meta[name="calibre:series"]' 
				};
			
			if(typeof $metadata_aliases === 'string') {
				$metadata_aliases = [$metadata_aliases];
			}
			if($metadata_aliases === undefined) {
				$metadata_aliases = [];
				for(var $alias in $metadata_names) {
					$metadata_aliases.push($alias);
				}
			}
			
			this.rootfile(function($rootfile) {
				var 
					$result = {}, 
					$fct = function() {
						if($metadata_aliases.length === 0) {
							$callback(typeof $aliases === 'string' ? $result[$aliases] : $result);
						}
						else {
							var 
								$alias = $metadata_aliases.pop(), 
								$name = $metadata_names[$alias] === undefined ? 
									$alias : 
									$metadata_names[$alias];
							
							$rootfile.all('metadata > ' + $name, function($metadata) {
								
								$result[$alias] = Array.prototype.map.call($metadata, function($metadata) {
									var 
										$value = $metadata.textContent, 
										$id    = $metadata.getAttribute('id'), 
										$lang  = $metadata.getAttribute('lang'), 
										$dir   = $metadata.getAttribute('dir');
									
									if($metadata.nodeName === 'meta' && $metadata.firstChild === null) {
										$value = $metadata.getAttribute('content');
									}
									
									return {
										value: $value, 
										id   : $id   === null ? undefined : $id, 
										lang : $lang === null ? undefined : $lang, 
										dir  : $dir  === null ? undefined : $dir
									};
								});
								
								$fct();
							});
						}
					};
				
				$fct();
			});
		}, 
		
		identifier: function($callback) {
			this.rootfile(function($rootfile) {
				$rootfile.xmldoc(function($xmldoc) {
					var 
						$unique_identifier = $xmldoc.documentElement.getAttribute('unique-identifier');
					
					$rootfile.one('identifier[id=' + $unique_identifier + ']', function($identifier) {
						var 
							$text = $identifier === null ? null : $identifier.textContent;
						$callback($text);
					});
				});
			});
		}, 
		
		version: function($callback) {
			this.rootfile(function($rootfile) {
				$rootfile.xmldoc(function($xmldoc) {
					var 
						$version = $xmldoc.documentElement.getAttribute('version');
					
					$callback($version);
				});
			});
		}, 
		
		rootfile: function($callback) {
			if(this.$rootfile === undefined) {
				this.container(function($container) {
					$container.one('container rootfiles rootfile', function($rootfile) {
						var 
							$rootfile_path = $rootfile === null ? null : $rootfile.getAttribute('full-path');
						
						this.file($rootfile_path, function($rootfile) {
							this.$rootfile = $rootfile;
							$callback(this.$rootfile);
						}.bind(this));
					}.bind(this));
				}.bind(this));
			}
			else {
				$callback(this.$rootfile);
			}
		},
		
		container: function($callback) {
			this.file('META-INF/container.xml', $callback);
		}, 
		
		file: function($name, $callback) {
			if(this.$files === undefined) {
				this.$files = {};
			}
			if(this.$files[$name] === undefined) { 
				var 
					$request = this.reader().getFile($name);
				
				$request.addEventListener('success', function($event) {
					this.$files[$name] = EPubFile_factory($event.target.result, this);
					$callback(this.$files[$name]);
				}.bind(this));
				
				$request.addEventListener('error', function($event) {
					this.$files[$name] = null;
					$callback(this.$files[$name]);
				}.bind(this));
			}
			else {
				$callback(this.$files[$name]);
			}
		}, 
		
		filenames: function($callback) {
			if(this.$filenames === undefined) {
				var 
					$request = this.reader().getFilenames();
				
				$request.addEventListener('success', function($event) {
					this.$filenames = $event.target.result;
					$callback(this.$filenames);
				}.bind(this));
				
				$request.addEventListener('error', function($event) {
					this.$filenames = null;
					$callback(this.$filenames);
				}.bind(this));
			}
			else {
				$callback(this.$filenames);
			}
		}, 
		
		reader: function() {
			if(this.$reader === undefined) {
				this.$reader = new ArchiveReader(this.$blob);
			}
			return this.$reader;
		}
	};
	
	var EPubFile = {
		render: (function() {
			var 
				dataURI = function($type, $data) {
					return 'data:' + $type +',' + escape($data);
				}, 
				$renderer = {
					'application/xhtml+xml': function($callback) {
						this.xmldoc(function($xmldoc) {
							var 
								$images = $xmldoc.querySelectorAll('image,link[href]'), 
								$count = $images.length, 
								$fct = function() {
									if($count-- === 0) {
										$callback(new XMLSerializer().serializeToString($xmldoc));
									}
								};
							
							Array.prototype.forEach.call($images, function($el) {
								var 
									$href = $el.getAttribute('href');
								
								if($href === null) {
									$href = $el.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
								}
								
								this.$ebook.file($href, function($file) {
									$file.render(function($render) {
										$el.setAttribute('href', dataURI($file.type(), $render));
										$fct();
									});
								}.bind(this));
							}.bind(this));
							
							$fct();
						}.bind(this));
					}
				};
			
			return function($callback) {
				if(this.$render === undefined) {
					if($renderer[this.type()] !== undefined) {
						$renderer[this.type()].call(this, function($render) {
							this.$render = $render;
							$callback(this.$render);
						}.bind(this));
					}
					else {
						this.data(function($data) {
							this.$render = $data;
							$callback(this.$render);
						}.bind(this));
					}
				}
				else {
					$callback(this.$render);
				}
			};
		}) (), 
		
		type: function() {
			return this.$blob.type;
		}, 
		
		data: function($callback) {
			if(this.$data === undefined) {
				var $reader = new FileReader(this.$blob);
				
				$reader.addEventListener('load', function($event) {
					this.$data = $event.target.result;
					$callback(this.$data);
				});
				
				$reader.addEventListener('error', function($event) {
					this.$data = null;
					$callback(this.$data);
				});
				
				$reader.readAsText(this.$blob);
			}
			else {
				$callback($this.$data);
			}
		}, 
		
		xmldoc: function($callback) {
			if(this.$xmldoc === undefined) {
				this.data(function($xml) {
					if($xml !== null) {
						this.$xmldoc = new DOMParser().parseFromString($xml, "text/xml");
					}
					else {
						this.$xmldoc = null;
					}
					$callback(this.$xmldoc);
				}.bind(this));
			}
			else {
				$callback(this.$xmldoc);
			}
		}, 
		
		one: function($selectors, $callback) {
			this.xmldoc(function($xmldoc) {
				$callback($xmldoc.querySelector($selectors));
			});
		}, 
		
		all: function($selectors, $callback) {
			this.xmldoc(function($xmldoc) {
				window.doc = $xmldoc;
				$callback($xmldoc.querySelectorAll($selectors));
			});
		}, 
	};
	
	var EPubFile_factory = function($blob, $ebook) {
		return Object.create(EPubFile, {$blob: {value: $blob}, $ebook: {value: $ebook}});
	};
	
	var EPub_factory = function($blob) {
		return Object.create(EPub, {$blob: {value: $blob}});
	};
	
	$wr.register('application/epub+zip', EPub_factory, 'epub');
	
}) (WR);
