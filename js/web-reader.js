(function($scope) {
	'use strict';
		
	var Library = (function() {
		
		var $db;
		
		return {
			init: function() {
				var $request = indexedDB.open('library', 1);
				
				$request.addEventListener('success', function($event) {
					var $ebooks = [];
					$db = $event.target.result;
					
					this.trigger('initied');
					
					var $transaction = $db.transaction('metadata');
					$transaction.addEventListener('complete', function() {
						this.trigger('changed', {
							$ebooks: $ebooks
						});
					}.bind(this));
					
					$transaction.objectStore('metadata').openCursor().addEventListener('success', function($event) {
						var $cursor = $event.target.result;
						
						if($cursor !== null && $cursor !== undefined) {
							$ebooks.push($cursor.value);
							$cursor.continue();
						}
					});
				}.bind(this));
				
				
				$request.addEventListener('upgradeneeded', function($event) {
					switch($event.oldVersion) {
						case 0:
							this.result.createObjectStore('files');
							this.result.createObjectStore('metadata');
							this.result.createObjectStore('settings');
					}
				});
			}, 
			
			identifiers: function($callback) {
				var 
					$identifiers = [], 
					$transaction = $db.transaction('metadata');
				
				$transaction.addEventListener('complete', function() {
					$callback($identifiers);
				});
				
				$transaction.objectStore('metadata').openCursor().addEventListener('success', function($event) {
					var $cursor = $event.target.result;
					
					if($cursor !== null && $cursor !== undefined) {
						$identifiers.push($cursor.key);
						$cursor.continue();
					}
				});
			}, 
			
			list: function($callback) {
				var 
					$ebooks = {}, 
					$transaction = $db.transaction('metadata');
				
				$transaction.addEventListener('complete', function() {
					$callback($ebooks);
				});
				
				$transaction.objectStore('metadata').openCursor().addEventListener('success', function($event) {
					var $cursor = $event.target.result;
					
					if($cursor !== null && $cursor !== undefined) {
						$ebooks[$cursor.key] = $cursor.value;

						$cursor.continue();
					}
				});
			}, 
			
			delete: function($identifier) {
				var 
					$transaction = $db.transaction(['metadata', 'files'], 'readwrite'), 
					$ebooks = [];
				
				$transaction.addEventListener('complete', function() {
					this.trigger('deleted', {
						$identifier: $identifier
					});
					
					this.trigger('changed', {
						$ebooks: $ebooks
					});
				}.bind(this));
				
				$transaction.objectStore('metadata').delete($identifier);
				$transaction.objectStore('files').delete($identifier);
				$transaction.objectStore('metadata').openCursor().addEventListener('success', function($event) {
					var $cursor = $event.target.result;
					
					if($cursor !== null && $cursor !== undefined) {
						$ebooks.push($cursor.value);
						$cursor.continue();
					}
				});
			}, 
			
			save: function($identifier, $metadata, $blob) {
				this.trigger('adding');
				
				var 
					$transaction = $db.transaction(['metadata', 'files'], 'readwrite'), 
					$ebooks      = [];
				
				$metadata.identifier.value = $identifier;
				$metadata.type = $blob.type;
				
				$transaction.addEventListener('complete', function() {
					this.trigger('added', {
						$identifier: $identifier, 
						$metadata  : $metadata
					});
					
					this.trigger('changed', {
						$ebooks: $ebooks
					});
				}.bind(this));
				
				$transaction.objectStore('metadata').put($metadata, $identifier);
				$transaction.objectStore('files').put($blob, $identifier);
				$transaction.objectStore('metadata').openCursor().addEventListener('success', function($event) {
					var $cursor = $event.target.result;
					
					if($cursor !== null && $cursor !== undefined) {
						$ebooks.push($cursor.value);
						$cursor.continue();
					}
				});
			}, 
			
			load: function($identifier, $callback) {
				var 
					$metadata, 
					$blob, 
					$transaction = $db.transaction(['metadata', 'files'], 'readonly'), 
					$file_request = $transaction.objectStore('files').get($identifier), 
					$metadata_request = $transaction.objectStore('metadata').get($identifier);

				$file_request.addEventListener('success', function($event) {
					$blob = $event.target.result;
				});
				$metadata_request.addEventListener('success', function($event) {
					$metadata = $event.target.result;
				});
				$transaction.addEventListener('complete', function() {
					var 
						$handler, 
						$ebook;
					
					if($metadata !== undefined) {
						$handler = WR.handler($metadata.type);
					}
					if($handler !== undefined && $blob !== undefined) {
						$ebook = $handler.factory($blob);
					}
					$callback($ebook, $metadata);
				});
			}, 
			
			metadata: function($identifier, $callback) {
				var $transaction = $db.transaction(['metadata'], 'readonly');
				
				$transaction.objectStore('metadata').get($identifier).addEventListener('success', function($event) {
					$callback($event.target.result);
				});
			}, 
			
			get_ebook_settings: function($identifier, $callback) {
				var $transaction = $db.transaction(['settings'], 'readonly');
				
				$transaction.objectStore('settings').get($identifier).addEventListener('success', function() {
					$callback(this.result || {});
				});
			}, 
			
			set_ebook_settings: function($identifier, $settings, $callback, $error) {
				var 
					$transaction = $db.transaction(['settings'], 'readwrite'), 
					$new_settings;
				
				$transaction.addEventListener('complete', function() {
					if(typeof $callback === 'function') {
						$callback($new_settings);
					}
				}.bind(this));
				
				$transaction.objectStore('settings').get($identifier).addEventListener('success', function() {
					$new_settings = (this.result || {});
					for(var $name in $settings) {
						$new_settings[$name] = $settings[$name];
					}

					$transaction.objectStore('settings').put($new_settings, $identifier);
				});
			}, 
			
			addEventListener: Trigger.addEventListener, 
			trigger: Trigger.trigger
		};
	}) ();

	$scope.WR = (function() {
		
		var 
			$library, 
			$ebook_identifier, 
			$ebook, 
			$ebook_handlers = {}, 
			$default_settings_def = [{
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
			}], 
			set_default_settings_def = function() {
				window.wr = this;
				add_settings_def.call(this, this.default_settings, 'general', 'General');
			}, 
			add_settings_def = function($settings_def, $category, $category_label) {
				if(this.$settings_def === undefined) {
					this.$settings_def = {};
					set_default_settings_def.call(this);
				}
				
				if(this.$settings_def[$category] === undefined) {
					this.$settings_def[$category] = {
						label: $category_label, 
						list: $settings_def.map(function($setting_def) {
							$setting_def.category = $category;
							return $setting_def;
						})
					};
				}
				
			}, 
			open = function($ebook, $spine, $hash) {
				this.trigger('open', {
					$metadata: $ebook.metadata(), 
					$ebook: $ebook, 
					$spine: $spine, 
					$hash: $hash
				});
			};
		
		return {
			init: function() {
				this.library().addEventListener('initied', function() {
					this.trigger('initied');
				}.bind(this));

				this.library().init();
			}, 
			
			formats: function() {
				var $formats = {};
				
				for(var $mime in $ebook_handlers) {
					$formats[$mime] = $ebook_handlers[$mime].name;
				}
				
				return $formats;
			}, 
			
			register: function($mime, $handler, $name) {
				$ebook_handlers[$mime] = {
					factory: $handler, 
					name   : $name
				};
				
				if(typeof $handler.settings_def === 'function') {
					add_settings_def($handler.settings_def(), $name);
				}
			}, 
			
			handler: function($mime) {
				return $ebook_handlers[$mime];
			}, 
			
			build: function($file) {
				var $handler = $scope.WR.handler($file.type);
				
				if($handler !== undefined) {
					return $handler.factory($file);
				}
			}, 
			
			library: function() {
				if($library === undefined) {
					$library = Object.create(Library);
				}
				
				return $library;
			}, 
			
			open: function($identifier, $spine, $hash) {
				if($ebook_identifier === $identifier) {
					open($ebook, $spine, $hash).bind(this);
				}
				else {
					this.library().load($identifier, function($ebook) {
						open.call(this, $ebook, $spine, $hash);
					}.bind(this));
				}
			}, 
			
			settings_def: function($category) {
				if(this.$settings_def === undefined) {
					this.$settings_def = {};
					set_default_settings_def.call(this);
				}
				
				return this.$settings_def;
			}, 
			
			get_settings: function($settings, $callback, $ebook_id) {
				var 
					$settings_def = this.settings_def(), 
					$default = {};
				
				for(var $category_id in $settings_def) {
					for(var $i = 0; $i < $settings_def[$category_id].list.length; $i++) {
						var $setting_def = $settings_def[$category_id].list[$i];
						$default[$category_id + '.' + $setting_def.name] = $setting_def.default_value;
					}
				}
				
				
				this.library().get_ebook_settings(0, function($wr_settings) {
					var 
						$return_settings = function($ebook_settings) {
							var 
								$name, 
								$results = {};
							
							if($settings !== undefined) {
								for(var $i = 0; $i < $settings.length; $i++) {
									$name = $settings[$i];
									$results[$name] = $ebook_settings[$name] === undefined ? $wr_settings[$name] : $ebook_settings[$name];
								}
							}
							else {
								for($name in $wr_settings) {
									$results[$name] = $wr_settings[$name];
								}
								for($name in $ebook_settings) {
									$results[$name] = $ebook_settings[$name];
								}
							}
							for(var $fullname in $results) {
								var $category = $fullname.split('.', 2)[0];
								$name = $fullname.slice($category.length+1);
								if($results[$category] === undefined) {
									$results[$category] = {};
								}
								$results[$category][$name] = $results[$fullname];
								delete $results[$fullname];
							}
							$callback($results);
						};
					
					for(var $name in $default) {
						if($wr_settings[$name] === undefined) {
							$wr_settings[$name] = $default[$name];
						}
					}
					
					if($ebook_id === undefined) {
						$return_settings({});
					}
					else {
						this.library().get_ebook_settings($ebook_id, $return_settings);
					}
				}.bind(this));
			}, 
			
			set_settings: function($settings, $callback, $error, $ebook_id) {
				if($ebook_id === undefined) {
					this.library().set_ebook_settings(0, $settings, $callback, $error);
				}
				else {
					this.library().set_ebook_settings($ebook_id, $settings, $callback, $error);
				}
			}, 
			
			addEventListener: Trigger.addEventListener, 
			trigger: Trigger.trigger
		};
	} ());
	
}) (window);
