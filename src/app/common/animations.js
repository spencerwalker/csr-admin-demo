angular.module('orderCloud')
	.animation('.left-nav-dropdown', leftNavDropdown)
	.animation('.aveda-search', avedaSearch)
;

function leftNavDropdown() {
	return {
		addClass: function(element, className, done) {
			if (className == 'open') {
				var menu = element.children()[1];
				TweenMax.from(menu, 0.2, {height:'0px', onComplete: done, ease: Power3.easeOut });
				TweenMax.staggerFrom(menu.children, 0.2, {opacity: 0, position: 'relative', top:'-15px', delay:0.075, ease: Back.easeOut}, 0.03);
			} else {
				done();
			}
		},
		beforeRemoveClass: function(element, className, done) {
			if (className == 'open') {
				var menu = element.children()[1];
				TweenMax.to(menu, 0.2, {height:'0px', onComplete: done, ease: Power3.easeIn });
				return function() {
					menu.style.height = '';
				}
			} else {
				done();
			}
		}
	}
}

function avedaSearch() {
	return {
		removeClass: function(element, className, done) {
			var form = element[0];
			form.style.overflow = 'hidden';
			if (className == 'ng-hide') {
				TweenMax.from(form, 0.2, {height:'0', onComplete: done, ease: Power3.easeOut});
			} else {
				done();
			}
			return function() {
				form.style.overflow = '';
			}
		},
		beforeAddClass: function(element, className, done) {
			var form = element[0];
			form.style.overflow = 'hidden';
			if (className == 'ng-hide') {
				TweenMax.to(form, 0.2, {height:'0', onComplete: done, ease: Power3.easeIn});
			} else {
				done();
			}
			return function() {
				form.style.height = '';
				form.style.overflow = '';
			}
		}
	}
}