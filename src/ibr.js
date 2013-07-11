//
// # ibRoller2
// since: 2013.07.06
//
;(function (window, $, undefined) {
	
	_direction = {
		"left": "right-to-left",
		"right": "left-to-right",
		"up": "down-to-up",
		"down": "up-to-down"
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
	
	_mergeProp = function (src, dest) {
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
				_mergeProp(src[key], dest[key]);
			} else {
				dest[key] = src[key];
			}
		}
		return dest;
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
		this.args = _mergeProp(args, {
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
				"direction": _direction.left,
				"moveto": _moveto.left,
				"intervalTime": 3000,
				"movingCnt": 1
			},
			"events": {
				"init": function () {},
				"focus": function () {},
				"on": function () {},
				"off": function () {},
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
		this.activeIndex = 0;
		this.paused = true;
		this.noani = false;
		this.intervalId = 0;
		this.intervalTime = this.minimumTime;
		this.minimumTime = 3000; // 최소 자동롤링 간격 (milliseconds)
		
		// 초기화
		this.init();
		
		// 엘리먼트 속성 적용
		var _this = this;
		this.ele.$wrap.mouseover( function () {
			_this.paused = true;
		}).mouseout( function () {
			_this.paused = false;
		});
		
		// autoplay
		if (this.args.play.auto) {
			this.on(this.args.play.direction, this.args.play.fx);
		}
		
		return this;
	};
	
	_ibroller.prototype = {
		"init": function () {
			this.ele.$wrap = $(this.args.wrap).addClass("ibroller");
			this.ele.$mask = $(this.args.mask).addClass("ibr_mask");
			this.ele.$group = $(this.args.group.element).addClass("ibr_group").addClass(this.args.play.moveto);
			this.ele.$unit = $(this.args.unit.element).addClass("ibr_unit");
			this.totalGroup = Math.ceil(this.totalUnit / this.args.group.count);
			this.totalUnit = this.ele.$unit.length;
			
			this.paused = !this.args.play.auto;
			this.maxIndex = Math.ceil(this.totalUnit / this.args.play.movingCnt) - 1; 
			this.activeIndex = this.args.startIndex;
			this.currentDir = this.args.play.direction;
			this.currentMoveto = this.args.play.moveto;
			this.intervalTime = (this.args.play.intervalTime > this.minimumTime) ? this.args.play.intervalTime : this.minimumTime;
			
			// attribues
			this.ele.$wrap.attr({
				"active-index": this.activeIndex,
				"direction": this.currentDir
			});
			
			this.initPosition(this.currentMoveto, this.activeIndex);
			
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
				this.args.events.init.apply(null, [this.activeIndex]);
			}
		},
		"next": function (dir) {
			var dir = dir || this.currentDir,
				moveto = _moveto.left;
			
			switch (dir) {
			case _direction.left:
			default:
				moveto = _moveto.left;
				break;
			case _direction.right:
				moveto = _moveto.right;
				break;
			case _direction.up:
				moveto = _moveto.up;
				break;
			case _direction.down:
				moveto = _moveto.down;
				break;
			}
			// 방향전환에 따른 불필요한 애니메이션을 없애기 위해
			if (moveto != this.currentMoveto) {
				this.initPosition(moveto);
			}
			this.focus(this.activeIndex + 1);
		},
		"prev": function (dir) {
			var dir = dir || this.currentDir,
				moveto = _moveto.left;
			
			switch (dir) {
			case _direction.left:
			default:
				moveto = _moveto.right;
				break;
			case _direction.right:
				moveto = _moveto.left;
				break;
			case _direction.up:
				moveto = _moveto.down;
				break;
			case _direction.down:
				moveto = _moveto.up;
				break;
			}
			if (moveto != this.currentMoveto) {
				this.initPosition(moveto);
			}
			this.focus(this.activeIndex - 1);
		},
		"focus": function (idx, noani) {
			var _this = this,
				noani = (noani === undefined) ? false : noani,
				idx = this.setActiveIndex(idx);
			
			this.setNoani(noani);
			this._setState(_state.ready, idx, function (nowIndex) {
				_this._setState(_state.active, nowIndex);
				_this._setState(_state.idle, _this.prevIndex);
			});
		},
		"initPosition": function (moveto, idx) {
			var _this = this,
				dir = dir || this.currentDir,
				idx = (idx === undefined) ? this.activeIndex : idx,
				moveto = moveto || this.currentMoveto;
			
			this.setNoani(true);
			this._moveto(moveto);
			for (var i = 0; i <= this.maxIndex; i++) {
				this._setState(_state.idle, i);
			}
			this._setState(_state.active, idx);
			this.setActiveIndex(idx);
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
		"setActiveIndex": function (idx) {
			if (idx === undefined) {
				return this.activeIndex;
			}
			if (idx < 0) {
				idx = this.maxIndex;
			} else if (idx > this.maxIndex) {
				idx = 0;
			}
			this.prevIndex = this.activeIndex;
			this.activeIndex = idx;
			this.ele.$wrap.attr("active-index", this.activeIndex);
			
			return this.activeIndex;
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
				cnt = 0,
				timeout = 0,
				maxtime = 0,
				$item = {};
			
			for (var i = idx * this.args.play.movingCnt; i < this.totalUnit; i++) {
			
				$item = this.ele.$unit.eq(i);
				
				switch (state) {
				case _state.ready:
					cls = "ibr_ready ibr_r" + cnt;
					break;
				case _state.active:
					cls = "ibr_active ibr_a" + cnt;
					break;
				case _state.idle:
					cls = "ibr_idle ibr_i" + cnt;
					break;
				}
				
				$item.removeClass("ibr_ready ibr_active ibr_idle ibr_r" + cnt + " ibr_a" + cnt + " ibr_i" + cnt).addClass(cls);
				
				maxtime = parseFloat($item.css("transition-duration")) + parseFloat($item.css("transition-delay"));
				if (maxtime > timeout) {
					timeout = maxtime;
				}
				
				if (++cnt >= this.args.play.movingCnt) break;
			}
			
			window.setTimeout(function () {
				end.apply(null, [idx]);
			}, timeout * 1000);
		}
	};
	
	window.ibr = _ibroller;
	window.ibr.dir = _direction;
	window.ibr.move = _moveto;
	
}(window, jQuery));