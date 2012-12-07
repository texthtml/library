document.addEventListener('DOMContentLoaded', function() {
	"use strict";
	
	var 
		$library_el = document.querySelector('#library'), 
		$filter_el  = $library_el.querySelector('input[name=filter]'), 
		$ebook_el   = document.querySelector('#ebook'), 
		$toc_el     = document.querySelector('#toc'), 
		$iframe_el  = $ebook_el.querySelector('iframe'), 
		$overlay_el = document.querySelector('#overlay');
	
	
	zip.workerScriptsPath = 'js/vendor/zip/WebContent/'
	
	
	Array.prototype.forEach.call(document.querySelectorAll('body > div[id]'), function($el) {
		$el.id = 'x-' + $el.id;
	});
	
	
	jsviews.helpers({
		ebook_formats: WR.formats
	});
	
	jsviews.tags({
		each: function($data) {
			var $array = [];
			
			for(var $key in $data) {
				$array.push({key: $key, value: $data[$key]});
			}
			
			return this.renderContent($array);
		}, 
		selector: function($selector, $data) {
			if($data === undefined) {
				$data = this.data;
			}
			var $res = $data.querySelector($selector);
			return $res === null ? '' : this.renderContent($res);
		}, 
		ifselector: function($selector, $data) {
			if($data === undefined) {
				$data = this.data;
			}
			var $res = $data.querySelector($selector);
			return $res === null ? '' : this.renderContent($data);
		}, 
		selectorAll: function($selector, $data) {
			if($data === undefined) {
				$data = this.data;
			}
			
			var 
				$nodes = $data.querySelectorAll($selector), 
				$array = [];
			
			for(var $i = 0; $i < $nodes.length; $i++) {
				$array.push($nodes[$i]);
			}
			
			return this.renderContent($array);
		}
	});
	
	jsviews.converters({
		attr: function($text) {
			return $text !== undefined ? String($text).replace('"', '&quot;').replace('&', '&amp;') : '';
		}
	});
	
	
	var $wr = Object.create(WR);
				
				
	var split_ebook_hash = (function() {
		var split_escape = function($str, $sep, $esc) {
			var $results = [];
			var $current = '';
			var $i = 0;
			
			while($str[$i] !== undefined) {
				var $c = $str[$i];
				if($c === $sep) {
					$results.push($current);
					$current = '';
				}
				else {
					if($c === $esc) {
						$c = $str[++$i];
					}
					
					$current += $c;
				}
				
				$i++;
			}
			
			$results.push($current);
			
			return $results;
		};
		
		return function($str) {
			return split_escape($str, '@', '\\');
		};
	}) ();
	
	var edit_metadata = function($ebook, $callback, $old_metadata) {
		$ebook.metadata(function($metadata) {
			//~ console.log('edit metadata', $metadata, $old_metadata);
			
			$callback($metadata);
		});
	};
	
	
	var import_blob = function($blob) {
		var $ebook = $wr.build($blob);
		
		if($ebook === undefined) {
			alert('EBook format [type] is not supported'.replace('[type]', $blob.type));
			close_overlay();
			return;
		}
		
		$ebook.identifier(function($identifier) {
			import_blob.import_ebook($ebook, $identifier);
			close_overlay();
		});
	};
	
	import_blob.import_ebook = function($ebook, $identifier) {
		$wr.library().list(function($ebooks) {
			if($ebooks[$identifier] !== undefined) {
				import_blob.identifier_exists($ebook, $identifier, $ebooks, $ebooks[$identifier], function($identifier) {
					edit_metadata($ebook, function($metadata) {
						$wr.library().save($identifier, $metadata, $ebook.$blob);
					});
				});
			}
			else {
				edit_metadata($ebook, function($metadata) {
					$wr.library().save($identifier, $metadata, $ebook.$blob);
				});
			}
		}, true);
	};
	
	import_blob.identifier_exists = function($ebook, $identifier, $ebooks, $metadata, $callback) {
		open_overlay('checking identifier');
		render_template('library-identifier-exists', $metadata, function($html) {
			var $content = set_overlay($html);
			
			$content.querySelector('#identifier-exists-update').addEventListener(
				'click', 
				function() {
					close_overlay();
					$callback($identifier);
				}
			);
			
			$content.querySelector('#identifier-exists-new').addEventListener(
				'click', 
				function() {
					import_blob.identifier_resolve($ebook, $identifier, $ebooks, $metadata, $callback);
				}
			);
			
			$content.querySelector('#identifier-exists-update-other').addEventListener(
				'click', 
				function() {
					import_blob.update_ebook($ebook, $identifier, $ebooks, $metadata, $callback);
				}
			);
		});
	};
	
	import_blob.update_ebook = function($ebook, $identifier, $ebooks, $metadata, $callback) {
		open_overlay('loading ebooks list');
		
		render_template(
			'library-identifier-select-ebook', 
			$ebooks, 
			function($html) {
				var 
					$content = set_overlay($html);
				
				$content.querySelector('#library-select-identifier-filter').addEventListener(
					'input', 
					function($event) {
						var 
							$select = $content.querySelector('#library-select-identifiers'), 
							$regexp = new RegExp(this.value, 'gi'), 
							$first_match, 
							$empty_option;
						
						Array.prototype.forEach.call($select.querySelectorAll('option'), function($option) {
							if($option.value !== '') {
								$option.innerHTML = $option.dataset.label.replace($regexp, '<b>$&</b>');
								
								if($option.dataset.label.toLowerCase().search($regexp) === -1) {
									$option.style.display = 'none';
									
									if($select.value === $option.value) {
										$select.value = '';
									}
								}
								else {
									if($first_match === undefined) {
										$first_match = $option;
									}
									$option.style.display = '';
								}
							}
							else {
								$empty_option = $option;
							}
						});
						
						if($first_match === undefined) {
							$empty_option.textContent = $empty_option.dataset.nomatch;
						}
						else {
							if($select.value === '') {
								$select.value = $first_match.value;
							}
							$empty_option.textContent = $empty_option.dataset.label;
						}
					}
				);
				
				$content.querySelector('#library-select-identifier-filter').focus();
				
				$content.querySelector('#library-select-identifier').addEventListener(
					'submit', 
					function($event) {
						$event.preventDefault();
						close_overlay();
						$callback(this.identifier.value);
					}
				);
			}
		);
	};
	
	import_blob.identifier_resolve = function($ebook, $identifier, $ebooks, $metadata, $callback) {
		open_overlay('generating identifier');
		
		var $new_identifier = $identifier + '-';
		
		do {
			$new_identifier += Math.floor(10 * Math.random());
		} while($ebooks[$new_identifier] !== undefined);
		
		render_template(
			'library-identifier-resolve-conflict', 
			{
				new: $new_identifier, 
				old: $identifier
			}, 
			function($html) {
				var 
					$content = set_overlay($html), 
					$input = $content.querySelector('input'), 
					$check_identifier = function() {
						if($ebooks[$input.value] !== undefined) {
							$input.setCustomValidity('This identifier already exists: ' + $ebooks[$input.value].title[0].value);
						}
						else {
							$input.setCustomValidity('');
						}
						
					};
				
				$content.querySelector('#library-resolve-identifier-conflict').addEventListener(
					'submit', 
					function($event) {
						$event.preventDefault();
						close_overlay();
						$callback(this['new-identifier'].value);
					}
				);
				
				$content.querySelector('[type=reset]').addEventListener(
					'click', 
					function() {
						window.setTimeout($check_identifier, 1);
					}
				);
				
				$content.querySelector('input').addEventListener(
					'input', 
					$check_identifier
				);
			}
		);
	};
	
	
	var open_overlay = function($message, $abort, $abort_callback) {
		$overlay_el.innerHTML = $message || 'loading overlay content';
		
		if($abort !== false) {
			var $button = document.createElement('button');
			$button.textContent = $abort || 'Abort';
			$button.className = 'close-overlay';
			$button.addEventListener('click', function($event) {
				close_overlay();
				if($abort_callback !== undefined) {
					$abort_callback();
				}
			});
			
			$overlay_el.appendChild($button);
		}
		
		$overlay_el.classList.add('loading');
		$overlay_el.style.left = 0;
	};
	
	var set_overlay = function($html, $close_callback) {
		$overlay_el.innerHTML = $html;
		$overlay_el.classList.remove('loading');
		
		Array.prototype.forEach.call($overlay_el.querySelectorAll('.close-overlay'), function($element) {
			$element.addEventListener('click', function($event) {
				$event.preventDefault();
				if($close_callback === undefined) {
					close_overlay();
				}
				else {
					$close_callback();
				}
			});
		});
		
		return $overlay_el;
	};
	
	var close_overlay = function() {
		$overlay_el.style.left = '';
	};
	
	
	var ebook_link_to_wr = function($prefix, $ebook_id, $href) {
		var 
			$last_href;
		
		do {
			$last_href = $href;
			$href = $href.replace(/[^\/]*\/\.\.\//g, '');
		} while($last_href !== $href);
		
		$href = $href.replace('@', '\\@', 'g');
		$href = $href.replace(/#(.*)/, '@[id="$1"]', 'g');
		
		return $prefix + '/' + $ebook_id + '@' + $href;
	};
	
	var hash_change = function() {
		if(window === window.top) {
			var 
				$hash = window.location.hash.substr(1), 
				$pos = $hash.search('/'), 
				$prefix = $pos === -1 ? $hash : $hash.substr(0, $pos), 
				$ebook_id = ($pos === -1) ? undefined : $hash.substr($pos + 1);
			
			Array.prototype.forEach.call(document.querySelectorAll('.target'), function($el) {
				$el.classList.remove('target');
			});
			
			Array.prototype.forEach.call(document.querySelectorAll('a[data-prefix]'), function($el) {
				if($ebook_id === undefined) {
					$el.href = '#' + $el.dataset.prefix;
				}
				else {
					$el.href = '#' + $el.dataset.prefix + '/' + $ebook_id;
				}
			});
			
			if($prefix === '') {
				$prefix = 'library';
			}
			
			if(hash_change[$prefix] !== undefined) {
				if($ebook_id !== undefined) {
					load_ebook($ebook_id, hash_change[$prefix]);
				}
				else {
					hash_change[$prefix]();
				}
			}
			
			var $target = document.querySelector('#x-'+$prefix);
			if($target !== null) {
				$target.classList.add('target');
			}
		}
	};
	
	hash_change.library = function() {
	};
	
	hash_change.bookmarks = function() {
	};
	
	hash_change.settings = function() {
		if(
			document.documentElement.dataset.installed === 'undefined' && 
			Modernizr.apps === true
		) {
			get_app(function($app) {
				document.documentElement.dataset.installed = $app !== null;
				
				if($app !== null) {
					var 
						$manifest = $app.manifest, 
						$xhr = new XMLHttpRequest();
					
					$xhr.open('GET', $app.manifestURL);
					$xhr.responseType = 'json';
					$xhr.onreadystatechange = function($event) {
						if(this.readyState === 4) {
							document.documentElement.dataset.uptodate =  this.response.version === $app.manifest.version;
						}
					}
					$xhr.send();
				}
			});
		}
	};
	
	hash_change.import = function() {
		if(document.querySelector('#opds').dataset.loaded !== 'true') {
			document.querySelector('#opds').dataset.loaded = 'true';
			Utils.forEach(OPDS.servers(), {
				title: function($opds_server, $done) {
					$opds_server.title(function($title, $subtitle) {
						$done({main: $title, sub: $subtitle});
					});
				}, 
				icon: function($opds_server, $done) {
					$opds_server.icon($done);
				}, 
				id: function($opds_server, $done) {
					$opds_server.id($done);
				}
			}, function($servers) {
				$servers = Array.prototype.filter.call($servers, function($server) {
					return $server.id !== null;
				});
				
				render_template('opds-server-list', {servers: $servers}, function($html) {
					document.querySelector('#opds').innerHTML = $html;
					Array.prototype.forEach.call(document.querySelectorAll('#opds li button'), function($button) {
						$button.addEventListener('click', function($event) {
							opds_overlay(OPDS.server($button.dataset.serverid), null);
						});
					});
				});
			});
		}
	};
	
	hash_change['ebook-bookmarks'] = function($ebook, $ebook_id, $ebook_spine, $ebook_hash, $ebook_delta) {
	};
	
	hash_change['ebook-settings'] = function($ebook, $ebook_id, $ebook_spine, $ebook_hash, $ebook_delta) {
	};
	
	hash_change.toc = function($ebook, $ebook_id, $ebook_spine, $ebook_hash, $ebook_delta) {
		if(hash_change.toc.$ebook_id !== $ebook_id) {
			hash_change.toc.$ebook_id = $ebook_id;
			$ebook.toc(function($html) {
				$toc_el.querySelector('.content').innerHTML = $html;
				$toc_el.dataset.ebook_id = $ebook_id;
			});
		}
	};
	
	hash_change.ebook = function($ebook, $ebook_id, $ebook_spine, $ebook_hash, $ebook_delta) {
		var move_to_hash = function() {
			if($ebook_hash !== undefined) {
				var 
					$el = $iframe_el.contentDocument.querySelector($ebook_hash), 
					$top = $el === null ? 0 : $el.getClientRects()[0].top;
				
				$iframe_el.contentDocument.documentElement.scrollTop = Math.round($top);
			}
		};
		
		if(
			hash_change.ebook.$ebook_id !== $ebook_id || 
			hash_change.ebook.$ebook_spine !== $ebook_spine
		) {
			
			$iframe_el.contentDocument.open();
			$iframe_el.contentDocument.write('loading ebook…');
			$iframe_el.contentDocument.close();
			
			$ebook.spine($ebook_spine, function($html, $spine) {
				var ebook_link = function($link) {
					$link.addEventListener('click', function($event) {
						if(this.nodeName === 'A') {
							$event.preventDefault();
							var 
								$href = this.getAttribute('href');
							
							window.location.hash = ebook_link_to_wr($ebook_el.dataset.prefix, $ebook_id, $href);
						}
					});
				};
				
				hash_change.ebook.$ebook_id    = $ebook_id;
				hash_change.ebook.$ebook_spine = $ebook_spine;
				
				$iframe_el.contentDocument.open();
				$iframe_el.contentDocument.write($html);
				$iframe_el.contentDocument.close();
				
				$ebook.prev_next($spine, function($prev, $next) {
					var make_prev_next_link = function($link) {
						ebook_link($link);
						$link.style.display = 'block';
						$link.style.lineHeight = '2em';
						$link.style.marginTop = '2em';
						$link.style.marginBottom = '2em';
						
						$link.style.textAlign = 'center';
					};
					
					if($prev !== null) {
						var $a_prev = $iframe_el.contentDocument.createElement('a');
						$a_prev.textContent = 'prev';
						$a_prev.href = $prev;
						make_prev_next_link($a_prev);
						$iframe_el.contentDocument.body.insertBefore(
							$a_prev, 
							$iframe_el.contentDocument.body.firstChild
						);
					}
					
					if($next !== null) {
						var $a_next = $iframe_el.contentDocument.createElement('a');
						$a_next.textContent = 'next';
						$a_next.href = $next;
						make_prev_next_link($a_next);
						$iframe_el.contentDocument.body.appendChild(
							$a_next
						);
					}
				});
				
				$iframe_el.onload = function() {
					move_to_hash();
				};
				
				Array.prototype.forEach.call($iframe_el.contentDocument.querySelectorAll('a'), ebook_link);
			});
		}
		else {
			move_to_hash();
		}
	}
	
	hash_change.ebook.$ebook_spine = null;
	
	var load_ebook = function($ebook_id, $callback) {
		var 
			$ebook_spine, 
			$ebook_hash, 
			$ebook_delta;
		
		[$ebook_id, $ebook_spine, $ebook_hash, $ebook_delta] = split_ebook_hash($ebook_id);
		
		if($ebook_id !== load_ebook.$current_ebook_id) {
			$wr.library().load($ebook_id, function($ebook) {
				load_ebook.$current_ebook = $ebook;
				load_ebook.$current_ebook_id = $ebook_id;
				
				$callback($ebook, $ebook_id, $ebook_spine, $ebook_hash, $ebook_delta);
			});
		}
		else {
			$callback(load_ebook.$current_ebook, $ebook_id, $ebook_spine, $ebook_hash);
		}
	};
	
	var render_ebooks = function($ebooks) {
		var $ebooks = $ebooks.sort(function($e1, $e2) {
			var 
				$s1 = 
					$e1.creator.map(function($i, $e) {return $e.value}).sort().join(' ')+' '+
					($e1.series ? $e1.series.value : '')+' '+
					($e1.series_index?$e1.series_index.value:'')+' '+
					$e1.title.value, 
				$s2 = 
					$e2.creator.map(function($i, $e) {return $e.value}).sort().join(' ')+' '+
					($e2.series ? $e2.series.value : '')+' '+
					($e2.series_index?$e2.series_index.value:'')+' '+
					$e2.title.value;
			
			return $s1.localeCompare($s2);
		}).map(function($ebook) {
			return $ebook;
		});
		
		$filter_el.value = '';
		
		render_template('library-item', $ebooks, function($html) {
			document.querySelector('#library-list').innerHTML = $html;
			
			if(render_ebooks.$focus !== undefined) {
				document.getElementById(render_ebooks.$focus).focus();
				delete render_ebooks.$focus;
			}
		});
	};
	
	var download_ebook = function($uri, $mime, $failure) {
		var $xhr = new XMLHttpRequest({mozSystem: true});
		
		open_overlay('Getting EBook...');
		
		$xhr.open('GET', $uri);
		$xhr.overrideMimeType($mime || 'application/epub+zip');
		$xhr.responseType = 'blob';
		$xhr.onreadystatechange = function($event) {
			if(this.readyState === 4) {
				if(this.response === null) {
					if($failure === undefined) {
						alert('Could not load EBook');
						close_overlay();
					}
					else {
						$failure($xhr);
					}
				}
				else {
					import_blob(this.response);
				}
			}
		}
		$xhr.send();
	}
	
	
	var $manifest_url = window.location.protocol + '//' + window.location.hostname + window.location.pathname + 'manifest.webapp';
	
	var $apps_api = function() {
		var $apps_api;
		
		return function() {
			if($apps_api === undefined) {
				return Modernizr._domPrefixes.reduce(function($apps, $prefix) {
					return $apps || window.navigator[$prefix + 'Apps'] || window.navigator[$prefix.toLowerCase() + 'Apps'];
				}, navigator.apps) || null;
			}
			
			return $apps_api;
		}
	} ();
	
	var get_app = function() {
		var $app;
		
		return function($callback) {
			if($app !== undefined) {
				return $app;
			}
			if(Modernizr.apps === true) {
				var 
					$installed = $apps_api().getInstalled();
				
				$app = null;
				
				$installed.addEventListener('success', function($event) {
					$app = this.result.filter(function($app) {
						return $app.manifestURL === $manifest_url;
					});
					
					if($app.length === 0) {
						$app = null;
					}
					else {
						$app = $app[0];
					}
					
					$callback($app);
				});
			}
		}
	} ();
	
	var install = function() {
		if(Modernizr.apps === true) {
			var 
				$installation = $apps_api().install($manifest_url);
			
			$installation.addEventListener('success', function($event) {
				document.documentElement.dataset.installed = true;
				document.documentElement.dataset.uptodate = true;
				
				alert('Web Reader install ended successfully!');
			});
			
			$installation.addEventListener('error', function($event) {
				alert('installation-error' + this.name);
			});
			
			open_overlay('Installation in progress...');
		}
	};
	
	Modernizr.addTest('apps', function() {
		return window.navigator.mozApps;
	});
	
	Modernizr.addTest('system-xhr', function() {
		return (new XMLHttpRequest({mozSystem: true})).mozSystem;
	});
	
	
	var opds_overlay = function($server, $url, $back) {
		$server.title(function($title) {
			open_overlay('loading ' + $title + ' feeds');
			
			Utils.forEach($server, {
				title: function($server, $done) {
					$server.title($done);
				}, 
				searchengine: function($server, $done) {
					$server.searchengine($done);
				}, 
				feed: function($server, $done) {
					if($url === null) {
						$server.root(function($feed) {
							$done($feed ? $feed.documentElement : null);
						});
					}
					else {
						$server.get($url, function($feed) {
							if($feed !== null) {
								$done($feed.documentElement);
							}
							else {
								if($back === undefined) {
									alert('Can\'t open this ' + $title + ' feed.');
									close_overlay();
								}
								else {
									if(confirm('Can\'t open this ' + $title + ' feed. Do you want to go to the previous feed?')) {
										opds_overlay($server, $back);
									}
									else {
										close_overlay();
									}
								}
							}
						});
					}
				}
			}, function($results) {
				render_template('opds-feed', $results, function($html) {
					if($results.feed === null) {
						alert('Can\'t open this ' + $title + ' feed.');
						close_overlay();
					}
					else {
						set_overlay($html);
						
						Array.prototype.forEach.call($overlay_el.querySelectorAll('button[data-next]'), function($button) {
							$button.addEventListener('click', function($event) {
								opds_overlay($server, $event.target.dataset.next, $url);
							});
						});
						
						Array.prototype.forEach.call($overlay_el.querySelectorAll('button[data-ebook-uri]'), function($button) {
							$button.addEventListener('click', function($event) {
								$event.preventDefault();
								download_ebook(
									$event.target.dataset.ebookUri, 
									$event.target.dataset.type, 
									function() {
										alert('Could not load EBook');
										opds_overlay($server, $url, $back);
									}
								);
							});
						});
					}
				});
			});
		});
	};
	
	
	$wr.library().addEventListener('changed', function($event) {
		render_ebooks($event.$ebooks);
	});
	
	$wr.library().addEventListener('added', function($event) {
		window.location = document.querySelector('.target a.back').href;
		render_ebooks.$focus = $event.$identifier;
	});
	
	$library_el.addEventListener('click', function($evt) {
		if($evt.target.nodeName === 'BUTTON' && $evt.target.name === 'delete') {
			$evt.preventDefault();
			$wr.library().delete($evt.target.parentNode.id);
		}
	});
	
	document.querySelector('#import_ebook_input form').addEventListener('submit', function($e) {
		$e.preventDefault();
		
		import_blob(this.querySelector('input[type=file]').files[0]);
	});
	
	document.querySelector('#import_ebook_internet form').addEventListener('submit', function($e) {
		$e.preventDefault();
		download_ebook(this.querySelector('input[type=url]').value);
	});
	
	$toc_el.querySelector('.content').addEventListener('click', function($evt) {
		if($evt.target.nodeName === 'A') {
			$evt.preventDefault();
			window.location.hash = ebook_link_to_wr(
				$ebook_el.dataset.prefix, 
				$toc_el.dataset.ebook_id, 
				$evt.target.getAttribute('href')
			);
		}
	});
	
	document.querySelector('#fullscreen').addEventListener('click', function($event) {
		$event.preventDefault();
		
		var $ebook = $ebook_el.querySelector('.content');
		if ($ebook.requestFullScreen) {
			$ebook.requestFullScreen();
		}
		else if($ebook.mozRequestFullScreen) {
			$ebook.mozRequestFullScreen();
		}
		else if($ebook.webkitRequestFullScreen) {
			$ebook.webkitRequestFullScreen();
		}
	});
	
	document.querySelector('.install').addEventListener('click', install);
	
	window.addEventListener('hashchange', hash_change);
	$wr.addEventListener('initied', hash_change);
	
	OPDS.register('http://m.gutenberg.org/ebooks.opds/');
	
	$wr.init();
});

var render_template = function($template_name, $data, $callback) {
	if(jsviews.render[$template_name] === undefined) {
		var 
			$xhr = new XMLHttpRequest();
		
		$xhr.open('GET', 'templates/' + $template_name + '.html');
		
		$xhr.onreadystatechange = function() {
			if(this.readyState === 4) {
				var 
					$template_def = {};
				
				$template_def[$template_name] = this.response;
				jsviews.templates($template_def);
				
				$callback(jsviews.render[$template_name]($data));
			}
		};
		
		$xhr.send();
	}
	else {
		$callback(jsviews.render[$template_name]($data));
	}
};
