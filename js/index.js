"use strict";

$(function() {
	$('#add_ebook').submit(function($e) {
		$e.preventDefault();
		var $file = $('input[type=file]', this).get(0).files[0];
		WebReader.library.set($file);
	});
	
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
				$prefix = $hash.split('/')[0], 
				$ebook = $hash.substr(1 + $prefix.length);
			
			if($prefix === 'ebook') {
				$toc.close();
			}
			
			if($ebook !== '') {
				render_ebook($ebook);
			}
			else {
				$library.open();
			}
		}
	};
	
	var goto_ebook = function() {
		window.location.hash = $('nav a[idref=ebook]').attr('href');
	};
	
	var Pane = function($target, $delta, $parent) {
		this.$target = $($target)
			.on('click', function($evt) {
				// console.log($evt.target === this.$target, $evt.target, this.$target);
				if($evt.target === this.$target.get(0)) {
					this.close();
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
		$library = new Pane('#library', 3), 
		$toc = new Pane('#toc', 3, $library);
	
	
	var next_page = function() {
		var 
			$ebook = WebReader.ebook(), 
			$page = WebReader.current_page().next();
		
		render_ebook($ebook, $page);
	};
	
	var prev_page = function() {
		var 
			$ebook = WebReader.ebook(), 
			$page = WebReader.current_page().prev();
		
		render_ebook($ebook, $page);
	};
	
	var render_ebook = function($ebook, $href) {
		if(typeof $ebook === 'string') {
			$ebook = WebReader.library.get($ebook);
		}
		
		var $hash;
		
		if(typeof $href !== 'undefined') {
			var $pos = $href.search('#');
			if($pos !== -1) {
				$hash = $href.substr($pos);
				$href = $href.substr(0, $pos);
			}
		}
		
		var $page = WebReader.page($ebook, $href);
		
		$('#toc > .wrap > .inner').empty().append(WebReader.render_toc($ebook));
		var $iframe = $(WebReader.render_page($page, $('#ebook').empty())).contents().get(0);
		$('html', $iframe).on('mousemove', $toc.delay_reveal.bind($toc));
		
		var $next = WebReader.current_page().next()
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
		}
		
		$('a', $iframe).on('click', ebook_link);
		
		if(typeof $hash !== 'undefined') {
			$($iframe).scrollTo($hash, 250);
		}
		
		$('nav a[idref=toc]').attr('href', '#toc/'+$ebook.identifier());
		
		var $hash = '#ebook/'+$ebook.identifier();
		$('nav a[idref=ebook]').attr('href', $hash);
	};
	
	var ebook_link = function($evt) {
		$evt.preventDefault();
		
		var $href = $($evt.target).attr('href');
		
		window.setTimeout(
			function() {render_ebook(WebReader.ebook(), $href)}, 0
		);
	}
	
	var toc_link = function($evt) {
		$($evt.target).attr(
			'href', 
			$($evt.currentTarget).siblings('content').attr('src')
		);
		ebook_link($evt);
		
		$toc.close();
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
	
	$($library).on('opened', function() {
		$('#library_filter input[name=filter]').select();
	});

	$(document)
		.on('click', '#toc navLabel', toc_link)
		.on('click', '#library button[name=delete]', function($e) {
			$e.preventDefault();
			WebReader.library.del($($e.target).parent().parent().attr('id'));
		});
	$(window).on('hashchange', hash_change);
	$(WebReader.library)
		.on('changed', list_ebooks)
		.on('stored', function($evt) {
		$('#'+$evt.ebook.identifier().value+' a').focus();
	});
	$('#ebook').on('mousemove', $toc.delay_reveal.bind($toc));

	$('#library_filter')
		.on('input', filter_library)
		.on('submit', function($evt) {$evt.preventDefault();});
	
	list_ebooks();
	hash_change();
})
