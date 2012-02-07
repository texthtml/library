"use strict";

$(function() {
	var WebReader = new WR($('#ebook'));
	
	var list_ebooks = function() {
		var $ebooks = WebReader.library.list(true).sort(function($e1, $e2) {
			var 
				$s1 = 
					$($e1.metadata.creator).map(function($i, $e) {return $e.value}).sort().toArray().join(' ')+' '+
					($e1.metadata.series?$e1.metadata.series.value:'')+' '+
					($e1.metadata.series_index?$e1.metadata.series_index.value:'')+' '+
					$e1.metadata.title.value;
			var 
				$s2 = 
					$($e2.metadata.creator).map(function($i, $e) {return $e.value}).sort().toArray().join(' ')+' '+
					($e2.metadata.series?$e2.metadata.series.value:'')+' '+
					($e2.metadata.series_index?$e2.metadata.series_index.value:'')+' '+
					$e2.metadata.title.value;
			
			return $s1.localeCompare($s2);
		});
		
		$('#library_filter input[name=filter]').val('');
		$('#library .inner > ul').html(
			$('#library-item').render($ebooks)
		);
	};
	
	var hash_change = function($evt) {
		if(window === window.top) {
			var 
				$hash = window.location.hash.substr(1), 
				$pos = $hash.search('/'), 
				$prefix = $hash.substr(0, $pos), 
				$ebook = $hash.substr($pos + 1);
			
			if($pos != -1) {
				WebReader.open($ebook, null);
			}
			
			if($prefix === 'library' || $pos === -1) {
				hash_change.move_pane();
			}
		}
	};
	hash_change.move_pane = function() {
		var 
			$hash = window.location.hash.substr(1), 
			$pos = $hash.search('/'), 
			$prefix = $hash.substr(0, $pos);
		
		if($prefix === 'ebook') {
			$toc.close();
		}
		else if($prefix === 'toc') {
			$toc.open();
			$library.close();
		}
		else {
			$library.open();
		}
	};
	
	var Pane = function($target, $delta, $parent, $close_callback) {
		if(typeof $close_callback === 'undefined') {
			$close_callback = this.close;
		}
		this.$target = $($target)
			.on('click', function($evt) {
				if($evt.target === this.$target.get(0)) {
					$close_callback.call(this, $evt);
				}
			}.bind(this))
			.on('mouseover', this.clear.bind(this))
			.wrapInner('<div class="wrap"><div class="inner"/></div>');
		this.$target.children('.wrap')
			.on('click', function($evt) {
				if($evt.target === this.$target.children('.wrap').get(0)) {
					this.open();
				}
			}.bind(this));
		this.$delta  = $delta;
		if(typeof $parent !== 'undefined') {
			this.$parent = $parent;
			$parent.$child = this;
		}
		
		this.$state = 'open';
	};
	
	Pane.prototype = {
		delta: function($child) {
			if($child === true) {
				if(typeof this.$child !== 'undefined') {
					return this.$delta + this.$child.delta($child);
				}
			}
			else if(typeof this.$parent !== 'undefined') {
				return this.$delta + this.$parent.delta($child);
			}
			return this.$delta;
		}, 
		delta_px: function($child) {
			return this.delta($child) * parseFloat(this.$target.css('font-size'));
		}, 
		height: function($height, $wrap_height) {
			if(typeof $height === 'undefined') {
				$height = this.delta_px();
			}
			if(typeof $wrap_height === 'undefined') {
				$wrap_height = 0;
			}
			
			//~ console.log(this.$target, $height, this.$target.children('.wrap'), $height+$wrap_height);
			this.$target
				.animate({height: $height}, 'slow')
				.children('.wrap').animate({height: $height+$wrap_height}, 'slow');
		}, 
		close: function($donthide) {
			if(this.$state !== 'closed') {
				this.$state = 'closed';
				//~ console.group('close', this.$target);
				if(typeof this.$parent !== 'undefined') {
					this.$parent.close(true);
				}
				
				this.height();
				
				if($donthide !== true) {
					this.delay_hide();
				}
				
				var $event = $.Event('closed');
				$(this).trigger($event);
				//~ console.groupEnd();
			}
		}, 
		reveal: function($hide) {
			if(this.$state !== 'closed') {
				this.$state = 'closed';
				//~ console.group('reveal', this.$target);
				this.clear_reveal();
				if(typeof this.$parent !== 'undefined') {
					this.$parent.reveal(false);
				}
				this.height();
				
				if($hide !== false) {
					this.delay_hide();
				}
		//		var $event = $.Event('closed');
		//		$(this).trigger($event);
				//~ console.groupEnd();
			}
		}, 
		delay_reveal: function($delay) {
			if(this.$state !== 'closed' && typeof this.$reveal_timeout === 'undefined') {
				//~ console.log('delay_reveal', this.$target)
				this.$reveal_timeout = window.setTimeout($.proxy(this.reveal, this), 200);
			}
			this.delay_hide();
		}, 
		clear_reveal: function() {
			//~ console.log('clear_reveal', this.$target);
			window.clearTimeout(this.$reveal_timeout);
			this.$reveal_timeout = undefined;
		}, 
		hide: function() {
			this.clear();
			if(this.$state !== 'hidden' && (typeof this.$child === 'undefined' || this.$child.$state === 'hidden')) {
				this.$state = 'hidden';
				//~ console.group('hide', this.$target)
				if(typeof this.$parent !== 'undefined') {
					this.$parent.hide();
				}
				
				this.height(0);
				var $event = $.Event('hidden');
				$(this).trigger($event);
				//~ console.groupEnd();
			}
		}, 
		delay_hide: function($delay) {
			this.clear_hide();
			//~ console.log('delay_hide', this.$target);
			this.$hide_timeout = window.setTimeout(this.hide.bind(this), 700);
		}, 
		clear_hide: function() {
			//~ console.log('clear_hide', this.$target);
			window.clearTimeout(this.$hide_timeout);
			this.$hide_timeout = undefined;
		}, 
		
		clear: function() {
			//~ console.group('clear', this.$target);
			if(typeof this.$child !== 'undefined') {
				this.$child.clear();
			}
			this.clear_hide();
			this.clear_reveal();
			//~ console.groupEnd();
		}, 
		
		open: function() {
			//~ console.group('open', this.$target)
			if(typeof this.$child !== 'undefined') {
				this.$child.open();
			}
			
			this.clear();
			
			this.height($(window).height(), -this.delta_px(true));
			
			this.$state = 'open';

			var $event = $.Event('opened');
			$(this).trigger($event);
			//~ console.groupEnd();
		}
	};
	
	var 
		$library = new Pane('#library', 3, undefined, function() {
			window.location.hash = window.location.hash.replace(/^#library\//, '#toc/');
		}), 
		$toc = new Pane('#toc', 3, $library, function() {
			window.location.hash = window.location.hash.replace(/^#toc\//, '#ebook/');
		});
	
	var ebook_link = function($evt) {
		$evt.preventDefault();
		
		var $href = $($evt.target).attr('href');
		
		window.setTimeout(
			function() {WebReader.goto($href);}, 0
		);
	}
	
	var toc_link = function($evt) {
		$evt.preventDefault();
		WebReader.goto($($evt.currentTarget).siblings('content').attr('src'))
	}

	var filter_library = function($evt) {
		if(typeof $evt === 'undefined') {
			$evt.preventDefault();
		}
		
		var $filter = $('#library_filter input[name=filter]').val().trim().toLowerCase();
		
		if($filter === '') {
			$('#library li').show();
		}
		else {
			$('#library li:contains("' + $filter + '")').show();
			$('#library li:not(:contains("' + $filter + '"))').hide();
		}
	}

	var background = function($fct) {
		return function() {
			var $args = arguments;
			window.setTimeout(
				function() {
					$fct.apply(this, $args);
				}.bind(this), 
				0
			);
		}
	};

	$('#add_ebook').on('submit', background(function($e) {
		$e.preventDefault();
		var $file = $('input[type=file]', this).get(0).files[0];
		WebReader.library.set($file);
	}));
	
	$($library).on('opened', function() {
		$('#library_filter input[name=filter]').select();
	});

	$(document)
		.on('click', '#toc navLabel', background(toc_link))
		.on('click', '#library button[name=delete]', background(function($e) {
			$e.preventDefault();
			WebReader.library.del($($e.target).parent().parent().attr('id'));
		}));
	$(window).on('hashchange', background(hash_change));
	$(WebReader)
		.on('opening', function($evt) {
			$('#library').addClass('loading');
		})
		.on('opened', function($evt) {
			$('#library').removeClass('loading');
			WebReader.render_toc($('#toc > .wrap > .inner').empty());
		})
		.on('goingto', function($evt) {
		})
		.on('goneto', function($evt) {
			hash_change.move_pane();
		})
		.on('rendered', function($evt) {
			var 
				$iframe = $evt.$iframe.contentDocument, 
				$next = WebReader.next();
			
			if(typeof $next !== 'undefined') {
				$('<a class="web-reader next" href="'+$next+'">next</a>')
					.css({
						display: 'block', 
						borderTop: '1px solid lightgray', 
						backgroundColor: 'rgba(0, 0, 0, 0.01)', 
						lineHeight: '5em', 
						paddingBottom: '6em', 
						textAlign: 'center', 
						textDecoration: 'none', 
						marginTop: '50%', 
						position: 'absolute', 
						left: '0', 
						right: '0'
					})
					.appendTo($('body', $iframe));
				
				$('html', $iframe).on('mousemove', $toc.delay_reveal.bind($toc));
				$('a', $iframe).on('click', ebook_link);
			}
		});
	$(WebReader.library)
		.on('inserting', function() {
			$('#library').addClass('loading');
		})
		.on('inserted', function() {
			$('#library').removeClass('loading');
		})
		.on('changed', list_ebooks)
		.on('stored', function($evt) {
			$('#'+$evt.$ebook.identifier().value+' a').focus();
		});
	$('#ebook').on('mousemove', $toc.delay_reveal.bind($toc));

	$('#library_filter')
		.on('input', filter_library)
		.on('submit', function($evt) {$evt.preventDefault();});
	
	background(list_ebooks)();
	background(hash_change)();
});


jQuery.fn.getPath = function() {
	if(this.length != 1) throw 'Requires one element.';
	
	var path, node = this;
	while(node.length) {
		var realNode = node[0], name = realNode.localName;
		if(!name) break;
		
		name = name.toLowerCase();
		if(realNode.id) {
			// As soon as an id is found, there's no need to specify more.
			return name + '#' + realNode.id + (path ? '>' + path : '');
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
