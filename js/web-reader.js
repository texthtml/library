
window.WR = (function() {
	"use strict";
	
	var Trigger = {
		addEventListener: function($event_name, $callback) {
			if(this.event_listeners === undefined) {
				this.event_listeners = {};
			}
			
			if(this.event_listeners[$event_name] === undefined) {
				this.event_listeners[$event_name] = [];
			}
			
			this.event_listeners[$event_name].push($callback);
		}, 
		
		trigger: function($evt) {
			if(this.event_listeners === undefined) {
				return;
			}
			
			if(this.event_listeners[$evt.type] === undefined) {
				return;
			}
			
			this.event_listeners[$evt.type].forEach(function($callback) {
				$callback.call(this, $evt);
			});
		}
	};

	var 
		rect = function($el) {
			var $range = $el.ownerDocument.createRange();
			$range.selectNodeContents($el);
			return $range.getBoundingClientRect();
		}, 
		storage = function() {
			if(!('sessionStorage' in window)) {
				alert('no session storage support');
			}
			
			return window.sessionStorage;
		}, 
		$ebook_handlers = {};
	
	return {
		register: function($mime, $handler, $name) {
			$ebook_handlers[$mime] = {
				factory: $handler, 
				name   : $name
			};
		}, 
		
		handler: function($mime) {
			return $ebook_handlers[$mime];
		}, 
		
		addEventListener: Trigger.addEventListener, 
		trigger: Trigger.trigger, 
		
		library: (function() {
			
			var 
				ebooks = function() {
					var $ebooks = storage().getItem('ebooks');
					
					if($ebooks === null) {
						$ebooks = {};
					}
					else {
						$ebooks = JSON.parse($ebooks);
					}
					
					return $ebooks;
				}, 
				store_ebook = function($ebook, $type) {
					var 
						$identifier = $ebook.identifier().value, 
						$title      = $ebook.title(), 
						$language   = $ebook.language(), 
						$blob       = $ebook.blob(), 
						
						$metadata   = $ebook.metadata(), 
						
						$ebooks     = ebooks();
					
					var $existed = $ebooks[$identifier] !== undefined;
					$ebooks[$identifier] = {
						title     : $title, 
						language  : $language, 
						identifier: $identifier, 
						
						metadata  : $metadata, 
						
						type: $type
					};
					storage().setItem('ebook.'+$identifier, $blob);
					storage().setItem('ebooks', JSON.stringify($ebooks));
					
					var $event     = new Event('changed');
					$event.$ebooks = this.list(true);
					this.trigger($event);
					
					var $event              = new Event('stored');
					$event.$ebook           = $ebook;
					$event.$already_existed = $existed;
					this.trigger($event);
				};
			
			var Library = {
		
				addEventListener: Trigger.addEventListener, 
				trigger: Trigger.trigger, 
				
				set: function($file) {
					var 
						$ebook, 
						$event = new Event('inserting'), 
						$inserted = function($ebook) {
							var $event = new Event('inserted');
							$event.$ebook = $ebook;
							this.trigger($event);
						}.bind(this);
					this.trigger($event);

					var $handler = WR.handler($file.type);

					if($handler !== undefined) {
						var $reader = new FileReader();
						
						$reader.onloadend = function($e) {
							$ebook = new $handler.factory($e.target.result);
							
							store_ebook.call(this, $ebook, $file.type);

							$inserted($ebook);
						}.bind(this);
						
						$reader.readAsBinaryString($file);
					}
				}, 
				
				del: function($identifier) {
					var 
						$ebooks     = ebooks();
					
					delete $ebooks[$identifier];
					storage().setItem('ebooks', JSON.stringify($ebooks));
					
					var $event    = new Event('removed');
					$event.$ebook = $identifier;
					this.trigger($event);
					
					var $event     = new Event('changed');
					$event.$ebooks = this.list(true);
					this.trigger($event);
				}, 
				
				list: function($array) {
					if($array !== true) {
						return ebooks();
					}
					
					var 
						$ebooks = ebooks(), 
						$res = [];
					for(var $i in $ebooks) {
						$ebooks[$i].creators = $ebooks[$i].metadata.creator;
						$res.push($ebooks[$i]);
					}
					
					return $res;
				}, 
				
				exists: function($identifier) {
					return ebooks()[$identifier] !== undefined;
				}, 
				
				get: function($identifier) {
					var 
						$ebook = ebooks()[$identifier], 
						$handler = ($ebook === undefined)?undefined:WR.handler($ebook.type);
					
					if($handler !== undefined) {
						return new $handler.factory(storage().getItem('ebook.'+$identifier));
					}
				}, 
				
				load: function() {
					var $event     = new Event('loaded');
					$event.$ebooks = this.list(true);
					this.trigger($event);
				}
			};
			
			return Object.create(Library);
		} ()), 
		
		open: function($target, $ebook) {
			var $event;
			if(
				this.$ebook === undefined || 
				$ebook !== this.ebook().identifier()
			) {
				this.$ebook = undefined;
				this.$href = null;
				this.$ebook_id = $ebook;
				
				$event         = new Event('opening');
				$event.$ebook  = this.ebook();
				this.trigger($event);
			}

			this.goto($target);
			
			if($event !== undefined) {
				$event         = new Event('opened');
				$event.$ebook  = this.$ebook;
				this.trigger($event);
			}
		}, 
		
		goto: function($target, $href, $hash, $delta) {
			if($delta === undefined) {
				$delta = 0;
			}
			if($href !== undefined && $hash === undefined) {
				var $pos = $href.search('#');
				if($pos !== -1) {
					$hash = $href.substr($pos);
					$href = $href.substr(0, $pos);
				}
			}
			
			var $event     = new Event('goingto');
			$event.$href   = $href;
			$event.$hash   = $hash;
			
			this.trigger($event);
			
			if(this.$href !== $href) {
				this.$href = $href;
				this.$page = undefined;
				
				this.render($target);
			}
			
			if($hash !== undefined) {
				var 
					$matches = /(.*):text\((\d*)\)/.exec($hash), 
					$el;

				if($matches === null) {
					$el = this.$iframe.contentDocument.querySelector($hash);
				}
				else {
					//~ TODO 
					console.warn('what am I doing here?', $hash, $matches);
					debugger;
					$el = $(this.$iframe.contentDocument.querySelector($matches[1]))
					.contents().filter(function() {
						return this.nodeType === 3;
					})[$matches[2]];
				}
				
				this.$iframe.contentDocument.documentElement.scrollTop = $el.offsetTop + $delta;
			}
			
			var $event   = new Event('goneto');
			$event.$href = this.$href;
			$event.$page = this.$page;
			$event.$hash = $hash;
			
			this.trigger($event);
		}, 
		
		href: function($href) {
			return this.$href;
		}, 
		
		page: function() {
			if(this.$page === undefined) {
				this.$page = this.ebook().page(this.$href);
			}
			
			return this.$page;
		}, 
		
		next: function() {
			return this.page().next()
		}, 
		
		prev: function() {
			return this.page().prev()
		}, 
		
		go_next: function() {
			this.goto(this.next());
		}, 
		
		go_prev: function() {
			this.goto(this.prev());
		}, 
		
		ebook: function() {
			if(this.$ebook === undefined) {
				this.$ebook = this.library.get(this.$ebook_id);
			}
			return this.$ebook;
		}, 
		
		render_toc: function($target) {
			$target.innerHTML = this.ebook().toc().content();
			return $target;
		}, 
		
		render: function($target) {
			this.$iframe = document.createElement("iframe");
			
			$target.innerHTML = '';
			$target.appendChild(this.$iframe);
			
			this.$iframe.contentDocument.open();
			this.$iframe.contentDocument.write(this.page().html());
			this.$iframe.contentDocument.close();
			
			this.$iframe.contentDocument.addEventListener(
				'scroll', 
				this.save_position.bind(this)
			);
			
			var $event     = new Event('rendered');
			$event.$ebook  = this.$ebook;
			$event.$href   = this.$href;
			$event.$page   = this.$page;
			$event.$iframe = this.$iframe;
			
			this.trigger($event);
		}, 	
		
		save_position: function() {
			var 
				top_in_viewport = function($el) {
					var $nodes;
					
					//~ TODO
					console.warn('see #25');
					return;
					do {
						$nodes = $el.contents().filter(function() {
							var $rect = rect(this);
							
							return $rect.top < window.innerHeight && $rect.bottom > 0;
						});
					
						var $e = $.makeArray($nodes).reduce(function($previous, $current) {
							if($previous === undefined) {
								return $current;
							}
							
							var 
								$top_previous = rect($previous).top, 
								$top_current = rect($current).top;
							
							return ($top_current < $top_previous)?$current:$previous;
						}, undefined);
						
						if($e !== undefined) {
							$el = $($e);
						}
					} while($e !== undefined);
					
					return $el;
				}, 
				_save_position = function() {
					//~ TODO
					console.warn('see #25');
					return;
					
					var 
						$iframe = this.$iframe.contentDocument,
						$el = top_in_viewport($iframe.body), 
						$rect = rect($el.get(0)), 
						$path = $el.getPath();
					if($path === undefined) {
						$path = 
							$el.parent().getPath() + 
							':text(' + 
								$el.parent().contents().filter(function() {
									return this.nodeType === 3;
								})
								.index($el.get(0)) + 
							')';
					}
					
					console.info($path, $rect.top/$rect.height);
				};
			return function() {
				clearTimeout(this.$save_position_timeout);
				this.$save_position_timeout = setTimeout(_save_position.bind(this), 500);
			};
		} ()
	};
} ());


/*
EBook = $.noop;

EBook.prototype = {
	identifier: $.noop, 
	title     : $.noop, 
	language  : $.noop, 
	
	blob      : $.noop
}
*/


/*
jQuery.fn.getPath = function() {
	if(this.length != 1) throw 'Requires one element.';
	
	var path, node = this;
	while(node.length) {
		var realNode = node[0], name = realNode.localName;
		if(!name) break;
		
		name = name.toLowerCase();
		if(realNode.id) {
			// As soon as an id is found, there's no need to specify more.
			return name + '#' + realNode.id  + (path ? '>' + path : '');
		}
		else if(realNode.className) {
			name += '.' + realNode.className.split(/\s+/).join('.');
		}
		
		var parent = node.parent(), siblings = parent.children(name);
		if(siblings.length > 1) name += ':eq(' + siblings.index(node) + ')';
		path = name + (path ? '>' + path : '');
		
		node = parent;
	}
	
	return path;
};
*/
