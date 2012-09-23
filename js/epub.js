(function($wr) {
	"use strict";
	
	var EPub = (function() {
		
		var 
			render_spine = function($file, $folder, $callback, $href) {
				var 
					fct = function($iterator) {
						try {
							var 
								$element = $iterator.next(), 
								$attribute_name = {
									link: 'href', 
									image: 'xlink:href', 
									img: 'src'
								}[$element.nodeName], 
								$rel_path = $element.getAttribute($attribute_name);
							
							this.file($folder + $rel_path, function($file) {
								if($file !== null) {
									switch($element.nodeName) {
										default: 
											$element.setAttribute($attribute_name, URL.createObjectURL($file.$blob));
											fct($iterator);
									};
								}
								else {
									fct($iterator);
								}
							});
						}
						catch($e) {
							if($e instanceof StopIteration) {
								$file.xmldoc(function($xmldoc) {
									$callback(
										new XMLSerializer().serializeToString($xmldoc), 
										$href
									);
								}.bind(this));
							}
							else {
								throw $e;
							}
						}
					}.bind(this);
					
				$file.all('link[href],image,img[src]', function($elements) {
					fct.call(this, $elements.iterator());
				}.bind(this));
			};
		
		return {
			prev_next: function($itemhref, $callback) {
				this.rootfile(function($rootfile) {
					$rootfile.xmldoc(function($xmldoc) {
						var 
							$item = $xmldoc.querySelector('manifest item[href="' + $itemhref + '"]'), 
							$item_id = $item.getAttribute('id'), 
							$itemref = $xmldoc.querySelector('spine itemref[idref="' + $item_id + '"]'), 
							$prev_itemref = $itemref === null ? null : $itemref.previousElementSibling, 
							$next_itemref = $itemref === null ? null : $itemref.nextElementSibling;
						
						while($prev_itemref !== null && $prev_itemref.getAttribute('linear') === 'no') {
							$prev_itemref = $prev_itemref.previousElementSibling;
						}
						while($next_itemref !== null && $next_itemref.getAttribute('linear') === 'no') {
							$next_itemref = $next_itemref.nextElementSibling;
						}
						
						var 
							$prev_id = $prev_itemref === null ? null : $prev_itemref.getAttribute('idref'), 
							$next_id = $next_itemref === null ? null : $next_itemref.getAttribute('idref'), 
							$prev_item = $prev_id === null ? null : $xmldoc.querySelector('manifest item[id="' + $prev_id + '"]'), 
							$next_item = $next_id === null ? null : $xmldoc.querySelector('manifest item[id="' + $next_id + '"]'), 
							$prev_href = $prev_item === null ? null : $prev_item.getAttribute('href'), 
							$next_href = $next_item === null ? null : $next_item.getAttribute('href');
						
						$callback($prev_href, $next_href);
					});
				});
			}, 
			
			spine: function($spine, $callback) {
				var 
					fct = function($href, $folder) {
						this.file($folder + $href, function($file) {
							render_spine.call(this, $file, $folder, $callback, $href);
						}.bind(this));
					}.bind(this);
				
				this.rootfile_dir(function($rootfile_dir) {
					if($spine === undefined) {
						this.rootfile(function($rootfile) {
							$rootfile.one('guide reference[type="cover"][href]', function($reference) {
								if($reference !== null) {
									fct($reference.getAttribute('href'), $rootfile_dir);
								}
								else {
									$rootfile.one('spine itemref:not([linear="no"])', function($itemref) {
										$rootfile.one('[id="' + $itemref.getAttribute('idref') + '"]', function($item) {
											fct($item.getAttribute('href'), $rootfile_dir);
										}.bind(this));
									});
								}
							});
						}.bind(this));
					}
					else {
						fct($spine, $rootfile_dir);
					}
				}.bind(this));
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
						fct = function() {
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
									
									fct();
								});
							}
						};
					
					fct();
				});
			}, 
			
			identifier: function($callback) {
				this.rootfile(function($rootfile) {
					$rootfile.xmldoc(function($xmldoc) {
						var 
							$unique_identifier = $xmldoc.documentElement.getAttribute('unique-identifier');
						
						$rootfile.one('identifier[id="' + $unique_identifier + '"],identifier', function($identifier) {
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
					this.rootfile_path(function($rootfile_path) {
						this.file($rootfile_path, function($rootfile) {
							this.$rootfile = $rootfile;
							$callback(this.$rootfile);
						}.bind(this));
					}.bind(this));
				}
				else {
					$callback(this.$rootfile);
				}
			},
			
			rootfile_dir: function($callback) {
				this.rootfile_path(function($rootfile_path) {
					var 
						$pos          = $rootfile_path.lastIndexOf('/'), 
						$rootfile_dir = $pos === -1 ? '' : $rootfile_path.slice(0, $pos + 1);
					
					$callback($rootfile_dir);
				});
			},
			
			rootfile_path: function($callback) {
				if(this.$rootfile_path === undefined) {
					this.container(function($container) {
						$container.one('container rootfiles rootfile', function($rootfile) {
							this.$rootfile_path = $rootfile === null ? null : $rootfile.getAttribute('full-path');
							$callback(this.$rootfile_path);
						}.bind(this));
					}.bind(this));
				}
				else {
					$callback(this.$rootfile_path);
				}
			}, 
			
			container: function($callback) {
				this.file('META-INF/container.xml', $callback);
			}, 
			
			file: function($name, $callback) {
				$name = $name.replace('/../', '/');
				if(this.$files === undefined) {
					this.$files = {};
				}
				if(this.$files[$name] === undefined) { 
					var 
						$request = this.reader().getFile($name);
					
					$request.addEventListener('success', function($event) {
						this.$files[$name] = EPubFile_factory($event.target.result);
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
	}) ();
	
	var EPubFile = {
		dataURL: function($callback) {
			if(this.$dataURL === undefined) {
				var $reader = new FileReader(this.$blob);
				
				$reader.addEventListener('load', function($event) {
					this.$dataURL = $event.target.result;
					$callback(this.$dataURL);
				}.bind(this));
				
				$reader.addEventListener('error', function($event) {
					this.$dataURL = null;
					$callback(this.$dataURL);
				}.bind(this));
				
				$reader.readAsDataURL(this.$blob);
				
			}
			else {
				$callback($this.$dataURL);
			}
		}, 
		
		type: function() {
			return this.$blob.type;
		}, 
		
		data: function($callback) {
			if(this.$data === undefined) {
				var $reader = new FileReader(this.$blob);
				
				$reader.addEventListener('load', function($event) {
					this.$data = $event.target.result;
					$callback(this.$data);
				}.bind(this));
				
				$reader.addEventListener('error', function($event) {
					this.$data = null;
					$callback(this.$data);
				}.bind(this));
				
				$reader.readAsText(this.$blob);
			}
			else {
				$callback(this.$data);
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
	
	var EPubFile_factory = function($blob) {
		return Object.create(EPubFile, {$blob: {value: $blob}});
	};
	
	var EPub_factory = function($blob) {
		return Object.create(EPub, {$blob: {value: $blob}});
	};
	
	$wr.register('application/epub+zip', EPub_factory, 'epub');
	
}) (WR);
