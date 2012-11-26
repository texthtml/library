(function($wr) {
	"use strict";
	
	var EPub = (function() {
		
		jsviews.helpers({
			epub_navuri: function($navPoint) {
				return $navPoint.querySelector('content').getAttribute('src');
			}
		});
		
		jsviews.tags({
			epub_navPoints: function($data) {
				var $navPoints = [];
				
				for(var $i = 0; $i < $data.children.length; $i++) {
					if($data.children[$i].tagName === 'navPoint') {
						$navPoints.push($data.children[$i]);
					}
				}
				
				return this.renderContent($navPoints, undefined, undefined, undefined, true);
			}
		});
		
		var 
			render_spine = function($file, $folder, $callback, $href) {
				$file.all('link[href],image,img[src]', function($elements) {
					Utils.forEach($elements, function($element, $done) {
						var 
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
								};
							}
							$done();
						});
					}.bind(this), function() {
						$file.xmldoc(function($xmldoc) {
							$callback(
								new XMLSerializer().serializeToString($xmldoc), 
								$href
							);
						}.bind(this));
					}.bind(this));
				}.bind(this));
			}, 
			nav_to_html = function($navdoc, $callback) {
				render_template('epub-toc-item', undefined, function() {
					render_template('epub-toc', $navdoc.documentElement, function($html) {
						$callback($html);
					});
				});
			};
		
		return {
			toc: function($callback) {
				this.rootfile(function($rootfile) {
					$rootfile.one('spine[toc]', function($spine) {
						$rootfile.one('[id="' + $spine.getAttribute('toc') + '"]', function($item) {
							this.rootfile_dir(function($rootfile_dir) {
								this.file($rootfile_dir + $item.getAttribute('href'), function($file) {
									$file.xmldoc(function($xmldoc) {
										nav_to_html($xmldoc, $callback);
									});
								});
							}.bind(this))
						}.bind(this));
					}.bind(this));
				}.bind(this));
			}, 
			
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
			
			spine: Utils.cache(function($spine, $callback) {
				var 
					fct = function($href, $folder) {
						this.file($folder + $href, function($file) {
							render_spine.call(this, $file, $folder, $callback, $href);
						}.bind(this));
					}.bind(this);
				
				this.rootfile_dir(function($rootfile_dir) {
					if($spine === undefined) {
						this.rootfile(function($rootfile) {
							$rootfile.one('spine itemref:not([linear="no"])', function($itemref) {
								$rootfile.one('[id="' + $itemref.getAttribute('idref') + '"]', function($item) {
									fct($item.getAttribute('href'), $rootfile_dir);
								}.bind(this));
							});
						}.bind(this));
					}
					else {
						fct($spine, $rootfile_dir);
					}
				}.bind(this));
			}, function($name) {
				if(this.$spines === undefined) {
					this.$spines = {};
				}
				if(this.$spines[$name] === undefined) {
					this.$spines[$name] = {};
				}
				
				return this.$spines[$name];
			}), 
			
			item: function($id) {
				this.rootfile(function($rootfile) {
					 
				}.bind(this));
			}, 
			
			itemrefs: Utils.cache(function($callback) {
				this.rootfile(function($rootfile) {
					$rootfile.all('spine itemref', $callback);
				}.bind(this));
			}, '$itemrefs'), 
			
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
			
			rootfile: Utils.cache(function($callback) {
				this.rootfile_path(function($rootfile_path) {
					this.file($rootfile_path, $callback);
				}.bind(this));
			}, '$rootfile'), 
			
			rootfile_dir: function($callback) {
				this.rootfile_path(function($rootfile_path) {
					var 
						$pos          = $rootfile_path.lastIndexOf('/'), 
						$rootfile_dir = $pos === -1 ? '' : $rootfile_path.slice(0, $pos + 1);
					
					$callback($rootfile_dir);
				});
			}, 
			
			rootfile_path: Utils.cache(function($callback) {
				this.container(function($container) {
					$container.one('container rootfiles rootfile', function($rootfile) {
						$callback($rootfile === null ? null : $rootfile.getAttribute('full-path'));
					}.bind(this));
				}.bind(this));
			}, '$rootfile_path'), 
			
			container: function($callback) {
				this.file('META-INF/container.xml', $callback);
			}, 
			
			file: Utils.cache(function($name, $callback) {
				$name = $name.replace('/../', '/');
				var 
					$request = this.reader().getFile($name);
				
				$request.addEventListener('success', function($event) {
					$callback(EPubFile_factory($event.target.result));
				}.bind(this));
				
				$request.addEventListener('error', function($event) {
					$callback(null);
				}.bind(this));
				
				if(ArchiveReader.polyfill) {
					$request.exec();
				}
			}, function($name) {
				$name = $name.replace('/../', '/');
				if(this.$files === undefined) {
					this.$files = {};
				}
				if(this.$files[$name] === undefined) {
					this.$files[$name] = {};
				}
				
				return this.$files[$name];
			}), 
			
			filenames: Utils.cache(function($callback) {
				var 
					$request = this.reader().getFilenames();
				
				$request.addEventListener('success', function($event) {
					$callback($event.target.result);
				}.bind(this));
				
				$request.addEventListener('error', function($event) {
					$callback(null);
				}.bind(this));
				
				if(ArchiveReader.polyfill) {
					$request.exec();
				}
			}, '$filenames'), 
			
			reader: function() {
				if(this.$reader === undefined) {
					this.$reader = new ArchiveReader(this.$blob);
				}
				return this.$reader;
			}
		};
	}) ();
	
	var EPubFile = {
		dataURL: Utils.cache(function($callback) {
			var $reader = new FileReader(this.$blob);
			
			$reader.addEventListener('load', function($event) {
				$callback($event.target.result);
			}.bind(this));
			
			$reader.addEventListener('error', function($event) {
				$callback(null);
			}.bind(this));
			
			$reader.readAsDataURL(this.$blob);
		}, '$dataURL'), 
		
		type: function() {
			return this.$blob.type;
		}, 
		
		data: Utils.cache(function($callback) {
			var $reader = new FileReader();
			
			$reader.addEventListener('load', function($event) {
				$callback($event.target.result);
			}.bind(this));
			
			$reader.addEventListener('error', function($event) {
				$callback(null);
			}.bind(this));
			
			$reader.readAsText(this.$blob);
		}, '$data'), 
		
		xmldoc: Utils.cache(function($callback) {
			this.data(function($xml) {
				if($xml !== null) {
					$callback(new DOMParser().parseFromString($xml, "text/xml"));
				}
				else {
					$callback(null);
				}
			}.bind(this));
		}, '$xmldoc'), 
		
		one: function($selectors, $callback) {
			this.xmldoc(function($xmldoc) {
				$callback($xmldoc.querySelector($selectors));
			});
		}, 
		
		all: function($selectors, $callback) {
			this.xmldoc(function($xmldoc) {
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
