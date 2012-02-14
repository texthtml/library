"use strict";

window.WR = (function() {
	
	var 
		rect = function($el) {
			var $range = $el.ownerDocument.createRange();
			$range.selectNodeContents($el);
			return $range.getBoundingClientRect();
		}, 
		worker = new Worker('js/web-reader-worker.js'), 
		storage = function() {
			if(!('sessionStorage' in window)) {
				alert('no session storage support');
			}
			
			return window.sessionStorage;
		};
	
	worker.postMessage('start');

	$(worker).on('message', console.info);

	var WR = function($target) {
		this.$target = $target;
	};
	
	WR.prototype = {
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
					
					var $existed = typeof $ebooks[$identifier] !== 'undefined';
					$ebooks[$identifier] = {
						title     : $title, 
						language  : $language, 
						identifier: $identifier, 
						
						metadata  : $metadata, 
						
						type: $type
					};
					storage().setItem('ebook.'+$identifier, $blob);
					storage().setItem('ebooks', JSON.stringify($ebooks));
					
					var $event     = $.Event('changed');
					$event.$ebooks = $ebooks;
					$(this).trigger($event);
					
					var $event              = $.Event('stored');
					$event.$ebook           = $ebook;
					$event.$already_existed = $existed;
					$(this).trigger($event);
				};
			
			var Library = $.noop;
			Library.prototype = {
				set: function($file) {
					var 
						$ebook, 
						$event = $.Event('inserting'), 
						$inserted = function($ebook) {
							var $event = $.Event('inserted');
							$event.$ebook = $ebook;
							$(this).trigger($event);
						}.bind(this);
					$(this).trigger($event);

					var $handler = WR.handler($file.type);

					if(typeof $handler !== 'undefined') {
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
					
					var $event    = $.Event('removed');
					$event.$ebook = $identifier;
					$(this).trigger($event);
					
					var $event     = $.Event('changed');
					$event.$ebooks = $ebooks;
					$(this).trigger($event);
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
						$handler = (typeof $ebook === 'undefined')?undefined:WR.handler($ebook.type);
					
					if(typeof $handler !== 'undefined') {
						return new $handler.factory(storage().getItem('ebook.'+$identifier));
					}
				}
			};
			
			return new Library();
		} ()), 
		
		open: function($ebook) {
			var $event;
			if(
				typeof this.$ebook === 'undefined' || 
				$ebook !== this.ebook().identifier()
			) {
				this.$ebook = undefined;
				this.$href = null;
				this.$ebook_id = $ebook;
				
				$event         = $.Event('opening');
				$event.$ebook  = this.$ebook;
				$(this).trigger($event);
			}

			this.goto();
			
			if(typeof $event !== 'undefined') {
				$event         = $.Event('opened');
				$event.$ebook  = this.$ebook;
				$(this).trigger($event);
			}
		}, 
		goto: function($href, $hash, $delta) {
			if(typeof $delta === 'undefined') {
				$delta = 0;
			}
			if(typeof $href !== 'undefined' && typeof $hash === 'undefined') {
				var $pos = $href.search('#');
				if($pos !== -1) {
					$hash = $href.substr($pos);
					$href = $href.substr(0, $pos);
				}
			}
			
			var $event     = $.Event('goingto');
			$event.$href   = $href;
			$event.$hash   = $hash;
			
			$(this).trigger($event);
			
			if(this.$href !== $href) {
				this.$href = $href;
				this.$page = undefined;
				
				this.render();
			}
			
			if(typeof $hash !== 'undefined') {
				var 
					$matches = /(.*):text\((\d*)\)/.exec($hash), 
					$el;

				if($matches === null) {
					$el = $($hash, this.$iframe.contentDocument).get(0);
				}
				else {
					$el = $($matches[1], this.$iframe.contentDocument)
					.contents().filter(function() {
						return this.nodeType === 3;
					})[$matches[2]];
				}
					
				var 
					$r = rect($el), 
					$offset = Math.floor($r.top-$r.height*$delta);
				console.log($hash, $el, $r, $offset);
				$(this.$iframe.contentDocument).scrollTo(
					'+='+$offset+'px', 
					250
				);
			}
			
			var $event     = $.Event('goneto');
			$event.$href   = this.$href;
			$event.$page   = this.$page;
			$event.$hash   = $hash;
			
			$(this).trigger($event);
		}, 
		href: function($href) {
			return this.$href;
		}, 
		page: function() {
			if(typeof this.$page === 'undefined') {
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
			if(typeof this.$ebook === 'undefined') {
				this.$ebook = this.library.get(this.$ebook_id);
			}
			return this.$ebook;
		}, 
		render_toc: function($target) {
			return $(this.ebook().toc().content()).appendTo($target);
		}, 	
		render: function() {
			this.$iframe = document.createElement("iframe");
			
			this.$target.empty().append(this.$iframe);
			
			this.$iframe.contentDocument.open();
			this.$iframe.contentDocument.write(this.page().html());
			this.$iframe.contentDocument.close();
			
			$(this.$iframe.contentDocument).on('scroll', this.save_position.bind(this));
			
			var $event     = $.Event('rendered');
			$event.$ebook  = this.$ebook;
			$event.$href   = this.$href;
			$event.$page   = this.$page;
			$event.$iframe = this.$iframe;
			
			$(this).trigger($event);
		}, 	
		
		save_position: function() {
			var 
				top_in_viewport = function($el) {
					var $nodes;
					
					do {
						$nodes = $el.contents().filter(function() {
							var $rect = rect(this);
							
							return $rect.top < window.innerHeight && $rect.bottom > 0;
						});
					
						var $e = $.makeArray($nodes).reduce(function($previous, $current) {
							if(typeof $previous === 'undefined') {
								return $current;
							}
							
							var 
								$top_previous = rect($previous).top, 
								$top_current = rect($current).top;
							
							return ($top_current < $top_previous)?$current:$previous;
						}, undefined);
						
						if(typeof $e !== 'undefined') {
							$el = $($e);
						}
					} while(typeof $e !== 'undefined');
					
					return $el;
				}, 
				_save_position = function() {
					var 
						$iframe = this.$iframe.contentDocument,
						$el = top_in_viewport($('body', $iframe)), 
						$rect = rect($el.get(0)), 
						$path = $el.getPath();
					if(typeof $path === 'undefined') {
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

	var $ebook_handlers = {};

	WR.register = function($mime, $handler, $name) {
		$ebook_handlers[$mime] = {
			factory: $handler, 
			name   : $name
		};
	}

	WR.handler = function($mime) {
		return $ebook_handlers[$mime];
	}

	return WR;
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
