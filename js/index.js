document.addEventListener('DOMContentLoaded', function() {
	"use strict";
	
	var 
		$ebook_el = document.getElementById('ebook'), 
		$toc_el   = document.getElementById('toc'), 
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
	
	var WebReader = new WR();
	
	window.$wr = WebReader;
	
	var list_ebooks = function() {
		var $ebooks = WebReader.library.list(true).sort(function($e1, $e2) {
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
		
		document.querySelector('#library-filter input[name=filter]').value = '';
		document.getElementById('library-list').innerHTML = $(document.getElementById('library-item')).render($ebooks);
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
			
			document.getElementById('x-'+$hash).classList.add('target');
		}
	};
	
	var ebook_link = function($evt) {
		$evt.preventDefault();
		
		var $href = $evt.target.getAttribute('href');
		
		window.setTimeout(
			function() {WebReader.goto($ebook_el.querySelector('.content'), $href);}, 0
		);
	}
	
	var toc_link = function($evt) {
		$evt.preventDefault();
		WebReader.goto($ebook_el.querySelector('.content'), $($evt.currentTarget).siblings('content')[0].getAttribute('src'));
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
	
	$(WebReader.library).on('opened', function() {
		document.querySelector('#library-filter input[name=filter]').select();
	});
	
	$('#x-toc').on('click', 'navLabel', toc_link);
	$('#x-library').on('click', 'button[name=delete]', function($e) {
		$e.preventDefault();
		WebReader.library.del($e.target.parentNode.id);
	});
	window.addEventListener('hashchange', hash_change);
	$(WebReader)
		.on('opening', function($evt) {
			$ebook_el.querySelector('header h1').innerHTLM = $evt.$ebook.title().value;
			document.getElementById('x-library').classList.add('loading');
		})
		.on('opened', function($evt) {
			document.getElementById('x-library').classList.remove('loading');
			WebReader.render_toc($toc_el.querySelector('.content'));
		})
		.on('goingto', function($evt) {
		})
		.on('goneto', function($evt) {
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
						textAlign: 'center', 
						textDecoration: 'none', 
						marginTop: '10em', 
						position: 'absolute', 
						left: '0', 
						right: '0'
					})
					.appendTo($iframe.querySelector('body'));
			}
			
			console.log($iframe.querySelectorAll('a'));
			Array.prototype.forEach.call($iframe.querySelectorAll('a'), function($el) {
				 
				$el.addEventListener('click', ebook_link);
			});
			
			$iframe.addEventListener('click', function($evt) {
				console.info($evt.target);
				
			});
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
	
	$('#library-filter input')
		.on('input', filter_library)
		.on('submit', function($evt) {$evt.preventDefault();});
	
	list_ebooks();
	hash_change();
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
