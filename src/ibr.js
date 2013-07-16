//
// # ibRoller2
// since: 2013.07.06
//
;(function (window, $, undefined) {

	_direction = {
		"hor": "right-to-left",
		"ver": "down-to-up"
	};
	
	_moveto = {
		"left": "ibr_move_left",
		"right": "ibr_move_right",
		"up": "ibr_move_up",
		"down": "ibr_move_down"
	};
	
	_state = {
		"ready": "ibr_ready",
		"active": "ibr_active",
		"idle": "ibr_idle"
	}
	
	_fn = {
		"mergeProp": function (src, dest) {
			if (src === undefined) {
				return dest;
			}
			if (dest === undefined) {
				dest = {};
			}
			for (var key in src) {
				if (!src.hasOwnProperty(key)) {
					continue;
				}
				if (src[key] === undefined) {
					continue;
				} else if (src[key].constructor == Object) {
					_fn.mergeProp(src[key], dest[key]);
				} else {
					dest[key] = src[key];
				}
			}
			return dest;
		},
		"filterClass": function (classes, regexp, except) {
			if (classes === undefined) {
				return "";
			}
			if (regexp === undefined) {
				return "";
			}
			var result = "",
				arrClass = classes.split(' '),
				except = except || [];
			for(var i = 0; i < arrClass.length; i++) {
				if(!regexp.test(arrClass[i]) || except.indexOf(arrClass[i]) != -1) {
					if (i > 0) {
						result += " " + arrClass[i];
	         		} else {
	         			result += arrClass[i];
	         		}	
				}
			}
			return result;
		},
		// return milliseconds
		// - selector: jQuery selector
		"getTransitionTime": function (selector) {
			var $item = $(selector);
			return (parseFloat($item.css("transition-duration")) + parseFloat($item.css("transition-delay"))) * 1000;
		}
	};
		
	var _ibroller = function (args) {
		if (typeof args.group === "string") {
			args.group = {
				"element": args.group
			}
		}
		if (typeof args.unit === "string") {
			args.unit = {
				"element": args.unit
			}
		}
		if (typeof args.play === "boolean") {
			args.play = {
				"auto": args.play
			}
		}
		this.args = _fn.mergeProp(args, {
			"wrap": "",
			"mask": "",
			"group": {
				"element": "",
				"count": 1
			},
			"unit": {
				"element": ""
			},
			"startIndex": 0,
			"play": {
				"auto": false,
				"direction": _direction.hor,
				"moveto": _moveto.left,
				"intervalTime": 3000,
				"movingCnt": 1
			},
			"events": {
				"init": function () {},
				"focus": function () {},
				"play": function () {},
				"stop": function () {},
				"pause": function () {},
				"resume": function () {},
				"timeout": function () {}
			}
		});
		
		this.ele = {
			"$wrap": {},
			"$mask": {},
			"$group": {},
			"$unit": {}
		};
				
		this.totalUnit = 0; // 총 unit 개 수
		this.maxIndex = 0;
		this.nowIndex = 0;
		this.paused = true;
		this.stopped = true;
		this.noani = false;
		this.intervalId = 0;
		
		// 초기화
		this.init();
		
		// 엘리먼트 속성 적용
		var _this = this;
		this.ele.$wrap.mouseover( function () {
			_this.pause();
		}).mouseout( function () {
			_this.resume();
		});
		
		// autoplay
		if (this.args.play.auto) {
			this.play();
		}
		
		return this;
	};
	
	_ibroller.prototype = {
		"init": function () {
			this.ele.$wrap = $(this.args.wrap).addClass("ibroller");
			this.ele.$mask = this.ele.$wrap.find(this.args.mask).addClass("ibr_mask");
			this.ele.$group = this.ele.$wrap.find(this.args.group.element).addClass("ibr_group").addClass(this.args.play.moveto);
			this.ele.$unit = this.ele.$wrap.find(this.args.unit.element).addClass("ibr_unit");
			this.totalGroup = Math.ceil(this.totalUnit / this.args.group.count);
			this.totalUnit = this.ele.$unit.length;
			
			this.stopped = !this.args.play.auto;
			this.maxIndex = Math.ceil(this.totalUnit / this.args.play.movingCnt) - 1; 
			this.nowIndex = this.args.startIndex;
			this.currentDir = this.args.play.direction;
			this.currentMoveto = this.args.play.moveto;
			
			// attribues
			this.ele.$wrap.attr({
				"index": this.nowIndex,
				"direction": this.currentDir
			});
			
			this.initPosition(this.currentMoveto, this.nowIndex);
			
			// css3 prefix
			var b = $.browser;
			if (b.webkit || b.safari) {
				this.prefix = "-webkit-";
			} else if (b.msie) {
				this.prefix = "-ms-";
			} else if (b.mozilla) {
				this.prefix = "-moz-";
			} else if (b.opera) {
				this.prefix = "-o-";
			} else;
			
			// init event call
			if (typeof this.args.events.init === "function") {
				this.args.events.init.apply(null, [this.nowIndex]);
			}
		},
		"play": function () {
			this.intervalId = window.setTimeout( function (_this) {
				return function () {
					_this.next();
					_this.play();
				};
				if (typeof _this.args.events.timeout === "function") {
					_this.args.events.timeout.apply(null, [_this.nowIndex]);
				}
			}(this), this.args.play.intervalTime);
			
			this.stopped = false;
			
			if (typeof this.args.events.play === "function") {
				this.args.events.play.apply(null, [this.nowIndex]);
			}
		},
		"stop": function () {
			this.pause();
			this.stopped = true;
			
			if (typeof this.args.events.stop === "function") {
				this.args.events.stop.apply(null, [this.nowIndex]);
			}
		},
		"pause": function () {
			window.clearTimeout(this.intervalId);
			
			if (typeof this.args.events.pause === "function") {
				this.args.events.pause.apply(null, [this.nowIndex]);
			}
		},
		"resume": function () {
			if (!this.stopped) {
				this.play();
			}
			
			if (typeof this.args.events.resume === "function") {
				this.args.events.resume.apply(null, [this.nowIndex]);
			}
		},
		"next": function (dir) {
			var dir = dir || this.currentDir,
				moveto = _moveto.left;
			
			switch (dir) {
			case _direction.hor:
			default:
				moveto = _moveto.left;
				break;
			case _direction.ver:
				moveto = _moveto.down;
				break;
			}
			// 방향전환에 따른 불필요한 애니메이션을 없애기 위해
			if (moveto != this.currentMoveto) {
				this.initPosition(moveto);
			}
			this.focus(this.nowIndex + 1);
		},
		"prev": function (dir) {
			var dir = dir || this.currentDir,
				moveto = _moveto.left;
			
			switch (dir) {
			case _direction.hor:
			default:
				moveto = _moveto.right;
				break;
			case _direction.ver:
				moveto = _moveto.up;
				break;
			}
			if (moveto != this.currentMoveto) {
				this.initPosition(moveto);
			}
			this.focus(this.nowIndex - 1);
		},
		"focus": function (idx, noani) {
			var _this = this,
				noani = (noani === undefined) ? false : noani,
				idx = this.setNowIndex(idx);
			
			this.setNoani(noani);
			this._setState(_state.ready, idx, function (nowIndex) {
				_this._setState(_state.idle, _this.prevIndex);
				_this._setState(_state.active, nowIndex);
			});
			
			if (typeof this.args.events.focus === "function") {
				this.args.events.focus.apply(null, [this.nowIndex]);
			}
		},
		"initPosition": function (moveto, idx) {
			var _this = this,
				dir = dir || this.currentDir,
				idx = (idx === undefined) ? this.nowIndex : idx,
				moveto = moveto || this.currentMoveto;
			
			this.setNoani(true);
			this._moveto(moveto);
			for (var i = 0; i <= this.maxIndex; i++) {
				this._setState(_state.idle, i);
			}
			this._setState(_state.active, idx);
			this.setNowIndex(idx);
			this.setNoani(false);
		},
		"direction": function (dir) {
			if (dir === undefined) {
				return this.currentDir;
			}
			this.ele.$wrap.attr("direction", dir);
			this.currentDir = dir;
		},
		"setNoani": function (noani) {
			var noani = (noani === undefined) ? false : noani;
			
			if (noani == this.noani) {
				return;
			}
			
			if (noani) {
				this.ele.$unit.addClass("ibr_noani");
			} else {
				this.ele.$unit.removeClass("ibr_noani");
			}
			this.noani = noani;
		},
		"setNowIndex": function (idx) {
			if (idx === undefined) {
				return this.nowIndex;
			}
			if (idx < 0) {
				idx = this.maxIndex;
			} else if (idx > this.maxIndex) {
				idx = 0;
			}
			this.prevIndex = this.nowIndex;
			this.nowIndex = idx;
			this.ele.$wrap.attr("index", this.nowIndex);
			
			return this.nowIndex;
		},
		"_moveto": function (movedir) {
			if (movedir === undefined) {
				return this.currentMoveto;
			}
			this.ele.$group.removeClass(_moveto.left + " " + _moveto.right + " " + _moveto.up + " " + _moveto.down).addClass(movedir);
			this.currentMoveto = movedir;
		},
		"_setState": function (state, idx, end) {
			var _this = this,
				state = state || _state.ready,
				idx = (idx === undefined) ? 0 : idx,
				end = end || function () {},
				cls = "",
				timeout = 0,
				maxtime = 0,
				$item = {};
			
			var s = idx * this.args.play.movingCnt, 
				e = s + this.args.group.count,
				i = s,
				n = 0;
			for (; i < e; i++, n++) {
				if (i >= this.totalUnit) {
					$item = this.ele.$unit.eq(i - this.totalUnit);
				} else {
					$item = this.ele.$unit.eq(i);
				}
				
				switch (state) {
				case _state.ready:
					if ($item.hasClass("ibr_active")) {
						continue;
					}
					cls = "ibr_ready ibr_r" + n;
					break;
					
				case _state.active:
					cls = "ibr_active ibr_a" + n;
					break;
					
				case _state.idle:
					switch (this.currentMoveto) {
					case _moveto.left:
						if (n >= this.args.play.movingCnt) {
							continue;
						}
						break;
					case _moveto.right:
					case _moveto.up:
						if (n < (this.args.group.count - this.args.play.movingCnt)) {
							continue;
						}
						break;
					}
					cls = "ibr_idle ibr_i" + n;
					break;
				}
				
				$cleanClass = _fn.filterClass($item.attr("class"), /ibr_*/, ["ibr_unit", "ibr_noani"]);
				$item.attr("class", $cleanClass).addClass(cls);
				
				maxtime = parseFloat($item.css("transition-duration")) + parseFloat($item.css("transition-delay"));
				if (maxtime > timeout) {
					timeout = maxtime;
				}
			}
			
			window.setTimeout(function () {
				end.apply(null, [idx]);
			}, timeout * 1000);
		}
	};
	
	window.ibr = _ibroller;
	window.ibr.fn = _fn;
	window.ibr.dir = _direction;
	window.ibr.move = _moveto;
	
}(window, jQuery));