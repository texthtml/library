document.addEventListener('DOMContentLoaded', function() {
	"use strict";
	
	var 
		$library_el = document.getElementById('library'), 
		$filter_el  = $library_el.querySelector('input[name=filter]'), 
		$ebook_el   = document.getElementById('ebook'), 
		$toc_el     = document.getElementById('toc'), 
		$current_ebook;
	
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
	
	var WebReader = Object.create(WR);
	
	window.$wr = WebReader;
	
	jsviews.templates({
		libraryItem: document.getElementById('library-item').innerHTML
	});
	
	var list_ebooks = function($evt) {
		var $ebooks = $evt.$ebooks.sort(function($e1, $e2) {
			var 
				$s1 = 
					$e1.metadata.creator.map(function($i, $e) {return $e.value}).sort().join(' ')+' '+
					($e1.metadata.series?$e1.metadata.series.value:'')+' '+
					($e1.metadata.series_index?$e1.metadata.series_index.value:'')+' '+
					$e1.metadata.title.value;
			var 
				$s2 = 
					$e2.metadata.creator.map(function($i, $e) {return $e.value}).sort().join(' ')+' '+
					($e2.metadata.series?$e2.metadata.series.value:'')+' '+
					($e2.metadata.series_index?$e2.metadata.series_index.value:'')+' '+
					$e2.metadata.title.value;
			
			return $s1.localeCompare($s2);
		});
		
		$filter_el.value = '';
		
		document.getElementById('library-list').innerHTML = jsviews.render.libraryItem($ebooks);
	};
	
	var hash_change = function($evt) {
		if(window === window.top) {
			var 
				$hash = window.location.hash.substr(1), 
				$pos = $hash.search('/'), 
				$prefix = $hash.substr(0, $pos), 
				$ebook = ($pos === -1) ? undefined : $hash.substr($pos + 1);
			
			Array.prototype.forEach.call(document.querySelectorAll('.target'), function($el) {
				$el.classList.remove('target');
			});
			
			if($ebook !== $current_ebook && $ebook !== undefined) {
				$current_ebook = $ebook;
				WebReader.open($ebook_el.querySelector('.content'), $ebook, null);
				
				Array.prototype.forEach.call(document.querySelectorAll('[data-prefix][id]'), function($el) {
					$el.id = 'x-' + $el.dataset.prefix + '/' + $ebook;
				});
				
				Array.prototype.forEach.call(document.querySelectorAll('a[data-prefix]'), function($el) {
					$el.href = '#' + $el.dataset.prefix + '/' + $ebook;
				});
			}
			
			var $target = document.getElementById('x-'+$hash);
			if($target !== null) {
				$target.classList.add('target');
			}
		}
	};
	
	var ebook_link = function($evt) {
		$evt.preventDefault();
		
		var $href = $evt.target.getAttribute('href');
		
		window.setTimeout(
			function() {WebReader.goto($ebook_el.querySelector('.content'), $href);}, 0
		);
	}
	
	var toc_link = function($href) {
		WebReader.goto($ebook_el.querySelector('.content'), $href);
		window.location.hash = $ebook_el.dataset.prefix + '/' + $current_ebook;
	}
	
	var filter_library = function($evt) {
		var $filter = $evt.target.value.trim().toLowerCase();
		
		Array.prototype.forEach.call(document.querySelectorAll('#library-list li'), function($el) {
			$el.style.display = ($el.querySelector('.search-content').textContent.search($filter) === -1)? 'none' : 'block';
		});
	}
	
	document.getElementById('add_ebook').addEventListener('submit', function($e) {
		$e.preventDefault();
		var $file = this.querySelector('input[type=file]').files[0];
		WebReader.library.set($file);
		window.location.hash = 'library';
	});
	
	$toc_el.addEventListener('click', function($evt) {
		var $target = $evt.target;
		
		while($target !== null && $target.nodeName !== 'NAVLABEL') {
			$target = $target.parentNode;
		}
		
		if($target !== null) {
			$evt.preventDefault();
			toc_link($target.parentNode.querySelector('content').getAttribute('src'));
		}
	}, true);
	$library_el.addEventListener('click', function($evt) {
		if($evt.target.nodeName === 'BUTTON' && $evt.target.name === 'delete') {
			$evt.preventDefault();
			WebReader.library.del($evt.target.parentNode.id);
		}
	});
	window.addEventListener('hashchange', hash_change);
	WebReader.addEventListener('opening', function($evt) {
		
		$ebook_el.querySelector('header h1').innerHTML = $evt.$ebook.title().value;
		document.getElementById('x-library').classList.add('loading');
	});
	WebReader.addEventListener('opened', function($evt) {
		document.getElementById('x-library').classList.remove('loading');
		WebReader.render_toc($toc_el.querySelector('.content'));
	});
	WebReader.addEventListener('rendered', function($evt) {
		var 
			$iframe = $evt.$iframe.contentDocument, 
			$next = WebReader.next();
		
		if(typeof $next !== 'undefined') {
			var $a = document.createElement('a');
			$a.textContent = 'next';
			$a.className = 'web-reader next';
			$a.href = $next;
			$a.style.display = 'block';
			$a.style.borderTop = '1px solid lightgray';
			$a.style.backgroundColor = 'rgba(0, 0, 0, 0.01)';
			$a.style.lineHeight = '5em';
			$a.style.textAlign = 'center';
			$a.style.textDecoration = 'none';
			$a.style.marginTop = '10em';
			$a.style.position = 'absolute';
			$a.style.left = '0';
			$a.style.right = '0';
			
			$iframe.body.appendChild($a);
		}
		
		Array.prototype.forEach.call($iframe.querySelectorAll('a'), function($el) {
			 
			$el.addEventListener('click', ebook_link);
		});
		
		$iframe.addEventListener('click', function($evt) {
			console.info($evt.target);
			
		});
	});
	WebReader.library.addEventListener('loaded', list_ebooks);
	WebReader.library.addEventListener('changed', list_ebooks);
	
	$filter_el.addEventListener('input', filter_library);
	$filter_el.addEventListener('submit', function($evt) {$evt.preventDefault();});
	
	WebReader.library.load();
	hash_change();
});
