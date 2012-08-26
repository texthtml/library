document.addEventListener('DOMContentLoaded', function() {
	"use strict";
	
	var 
		$library_el = document.getElementById('library'), 
		$filter_el  = $library_el.querySelector('input[name=filter]'), 
		$ebook_el   = document.getElementById('ebook'), 
		$toc_el     = document.getElementById('toc'), 
		$iframe_el  = $ebook_el.querySelector('iframe');
	
	Array.prototype.forEach.call(document.querySelectorAll('div[id]'), function($el) {
		$el.id = 'x-' + $el.id;
	});
	
	document.querySelector('a[href=\'#fullscreen\']').addEventListener('click', function($event) {
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
	
	var $wr = Object.create(WR);
	window.$wr = $wr;
				
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
	
	var hash_change = function() {
		if(window === window.top) {
			var 
				$hash = window.location.hash.substr(1), 
				$pos = $hash.search('/'), 
				$prefix = $hash.substr(0, $pos), 
				$ebook_id = ($pos === -1) ? undefined : $hash.substr($pos + 1), 
				$ebook_spine, 
				$ebook_hash;
			
			Array.prototype.forEach.call(document.querySelectorAll('.target'), function($el) {
				$el.classList.remove('target');
			});
			
			if($ebook_id !== undefined) {
				var $ebook_ = $ebook_spine = $ebook_hash = '';
				
				[$ebook_id, $ebook_spine, $ebook_hash] = split_ebook_hash($ebook_id);
				
				/**
				 * seamless "polyfill" 
				 * @see https://bugzilla.mozilla.org/show_bug.cgi?id=80713
				 * @see #35
				 */
				var $parent = $iframe_el.parentNode;
				$parent.removeChild($iframe_el);
				$iframe_el = document.createElement('iframe');
				$parent.insertBefore($iframe_el, $ebook_el.querySelector('a[rel=next]'));
				
				$iframe_el.contentDocument.open();
				$iframe_el.contentDocument.write('loading ebook…');
				$iframe_el.contentDocument.close();
				
				Array.prototype.forEach.call($ebook_el.querySelectorAll('nav a[data-prefix]'), function($el) {
					$el.href = '#' + $el.dataset.prefix + '/' + $ebook_id;
				});
				
				$wr.library().load($ebook_id, function($ebook) {
					$ebook.spine($ebook_spine, function($html, $spine) {
						/** seamless "polyfill" **/
						var $parent = $iframe_el.parentNode;
						$parent.removeChild($iframe_el);
						$iframe_el = document.createElement('iframe');
						$parent.insertBefore($iframe_el, $ebook_el.querySelector('a[rel=next]'));
						
						$iframe_el.contentDocument.open();
						$iframe_el.contentDocument.write($html);
						$iframe_el.contentDocument.close();
						
						/** seamless "polyfill" **/
						$iframe_el.onload = function() {
								var 
									$height = $iframe_el.contentDocument.documentElement.getBoundingClientRect().height;
								$iframe_el.style.height = $height + 'px';
								$height = $iframe_el.contentDocument.documentElement.scrollHeight;
								$iframe_el.style.height = $height + 'px';
						};
						
						Array.prototype.forEach.call($iframe_el.contentDocument.querySelectorAll('a'), function($link) {
							$link.addEventListener('click', function($event) {
								if(this.nodeName === 'A') {
									$event.preventDefault();
									
									var 
										$href = $spine.slice(0, $spine.lastIndexOf('/') + 1) + this.getAttribute('href'), 
										$last_href;
									
									do {
										$last_href = $href;
										$href = $href.replace(/[^\/]*\/\.\.\//g, '');
									} while($last_href !== $href);
									
									$href = $href.replace('@', '\\@', 'g');
									$href = $href.replace('#', '@', 'g');
									
									window.location.hash = $ebook_el.dataset.prefix + '/' + $ebook_id + '@' + $href;
								}
							});
						});
						
						if($ebook_hash !== undefined) {
							var 
								$el = $iframe_el.contentDocument.querySelector($ebook_hash), 
								$top = $el === null ? 0 : $el.getClientRects()[0].top;
							
							$iframe_el.contentWindow.scrollTo(0, $top);
						}
						
						$ebook.prev_next($spine, function($prev, $next) {
							$ebook_el.querySelector('a[rel=prev]').href = ($prev === null) ? '#' : '#ebook/' + $ebook_id.replace('@', '\\@', 'g') + '@' + $prev.replace('@', '\\@', 'g');
							$ebook_el.querySelector('a[rel=next]').href = ($next === null) ? '#' : '#ebook/' + $ebook_id.replace('@', '\\@', 'g') + '@' + $next.replace('@', '\\@', 'g');
						});
					});
				});
				
				$hash = 'ebook';
			}
			
			var $target = document.getElementById('x-'+$hash);
			if($target !== null) {
				$target.classList.add('target');
			}
		}
	};
	
	jsviews.templates({
		libraryItem: document.getElementById('library-item').innerHTML
	});
	
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
		
		document.getElementById('library-list').innerHTML = jsviews.render.libraryItem($ebooks);
		
		if(render_ebooks.$focus !== undefined) {
			document.getElementById(render_ebooks.$focus).focus();
			delete render_ebooks.$focus;
		}
	};
	
	$wr.library().addEventListener('changed', function($event) {
		render_ebooks($event.$ebooks);
	});
	
	$wr.library().addEventListener('added', function($event) {
		window.location.hash = 'library';
		render_ebooks.$focus = $event.$identifier;
	});
	
	$library_el.addEventListener('click', function($evt) {
		if($evt.target.nodeName === 'BUTTON' && $evt.target.name === 'delete') {
			$evt.preventDefault();
			$wr.library().delete($evt.target.parentNode.id);
		}
	});
	
	document.getElementById('add_ebook').addEventListener('submit', function($e) {
		$e.preventDefault();
		var $file = this.querySelector('input[type=file]').files[0];
		$wr.library().add($file);
	});
	
	window.addEventListener('hashchange', hash_change);
	$wr.addEventListener('initied', hash_change);
	
	$wr.init();
});
