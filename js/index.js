document.addEventListener('DOMContentLoaded', function() {
	"use strict";
	
	var 
		$library_el          = document.querySelector('#library'), 
		$settings_el         = document.querySelector('#settings'), 
		$ebook_el            = document.querySelector('#ebook'), 
		$toc_el              = document.querySelector('#toc'), 
		$ebook_settings_el   = document.querySelector('#ebook-settings'), 
		$overlay_el          = document.querySelector('#overlay'), 
		$filter_el           = $library_el.querySelector('input[name=filter]');
	
	
	zip.workerScriptsPath = 'js/vendor/zip/WebContent/'
	
	
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
	
	
	var $default_settings = [{
			name: 'save_reading_position',
			label: 'Remember reading position', 
			type: 'checkbox', 
			default_value: true
		}, {
			name: 'page_scrolling_direction', 
			label: 'Page scrolling direction', 
			type: 'radio', 
			values: {
				horizontal: 'Horizontal', 
				vertical: 'Vertical'
			}, 
			default_value: 'horizontal', 
			force: function($value) {
				return $value === 'horizontal' ? {
					general: {
						continuous_scrolling: false
					}
				} : {};
			}
		}, {
			name: 'continuous_scrolling', 
			label: 'Scroll continuously', 
			type: 'checkbox', 
			default_value: true, 
			force: function($value) {
				return $value ? {
					general: {
						page_scrolling_direction: 'vertical'
					}
				} : {};
			}
		}, {
			name: 'page_animation', 
			label: 'Page animation', 
			type: 'radio', 
			values: {
				slide: 'Slide', 
				shift: 'Shift'
			}, 
			default_value: 'slide'
		}, {
			name: 'screen_orientation', 
			label: 'Screen orientation', 
			type: 'radio', 
			default_value: 'portrait', 
			values: {
				system: 'System', 
				portrait: 'Portrait', 
				landscape: 'Landscape'
			}, 
			onchange: function($value) {
				var ret;
				if($value !== 'system') {
					ret = screen.mozLockOrientation($value);
				}
				else {
					ret = screen.mozUnlockOrientation();
				}
				console.log($value, ret);
			}, 
			disabled: screen.mozLockOrientation ? 'Not supported on your device' : false
		}];
	
	var $wr = Object.create(WR, {
		default_settings: {
			value: $default_settings
		}
	});
				
				
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
			
			$results = $results.map(function($str) {
				return $str === '' ? undefined : $str;
			});

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
		});
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
	
	
	var ebook_link_to_wr = function($prefix, $ebook_id, $href, $delta) {
		var 
			$last_href;
		
		do {
			$last_href = $href;
			$href = $href.replace(/[^\/]*\/\.\.\//g, '');
		} while($last_href !== $href);
		
		$href = $href.replace('@', '\\@', 'g');
		$href = $href.replace(/#(.*)/, '@$1', 'g');
		
		$delta = $delta === undefined ? '' : '@' + $delta;
		
		return $prefix + '/' + $ebook_id + '@' + $href + ($last_href.search('#') === -1 ? '@' : '') + $delta;
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
			
			var $target = document.querySelector('#'+$prefix);
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
		var 
			$settings_el = document.querySelector('#settings .content'), 
			$settings_def = $wr.settings_def(), 
			setting_def = function($category, $name) {
				if($settings_def[$category] === undefined) {
					return undefined;
				}
				
				for(var $i = 0; $i < $settings_def[$category].list.length; $i++) {
					if($settings_def[$category].list[$i].name === $name) {
						return $settings_def[$category].list[$i];
					}
				}
			}, 
			setting_render_value = function($category, $setting_name, $value) {
				var $setting_def = setting_def($category, $setting_name);
				
				switch($setting_def.type) {
					case 'checkbox': 
						$settings_el.querySelector('input[name='+$setting_def.name+']').checked = $value;
						break;
					
					case 'radio':
						$settings_el.querySelector('input[name='+$setting_def.name+'][value='+$value+']').checked = true;
						break;
				}
				
				$settings_el.querySelector('[data-setting_name="'+$category+'.'+$setting_name+'"]').old_value = $value;
			}, 
			setting_handler = function($setting_def, $value) {
				var handler = function($settings, $setting_def, $value) {
					var 
						$force = $setting_def.force ? $setting_def.force($value) : {};
					
					for(var $category in $force) {
						for(var $name in $force[$category]) {
							handler.call(this, $settings, setting_def($category, $name), $force[$category][$name]);
						}
					}
					$settings[$setting_def.category+'.'+$setting_def.name] = $value;
					$setting_def.onchange && $setting_def.onchange($value);
					
					return $settings;
				};
				
				return function($event) {
					var 
						$values = $value.call(this, $event), 
						$settings = handler.call(this, {}, $setting_def, $values.new_value);
					
					$wr.set_settings($settings, function() {
						for(var $fullname in $settings) {
							var 
								$category = $fullname.split('.', 2)[0], 
								$name = $fullname.slice($category.length + 1), 
								$setting_def = setting_def($category, $name);
							
							if($settings_el.querySelector('[data-setting_name="'+$category+'.'+$name+'"]').value !== $settings[$fullname]) {
								setting_render_value($category, $name, $settings[$fullname]);
							}
						}
					}, function() {
						console.warn('saving settings failed, should reload settings values');
					})
				};
			}, 
			$settings_list = $settings_el.querySelector('ul');
		
		if($settings_list === null) {
			$settings_list = document.createElement('ul');
			$settings_list.settings_names = [];
			
			$settings_list.classList.add('settings-list');
			
			for(var $category_id in $settings_def) {
				var 
					$category = $settings_def[$category_id], 
					$category_el = document.createElement('li'), 
					$category_header = document.createElement('h2'), 
					$category_list = document.createElement('ul');
				
				$category_header.textContent = $category.label;
				
				for(var $i = 0; $i < $category.list.length; $i++) {
					var 
						$setting_def = $category.list[$i], 
						$setting_el = document.createElement('li'), 
						$setting_header = document.createElement('h3'), 
						$setting_input, $setting_label, 
						$setting_list, $setting_item, 
						$disabled = typeof $setting_def.disabled === 'string';
					
					$setting_el.classList.add('type-' + $setting_def.type);
					$setting_el.classList.add('setting-item');
					$setting_el.dataset.setting_name = $category_id + '.' + $setting_def.name;
					$settings_list.settings_names.push($setting_el.dataset.setting_name);
					
					$setting_header.textContent = $setting_def.label;
					
					if($disabled) {
						var $disabled_el = document.createElement('span');
						$disabled_el.textContent = $setting_def.disabled;
						$setting_header.appendChild($disabled_el);
						
						$setting_el.classList.add('disabled');
					}
					
					switch($setting_def.type) {
						case 'checkbox':
							$setting_label = document.createElement('label'), 
							$setting_input = document.createElement('input');
							
							$setting_input.name = $setting_def.name;
							$setting_input.type = $setting_def.type;
							$setting_input.disabled = $disabled;
								
							$setting_input.input_value = $setting_el;
							
							$setting_input.addEventListener('change', setting_handler($setting_def, function() {
								return {
									new_value: this.checked, 
									old_value: !this.checked
								};
							}));
							
							$setting_label.appendChild($setting_header);
							$setting_label.appendChild($setting_input);
							
							$setting_el.appendChild($setting_label);
							
							break;
						
						case 'radio':
							$setting_el.appendChild($setting_header);
							$setting_list = document.createElement('ul');
							
							for(var $value in $setting_def.values) {
								$setting_item = document.createElement('li');
								$setting_label = document.createElement('label'), 
								$setting_input = document.createElement('input');
								
								$setting_input.name = $setting_def.name;
								$setting_input.type = $setting_def.type;
								$setting_input.value = $value;
								$setting_input.disabled = $disabled;
								
								$setting_input.input_value = $setting_el;
								
								$setting_input.addEventListener('change', setting_handler($setting_def, function($event) {
									return {
										new_value: this.value, 
										old_value: this.input_value.old_value
									};
								}));
								
								$setting_label.textContent = $setting_def.values[$value];
								
								$setting_label.appendChild($setting_input);
								$setting_item.appendChild($setting_label);
								$setting_list.appendChild($setting_item);
							}
							
							$setting_el.appendChild($setting_list);
							
							break;
					}
					
					$category_list.appendChild($setting_el);
				}
				
				$category_el.appendChild($category_header);
				$category_el.appendChild($category_list);
				
				$settings_list.appendChild($category_el);
			}
			
			$settings_el.appendChild($settings_list);
		}
		
		$wr.get_settings($settings_list.settings_names, function($settings) {
			for(var $category in $settings) {
				for(var $name in $settings[$category]) {
					setting_render_value($category, $name, $settings[$category][$name]);
				}
			}
		});
		
		if(
			document.documentElement.dataset.installed === 'undefined' && 
			Modernizr.apps === true
		) {
			get_app(function($app) {
				document.documentElement.dataset.installed = $app !== null;
				
				if($app !== null) {
					var 
						$xhr = new XMLHttpRequest();
					
					if($app.manifest !== null) {
						$xhr.open('GET', $app.manifestURL);
						$xhr.responseType = 'json';
						$xhr.onreadystatechange = function() {
							if(this.readyState === 4) {
								document.documentElement.dataset.uptodate =  this.response.version === $app.manifest.version;
							}
						};
						$xhr.send();
					}
				}
			});
		}
	};
	
	hash_change.import = function() {
		var $ebook_type_select = document.querySelector('#import_ebook_internet select:empty');
		if($ebook_type_select !== null) {
			var $option = document.createElement('option');
			$ebook_type_select.appendChild($option);
			var $formats = $wr.formats();
			for(var $mime in $formats) {
				$option = document.createElement('option');
				$option.value = $mime;
				$option.textContent = $formats[$mime];
				$ebook_type_select.appendChild($option);
			}
		}
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
		delete $ebook_settings_el.dataset.ebookid;
		
		// $wr.get_settings(undefined, function($settings) {
		// 	$ebook_settings_el.dataset.ebookid = $ebook_id;
		// 	// $ebook_settings_el.querySelector('input[name=save_position]').checked = $settings.general.save_reading_position === true;
		// }, $ebook_id);
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
		if($ebook === undefined) {
			alert('Could not load the book.');
			window.location.hash = 'library';
			return;
		}
		
		var 
			$iframe_el = $ebook_el.querySelector('iframe.top');
		
		$iframe_el.onload = undefined;
		
		if(
			hash_change.ebook.$ebook_id !== $ebook_id || 
			hash_change.ebook.$ebook_spine !== $ebook_spine
		) {
			hash_change.ebook.render($iframe_el, 'loading…');
		}
		
		$wr.get_settings(
			undefined, 
			function($settings) {
				var 
					$iframe_el = $ebook_el.querySelector('iframe.top'), 
					$rendered_callback, 
					$onrendered = function() {
						hash_change.ebook.init($ebook, $ebook_id, $ebook_spine, $ebook_hash, $ebook_delta, $settings, $iframe_el, function() {
							$onrendered = 'done';
							
							if($rendered_callback !== undefined) {
								$rendered_callback();
							}
						});
					}, 
					$onload = function() {
						if($onrendered !== 'done') {
							$rendered_callback = $onload;
						}
						else {
							hash_change.ebook.move_to_hash($iframe_el, $ebook_hash, $ebook_delta, $settings);
						}
					};
				
				if(
					hash_change.ebook.$ebook_id === $ebook_id && 
					hash_change.ebook.$ebook_spine === $ebook_spine
				) {
					$onrendered();
					$onload();
					return;
				}
				
				var 
					$last_position = hash_change.ebook.return_to_reading_position($settings, $ebook_id, $ebook_spine, $ebook_hash, $iframe_el);
				
				if($last_position !== false) {
					$ebook_spine = $last_position.spine;
					$ebook_delta = $last_position.delta;
				}
				
				$iframe_el.onload = $onload;
				
				$ebook.spine($ebook_spine, function($html, $spine) {
					var 
						$iframe_el = $ebook_el.querySelector('iframe.top'), 
						$iframe_clone_el = $ebook_el.querySelector('iframe.current:not(.top)');
					
					hash_change.ebook.render($iframe_el, $html, $ebook_id);
					// TODO should not render $iframe_clone_el here (only when continuous_scrolling === false)
					hash_change.ebook.render($iframe_clone_el, $html, $ebook_id);
					
					hash_change.ebook.$ebook_id    = $ebook_id;
					hash_change.ebook.$ebook_spine = $ebook_spine;
					hash_change.ebook.$ebook_spine_real = $spine;
					
					$onrendered();
				});
			}, 
			$ebook_id
		);
	};
	
	var document_root = function($document) {
		return $document[
			$document.compatMode === 'BackCompat' ? 'body' : 'documentElement'
		];
	};
	
	
	hash_change.ebook.init_scrolling = function($ebook, $ebook_id, $ebook_spine, $ebook_hash, $settings, $callback) {
		var 
			$style = {
				height: '100%', 
				MozColumnWidth: '99999rem', 
				MozColumnGap: '0', 
				overflow: 'hidden', 
				zIndex: 0, 
				left: '', 
				top: ''
			}, 
			prepare_iframe = function($iframe) {
				for(var $name in $style) {
					$iframe.contentDocument.documentElement.style[$name] = $settings.general.continuous_scrolling === false ? $style[$name] : '';
				}
				
				var 
					$swipe = {
						began: false, 
						in_progress: false, 
						origin: null, 
						last : null, 
						speed: null, 
						delta: null
					}, 
					$iframeDeltaDirection = $settings.general.page_scrolling_direction === 'horizontal' ? 'left' : 'top', 
					$scroll               = $settings.general.page_scrolling_direction === 'horizontal' ? 'scrollLeft' : 'scrollLeft', 
					$eventPosition        = $settings.general.page_scrolling_direction === 'horizontal' ? 'screenX' : 'screenY', 
					$swipe_start          = function($event) {
						$event.preventDefault();
						
						$swipe.began = true;
						$swipe.last = $swipe.origin = $event[$eventPosition];
						$swipe.delta = $swipe.speed = 0;
					}, 
					$swipe_move           = function($event) {
						if($swipe.began) {
							$event.preventDefault();
							$swipe.speed = $event[$eventPosition] - $swipe.last;
							$swipe.last = $event[$eventPosition];
							$swipe.delta = $swipe.last - $swipe.origin;
							
							var 
								$next = $swipe.delta < 0, 
								$original_position = document_root($iframe.contentDocument)[$scroll], 
								$max_position = document_root($iframe.contentDocument)[$scroll + 'Max'], 
								$step = $iframe.contentDocument.documentElement.clientWidth, 
								$delta_step = $iframe.contentDocument.documentElement[
									$settings.general.page_scrolling_direction === 'horizontal' ? 'clientWidth' : 'clientHeight'
								], 
								$target_position = $original_position + $step * ($next ? 1 : -1), 
								$prev_swipe = $target_position < 0, 
								$next_swipe = $target_position > $max_position;
							
							if(Math.abs($swipe.delta) > 10) {
								$swipe.in_progress = true;
							}
							
							if($swipe.in_progress) {
								$event.preventDefault();
								
								var  
									$iframe_under_el = $ebook_el.querySelector(
										$prev_swipe ? 'iframe.prev' : 
										($next_swipe ? 'iframe.next' : 'iframe.current:not(.top)')
									), 
									$threshold = 0.5 * $delta_step;
								
								Array.prototype.forEach.call(
									$ebook_el.querySelectorAll('iframe.under'), 
									function($iframe) {
										$iframe.classList.remove('under');
									}
								);
								
								$iframe_under_el.classList.add('under');
								
								if($prev_swipe && $iframe_under_el.dataset.spine === undefined) {
									$swipe.delta = Math.min($swipe.delta, Math.round($delta_step/3));
								}
								
								if($next_swipe && $iframe_under_el.dataset.spine === undefined) {
									$swipe.delta = Math.max($swipe.delta, -Math.round($delta_step/3));
								}
								
								if(Math.abs($swipe.delta + $swipe.speed) > $threshold) {
									$iframe.classList.add('swiped-enough');
								}
								else {
									$iframe.classList.remove('swiped-enough');
								}
								
								document_root($iframe_under_el.contentDocument)[$scroll] = 
									document_root($iframe.contentDocument)[$scroll] + $step * ($next ? 1 : -1);
								
								$iframe.style[$iframeDeltaDirection] = $swipe.delta + 'px';
								
								if($settings.general.page_animation !== 'slide') {
									$iframe_under_el.style[$iframeDeltaDirection] = ($swipe.delta + $delta_step * ($next ? 1 : -1)) + 'px';
								}
							}
						}
					}, 
					$swipe_end            = function($event) {
						if($swipe.in_progress) {
							var 
								$prev = $swipe.delta > 0, 
								$iframe_under_el = $ebook_el.querySelector('iframe.under'), 
								$delta_step = $iframe.contentDocument.documentElement[
									$settings.general.page_scrolling_direction === 'horizontal' ? 'clientWidth' : 'clientHeight'
								], 
								$threshold = 0.5 * $delta_step, 
								$moved_enough = Math.abs($swipe.delta + $swipe.speed) > $threshold;
							
							if($moved_enough) {
								if($iframe_under_el.dataset.spine !== undefined) {
									$iframe.classList.remove('top');
									$ebook_el.querySelector('iframe.current').classList.add('top');
									window.location.hash = ebook_link_to_wr('ebook', $ebook_id, $iframe_under_el.dataset.spine, $prev ? 'lastpage' : undefined);
								}
								else {
									$iframe_under_el.classList.add('top');
									$iframe.classList.remove('top');
									
									if($settings.general.save_reading_position !== false) {
										save_reading_position($ebook_id, $ebook_spine, $ebook_hash, $settings);
									}
								}
							}
							$iframe.classList.remove('swiped-enough');
							$iframe_under_el.classList.remove('under');
							
							$iframe_under_el.style[$iframeDeltaDirection] = '';
							$iframe.style[$iframeDeltaDirection] = '';
						}
						$swipe.began = false;
						$swipe.in_progress = false;
					};
				
				$iframe.contentDocument.onmousedown = $settings.general.continuous_scrolling === false ? $swipe_start : undefined;
				$iframe.contentDocument.onmousemove = $settings.general.continuous_scrolling === false ? $swipe_move  : undefined;
				$iframe.contentDocument.onmouseup   = $settings.general.continuous_scrolling === false ? $swipe_end   : undefined;
			}, 
			$iframes = $ebook_el.querySelectorAll('iframe');
		
		if($settings.general.page_animation === 'slide') {
			$ebook_el.querySelector('.content').classList.add('uncover-pages');
		}
		else {
			$ebook_el.querySelector('.content').classList.remove('uncover-pages');
		}
		
		if($settings.general.continuous_scrolling === false) {
			var 
				$iframe_clone_el = $ebook_el.querySelector('iframe.current:not(.top)');
			
			prepare_iframe($iframe_clone_el);
			
			$ebook.prev_next(hash_change.ebook.$ebook_spine_real, function($prev, $next) {
				var 
					$style_prev = '', 
					$style_next = $settings.general.page_scrolling_direction === 'vertical' ? '<style>body {position: absolute; bottom: 0;}' : '', 
					$iframe_prev_el = $ebook_el.querySelector('iframe.prev'), 
					$iframe_next_el = $ebook_el.querySelector('iframe.next');
				
				$iframe_prev_el.contentDocument.open();
				$iframe_prev_el.contentDocument.write(($prev !== null ? 'Pull to load previous spine.' : 'You\'re at the beginning.') + $style_prev);
				$iframe_prev_el.contentDocument.close();
				
				$iframe_next_el.contentDocument.open();
				$iframe_next_el.contentDocument.write(($next !== null ? 'Pull to load next spine.' : 'You\'re done. Time to open another book.') + $style_next);
				$iframe_next_el.contentDocument.close();
				
				if($prev !== null) {
					$iframe_prev_el.dataset.spine = $prev;
				}
				else {
					delete $iframe_prev_el.dataset.spine;
				}
				
				if($next !== null) {
					$iframe_next_el.dataset.spine = $next;
				}
				else {
					delete $iframe_next_el.dataset.spine;
				}
				
				$callback();
			});
		}
		else {
			var 
				$iframe_el = $ebook_el.querySelector('iframe.top');
			
			if(hash_change.ebook.init_scrolling.prev === undefined) {
				var 
					$prev = document.createElement('a'), 
					$next = document.createElement('a');
				
				hash_change.ebook.init_scrolling.prev = $prev;
				$prev.textContent = 'prev';
				
				hash_change.ebook.init_scrolling.next = $next;
				$next.textContent = 'next';
				
				[$prev, $next].forEach(function($link) {
					$link.target = '_top';
					$link.style.display = 'block';
					$link.style.margin = '0';
					$link.style.marginTop = '0.5rem';
					$link.style.marginBottom = '0.5rem';
					$link.style.padding = '1rem';
					$link.style.textAlign = 'center';
					$link.style.fontFamily = 'monospace';
				});
			}
			
			$ebook.prev_next(hash_change.ebook.$ebook_spine_real, function($prev, $next) {
				var 
					$doc = $iframe_el.contentDocument, 
					$prev_link = hash_change.ebook.init_scrolling.prev, 
					$next_link = hash_change.ebook.init_scrolling.next;
				
				if($prev !== null) {
					$prev_link.href = '#' + ebook_link_to_wr('ebook', $ebook_id, $prev, 'lastpage');
					$doc.body.insertBefore($prev_link, $doc.body.firstChild);
				}
				if($next !== null) {
					$next_link.href = '#' + ebook_link_to_wr('ebook', $ebook_id, $next);
					$doc.body.appendChild($next_link);
				}
				
				if(typeof $onload === 'function') {
					console.log('onload....');
					$onload();
				}
				
				$callback();
			});
		}
		
		Array.prototype.forEach.call($iframes, prepare_iframe);
	};
	
	hash_change.ebook.init = function($ebook, $ebook_id, $ebook_spine, $ebook_hash, $ebook_delta, $settings, $iframe_el, $callback) {
		if($settings.general.save_reading_position !== false) {
			$iframe_el.contentDocument.onscroll = function() {
				save_reading_position($ebook_id, $ebook_spine, $ebook_hash, $settings);
			};
		}
		else {
			$iframe_el.contentDocument.onscroll = undefined;
		}
		
		Array.prototype.forEach.call(
			$ebook_el.querySelectorAll('iframe.top'), 
			function($iframe) {
				$iframe.classList.remove('top');
			}
		);
		
		$ebook_el.querySelector('iframe.current').classList.add('top');
		
		hash_change.ebook.init_scrolling($ebook, $ebook_id, $ebook_spine, $ebook_hash, $settings, $callback);
	};
	
	hash_change.ebook.return_to_reading_position = function($settings, $ebook_id, $ebook_spine, $ebook_hash, $iframe_el) {
		if($settings.general.save_reading_position) {
			var 
				$scroll = $settings.general.page_scrolling_direction === 'horizontal' ? 'scrollLeft' : 'scrollTop', 
				$delta = document_root($iframe_el.contentDocument)[$scroll];
			
			if(
				$ebook_spine === undefined && 
				$settings.general.save_reading_position !== false && 
				$settings.general.reading_position !== undefined && 
				(
					$settings.general.reading_position.spine !== $ebook_spine || 
					$settings.general.reading_position.delta !== $delta
				)
			) {
				return $settings.general.reading_position;
			}
		}
		
		return false;
	};
	
	hash_change.ebook.move_to_hash = function($iframe_el, $ebook_hash, $ebook_delta, $settings) {
		if(
			hash_change.ebook.$ebook_hash !== $ebook_hash || 
			hash_change.ebook.$ebook_delta !== $ebook_delta
		) {
			var 
				$scrollOrigin = $settings.general.continuous_scrolling === false ? 'scrollLeft' : 'scrollTop', 
				$delta        = $ebook_delta;
			
			if($delta === undefined) {
				var 
					$el = $iframe_el.contentDocument.querySelector($ebook_hash);
				
				if($el === null) {
					$el = $iframe_el.contentDocument.getElementById($ebook_hash);
				}
				
				if($el !== null) {
					var 
						$rect = $el.getClientRects()[0], 
						$original_position = document_root($iframe_el.contentDocument)[$scrollOrigin];
					
					if($settings.general.continuous_scrolling === false) {
						var 
							$step = $iframe_el.contentDocument.documentElement.clientWidth;
						
						$delta = $original_position + Math.round($rect.left / $step) * $step;
					}
					else {
						$delta = $original_position + Math.round($rect.top);
					}
				}
			}
			
			if($delta !== undefined) {
				if($delta === Infinity) {
					$delta = document_root($iframe_el.contentDocument)[$scrollOrigin + 'Max'];
				}
				
				document_root($iframe_el.contentDocument)[$scrollOrigin] = $delta;
			}
			
			hash_change.ebook.$ebook_hash  = $ebook_hash;
			hash_change.ebook.$ebook_delta = $ebook_delta;
		}
	};
	
	hash_change.ebook.make_link = function($content, $href, $ebook_id) {
		var $link = $iframe_el.contentDocument.createElement('a');
		
		hash_change.ebook.link_handler($ebook_id)($link);
		
		$link.textContent = $content;
		$link.href = $href;
		
		$link.style.display = 'block';
		$link.style.lineHeight = '2em';
		$link.style.marginTop = '2em';
		$link.style.marginBottom = '2em';
		
		$link.style.textAlign = 'center';
		
		return $link;
	};
	
	hash_change.ebook.link_handler = function($ebook_id) {
		return function($link) {
			$link.addEventListener('click', function($event) {
				if(this.nodeName === 'A') {
					$event.preventDefault();
					
					var 
						$href = this.getAttribute('href');
					
					hash_change.ebook.$ebook_hash = undefined;
					window.location.hash = ebook_link_to_wr($ebook_el.dataset.prefix, $ebook_id, $href);
				}
			});
		}
	};
	
	hash_change.ebook.render = function($iframe_el, $html, $ebook_id) {
		// $iframe_el.onload = undefined;
		
		$iframe_el.contentDocument.open();
		$iframe_el.contentDocument.write($html);
		$iframe_el.contentDocument.close();
		
		Array.prototype.forEach.call(
			$iframe_el.contentDocument.querySelectorAll('a'), 
			hash_change.ebook.link_handler($ebook_id)
		);
	};
	
	hash_change.ebook.$ebook_spine = null;

	var save_reading_position = (function() {
		var 
			$ebook, 
			$timeout = null;
		
		return function($ebook_id, $ebook_spine, $ebook_hash, $settings) {
			// only clear timeout if it's still the same book
			if($timeout !== null && $ebook === $ebook_id) {
				window.clearTimeout($timeout);
			}
			
			var 
				$scroll = $settings.general.continuous_scrolling === false ? 'scrollLeft' : 'scrollTop', 
				$iframe_el = $ebook_el.querySelector('iframe.top');
			
			$ebook = $ebook_id;
			$timeout = window.setTimeout((function($delta) {
				
				return function() {
					var 
						$hash = ebook_link_to_wr(
							'ebook', 
							$ebook_id, 
							($ebook_spine !== undefined ? $ebook_spine : '') + ($ebook_hash !== undefined ? '#' + $ebook_hash : ''), 
							$delta
						);
					
					$wr.set_settings(
						{
							'general.reading_position': {
								spine: $ebook_spine, 
								delta: $delta
							}
						}, 
						function() {}, 
						function() {alert('Can\'t save reading position.');}, 
						$ebook_id
					);
				};
			}) (document_root($iframe_el.contentDocument)[$scroll]), 1000);
		};
	}) ();
	
	var load_ebook = function($ebook_id, $callback) {
		var 
			$ebook_spine, 
			$ebook_hash, 
			$ebook_delta;
		
		[$ebook_id, $ebook_spine, $ebook_hash, $ebook_delta] = split_ebook_hash($ebook_id);
		
		if(typeof $ebook_delta === 'string') {
			if($ebook_delta === 'lastpage') {
				$ebook_delta = Infinity;
			}
			else {
				$ebook_delta = Number.toInteger($ebook_delta);
			}
		}
		
		if($ebook_id !== load_ebook.$current_ebook_id) {
			$wr.library().load($ebook_id, function($ebook) {
				load_ebook.$current_ebook = $ebook;
				load_ebook.$current_ebook_id = $ebook_id;
				
				$callback($ebook, $ebook_id, $ebook_spine, $ebook_hash, $ebook_delta);
			});
		}
		else {
			$callback(
				load_ebook.$current_ebook, 
				$ebook_id, 
				$ebook_spine, 
				$ebook_hash, 
				$ebook_delta, 
				load_ebook.$current_ebook_metadata
			);
		}
	};
	
	var render_ebooks = function($ebooks) {
		var $sorted_ebooks = $ebooks.sort(function($e1, $e2) {
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
		
		render_template('library-item', $sorted_ebooks, function($html) {
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
			});
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
	
	
	// $ebook_settings_el.querySelector('input[name=save_position]').addEventListener('change', function($event) {
	// 	$wr.set_settings(
	// 		{
	// 			save_reading_position: $event.target.checked, 
	// 			reading_position: undefined
	// 		}, 
	// 		function() {}, 
	// 		function() {
	// 			alert('Couldn\'t save preference');
	// 			this.checked = !this.checked;
	// 		}.bind(this), 
	// 		$ebook_settings_el.dataset.ebookid
	// 	);
	// });
	
	// $settings_el.querySelector('input[name=save_position]').addEventListener('change', function($event) {
	// 	$wr.set_settings(
	// 		{
	// 			save_reading_position: $event.target.checked
	// 		}, 
	// 		function() {}, 
	// 		function() {
	// 			alert('Couldn\'t save preference');
	// 			this.checked = !this.checked;
	// 		}.bind(this)
	// 	);
	// });
	
	// $ebook_settings_el.querySelector('[name=reset_save_position_setting]').addEventListener('click', function($event) {
	// 	$wr.set_settings(
	// 		{
	// 			save_reading_position: undefined, 
	// 			reading_position: undefined
	// 		}, 
	// 		function() {
	// 			$wr.get_settings(['save_reading_position'], function($settings) {
	// 				$ebook_settings_el.querySelector('input[name=save_position]').checked = $settings.general.save_reading_position === true;
	// 			}, $ebook_settings_el.dataset.ebookid);
	// 		}, 
	// 		function() {
	// 			alert('Couldn\'t save preference');
	// 		}.bind(this), 
	// 		$ebook_settings_el.dataset.ebookid
	// 	);
	// });
	
	// $settings_el.querySelector('[name=reset_save_position_setting]').addEventListener('click', function($event) {
	// 	$wr.set_settings(
	// 		{
	// 			save_reading_position: undefined
	// 		}, 
	// 		function() {
	// 			$wr.get_settings(['save_reading_position'], function($settings) {
	// 				$settings_el.querySelector('input[name=save_position]').checked = $settings.general.save_reading_position === true;
	// 			});
	// 		}, 
	// 		function() {
	// 			alert('Couldn\'t save preference');
	// 		}.bind(this)
	// 	);
	// });
	
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
		download_ebook(
			this.querySelector('input[type=url]').value, 
			this.querySelector('select[name=type]').value
		);
	});
	
	document.querySelector('#import_ebook_internet input[type=url]').addEventListener('input', function($e) {
		var 
			$type = this.value.split('.'), 
			$select = this.parentNode.querySelector('select[name=type]'), 
			$options = $select.querySelectorAll('option'), 
			$value = '';

		$type = $type[$type.length - 1].toLowerCase();

		for(var $i = 0; $i < $options.length; $i++) {
			if(
				$options[$i].value.toLowerCase() === $type || 
				$options[$i].textContent.toLowerCase() === $type
			) {
				$value = $options[$i].value;
			}
		}
		$select.value = $value;
	});
	
	Array.prototype.forEach.call(document.querySelectorAll('#import_ebook_sample a'), function($a) {
		$a.addEventListener('click', function($e) {
			$e.preventDefault();
			
			download_ebook(this.getAttribute('href'), 'application/epub+zip');
		});
	});
	
	$toc_el.querySelector('.content').addEventListener('click', function($evt) {
		if($evt.target.nodeName === 'A') {
			$evt.preventDefault();
			
			hash_change.ebook.$ebook_hash = undefined;
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
	
	// document.querySelector('.install').addEventListener('click', install);
	
	window.addEventListener('hashchange', hash_change);
	$wr.addEventListener('initied', hash_change);
	
	// OPDS.register('www.smashwords.com/atom');
	// OPDS.register('http://manybooks.net/opds/');
	// OPDS.register('www.feedbooks.com');
	// OPDS.register('http://cops-demo.slucas.fr/');
	// OPDS.register('');
	// OPDS.register('m.gutenberg.org');
	
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
