$(document).ready(function () {

	//---------------------------------------Random rhythm generation--------------------------------------------
	
	/**
	 *Based on euclid's algorithm for finding the greatest common factor of two numbers 
	 *Inspired by: http://cgm.cs.mcgill.ca/~godfried/publications/banff.pdf
	 */
	var euclid = function(m,k){
		var beats = [];
		var rhythm = [];
		var lastArrIndex = 0;

		function genInitialArray(){
			var a = m-k;
			if(m/k<2){//More 1's than 0's
				for(var i = 0; i < a; i++){
					beats.push([1,0]);
				}
				while(k>a){
					beats.push([1]);
					k--
				}
			} else{
				for(var i = 0; i < k; i++){
					beats.push([1,0]);
				}
				while(k<a){
					beats.push([0]);
					a--
				}
			}
		};
		genInitialArray();
		
		function mergeDiffArrays(){
			for(var i = 0; i < beats.length; i++){
				if(beats[i].length < beats[0].length && beats.length-1 > i){
					lastArrIndex = i-1;
					break;
				}else if(i === beats.length-1){
					/**	
					 * Why would returning rhythm here and then calling mergeDiffArrays() in the return
					 * statement for euclid() return a value of undefined?
					 */
					rhythm = beats.join().split(",");
					rhythm.forEach(function(_, index){
						rhythm[index] = parseInt(rhythm[index])
					});
					return;
				}
			}
			var currIndex = 0;
			while(beats.length-1 > lastArrIndex && beats.length-1 > currIndex){
				if(beats[beats.length-1].length < beats[lastArrIndex].length){
					var lastIndex = beats.splice(beats.length-1,1);
					beats[currIndex].push(lastIndex);
					currIndex++;
				}
			}
			mergeDiffArrays();
		}
		mergeDiffArrays();
		
		return rhythm;
	};

	//-----------------------------------------------Game Logic--------------------------------------------------
	
	//Properties of a level
	var level = 1;
	var score = 0;
	var numZeros = 0;//Number of unaccented beats
	var m = 0;//Total number of beats
	var k = 0;//Number of accented beats
	var min = 0;//Min length of rhythm
	var max = 0;//Max length of rhythm
	var ms = 0;//Time in ms that a sound plays. Will always be equal to half the length of a beat
	var bpm = 60;

	//Rhythm playback is 5 bpm faster every fourth level
	var setBPM = function(){
		if(!((level-1)%4) && level-1 > 0){
			bpm += 5;
		}
	};

	$('body').on('click', '#start', function(){
		waveformColor = 'rgb(0,153,255)';
		$('#score').html(score);
		$('#level').html(level);
		setBPM();
		$('#bpm').html(bpm);
		max = Math.ceil(level/4)*4;//max length of rhythm is equal to the next level that is a multiple of 4
		min = max/2;
		m = Math.floor(Math.random()*((max+1)-min))+min;//random integer between min and max, including min but excluding max
		ms = (60000/bpm)/2;
		if(Math.random()<.5){
			k = Math.ceil((Math.floor(Math.random()*(m-min))+min)*.5);//k will be less than half of m
		}else{
			k = Math.floor((Math.floor(Math.random()*(m-min))+min)*.75);//k will be no more than 3/4 of m. Ensures that there won't be too few unaccented beats.
		}

		var beatArray = euclid(m, k);//Generate random rhythm using m and k
		beatArray.forEach(function(el, i){//get random key values
			if(el===0) beatArray[i] = keyCodes[Math.floor(Math.random()*keyCodes.length)];//Select random note to play
		});
		var keydown = $.Event('keydown');//Keydown event for app to play sounds
		keydown.which = 65;
		var keyup = $.Event('keyup');//Keyup event for app to stop play sounds
		keyup.which = 65;
		var usersTurn = 3;//Rhythm will play 3 times before input is required from the user

		/**
		 *Must use recursive function instead of forLoop because setInterval will only delay
		 *the first iteration by the given time. Subsequent iterations will fire as usual.
		 */
		var playRhythm = function(beatArray, i){
			var i = i || 0;
			var accented = false;
			if(i > beatArray.length-3){
				waveformColor = 'rgb(255,0,0)';
			}else if(i > beatArray.length-5){
				waveformColor = 'rgb(0,255,0)';
			}
			function sound(beat){
				if(beat === 1){//Accented beats are played one octave higher than unaccented beats
					keydown.which = 59;
					keyup.which = 59;
					$('body').trigger(keydown, true);
					accented = true;
				}else {
					$('body').trigger(keydown, true);
					accented = false;
				}
			};
			sound(beatArray[i]);

			var isAccented = function(){
				$('body').trigger(keyup);
				if(accented){//reset keycode after accented note
					keydown.which = 65;
					keyup.which = 65;
				}
			}

			var endRound = function(){
				waveformColor = 'rgb(0,153,255)';
				usersTurn = 3;
				accented = false;
				isAccented();
				if(score === numZeros){
					$('.notes').html('Well Done').removeClass('faded');
					level++;
				} else {
					$('.notes').html('Try Again').removeClass('faded');
				}
				numZeros = 0;
				score = 0;
			}

			if(usersTurn > 0){
				$('.notes').html('Listen');
				setTimeout(function(){
					isAccented();
					if(beatArray[i+1] !== undefined){
						setTimeout(function(){
							playRhythm(beatArray, i+1)
						}, ms);
					} else {
						i = 0;
						usersTurn--;
						waveformColor = 'rgb(0,153,255)';
						setTimeout(function(){//Replay rhythm again from first beat
							playRhythm(beatArray, i);
						}, ms);
					}
				}, ms);
			} else if(beatArray[i] === 1){
				if(beatArray[i+1]!==1){
					$('.notes').html(String.fromCharCode(beatArray[i+1])).addClass('faded');
				}
				setTimeout(function(){
					isAccented();
				}, ms);
				if(beatArray[i+1] !== undefined){
					setTimeout(function(){
						playRhythm(beatArray, i+1);
					}, ms*2);
				} else {
					endRound();
				}
			} else if(beatArray[i] !== 1){
				$('.notes').removeClass('faded');
				numZeros++;
				var foundKeys = [];
				var hit = false;
				function listenForCorrectKey(){
					for(key in depressedKeys){
						if(depressedKeys[key] && foundKeys.indexOf(parseInt(key))<0){
							foundKeys.push(parseInt(key));
							if(parseInt(key)===beatArray[i] && hit===false){
								hit = true;
							}
						}
					}
				};
				var j = 0;
				setInterval(function(){
					if(j<ms){
						listenForCorrectKey();
						j++;
					}
				}, 1);
				setTimeout(function(){
					isAccented();
					$('.notes').html(String.fromCharCode(beatArray[i+1])).addClass('faded');
					if(foundKeys.length === 1 && hit === true){
						score++;
						$('#score').html(score);
					}
					if(beatArray[i+1] !== undefined){
						setTimeout(function(){
							playRhythm(beatArray, i+1);
						}, ms);
					} else {
						endRound();
					}
				}, ms);
			}
		};
		playRhythm(beatArray);
	});

	//--------------------------------------------------CANVAS--------------------------------------------------
	
	var canvas = document.getElementById('visualizer');
	var canvasContext = canvas.getContext('2d');
	var width = $(window).width();
	canvas.setAttribute('width', width);
	var waveformColor = 'rgb(0,153,255)';
	var drawVisual;
	var analyser;

	//Source for visualize function: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
	var visualize = function(analyser){
		var width = canvas.width;
		var height = canvas.height;

		//collect data points
		analyser.fftSize = 2048;
		var bufferLength = analyser.fftSize;
		var dataArray = new Uint8Array(bufferLength);
		
		//Clear canvas. clearRect is an HTML5 canvas method
		canvasContext.clearRect(0, 0, width, height);
		
		var draw = function(){
			//put time data collected by the analyser into the dataArray
			analyser.getByteTimeDomainData(dataArray);
			
			/*Reference: https://developer.mozilla.org/en-US/docs/Web/API/window.requestAnimationFrame
			 *tells the browser that you wish to perform an animation and 
			 *requests that the browser call a specified function to update an animation before the next repaint.
			 */ 
			drawVisual = requestAnimationFrame(draw);

			canvasContext.fillStyle = 'rgb(0, 0, 0)';
			canvasContext.fillRect(0, 0, width, height);
			canvasContext.lineWidth = 2;
			canvasContext.strokeStyle = waveformColor;

			//begin a canvas path
			canvasContext.beginPath();

			var sliceWidth = width * 1.0 / bufferLength;
			var x = 0;

			for(var i = 0; i < bufferLength; i++) {

				var v = dataArray[i] / 128.0;
				var y = v * height/2;

				if(i === 0) {
				  canvasContext.moveTo(x, y);
				} else {
				  canvasContext.lineTo(x, y);
				}

				x += sliceWidth;
			}

			canvasContext.lineTo(canvas.width, canvas.height/2);
			canvasContext.stroke();
	    };
		
		draw();
	}

	//-----------------------------------------Oscillator creation----------------------------------------------

	var context = new AudioContext();//Context needed to create nodes and handle audio processing
	analyser = context.createAnalyser();//provides time and frequency analysis
	function Oscillator(frequency){
		this.osc = context.createOscillator();
		this.osc.type = 'sine';
		this.osc.frequency.value = frequency;
		
		this.gain = context.createGain();
		this.gain.gain.value = 0;

		this.osc.connect(this.gain);
		this.gain.connect(analyser)
	}

	analyser.connect(context.destination);
	visualize(analyser);
	
	var chromaticC4 = {
		'C'  :261.626,
		'C#' :277.183,
		'D'  :293.665,
		'D#' :311.127,
		'E'  :329.628,
		'F'  :349.228,
		'F#' :369.994,
		'G'  :391.995,
		'G#' :415.305,
		'A'  :440.000,
		'A#' :466.164,
		'B'  :493.883
	}
	var keyCodes = [65, 83, 68, 70, 74, 75, 76, 59];
	var scale = [];
	var scaleObj = {};
	var oscillators = {};
	var tonic = $('select[name="key"]').val();
	var mode = +($('select[name="mode"]').val());

	var scalePicker = function(tonic, modeNum){
		scale = [];//reset scale
	    var root = chromaticC4[tonic];
	    //One semitone up is the original notes frequency multiplied by the 12th root of 2
	    var wholeStep = function(note){
	      return Math.pow(Math.pow(2, 1/12), 2)*note;
	    }
	    var halfStep = function(note){
	      return Math.pow(2, 1/12)*note; 
	    }

	    //The half step notes of each mode
	    var ionian = [3,7];
	    var dorian = [2,6];
	    var phrygian = [1,5];
	    var lydian = [4,7];
	    var mixolydian = [3,6];
	    var aeolian = [2,5];
	    var locrian = [1,4];

	    
	    //scale creation based off of root note 
	    //scaleObj gets values to assign to keycodes from the scale array
	    var genScale = function(mode){
	    	for(var i = 0; i < 8; i++){
				if (i === 0){
					scale.push(root);
				} else if(mode.indexOf(i) > -1){
					scale.push(halfStep(scale[i-1]));
				} else {
					scale.push(wholeStep(scale[i-1]));
				}
	    	}
	    }

	    /**
	     * modeNum
	     *
	     * Ionian = 1
	     * Dorian = 2
	     * Phrygian = 3
	     * Lydian = 4
	     * Mixolydian = 5
	     * Aeolian = 6
	     * Locrian = 7
	     */
	     //generate scale based on which mode was chosen by the user
	   	switch (modeNum){
	   		case 1: genScale(ionian); break;
	   		case 2: genScale(dorian); break;
	   		case 3: genScale(phrygian); break;
	   		case 4: genScale(lydian); break;
	   		case 5: genScale(mixolydian); break;
	   		case 6: genScale(aeolian); break;
	   		case 7: genScale(locrian); break;
	   	}
	};
	scalePicker(tonic, mode);

	var makeOscillators = function(){
		for(var i = 0; i < keyCodes.length; i++){
			scaleObj[keyCodes[i]] = scale[i];//assign frequencies to keycodes
			var osc = new Oscillator(scaleObj[keyCodes[i]]);
			
			//assign osciallators to corresponding keycode in oscillators object
			oscillators[keyCodes[i]] = osc;
	    	osc.osc.start(0);
		}
	};
	makeOscillators();

	//Set tonic
	$('select[name="key"]').on('change', function(){
		tonic = $(this).val();
		scalePicker(tonic, mode);
		makeOscillators();
		$(this).blur();
	});

	//Set mode
	$('select[name="mode"]').on('change', function(){
		mode = +($(this).val());
		scalePicker(tonic, mode);
		makeOscillators();
		$(this).blur();
	});

	//----------------------------------------------User action handling---------------------------------------

	//False if user is not currently pressing a key
	var depressedKeys = {
		65: false,
		83: false,
		68: false,
		70: false,
		74: false,
		75: false,
		76: false,
		59: false
	};

	$('body').on('keydown', function(e, triggered) {
		triggered = triggered || false;//Prevents triggered keydown events from altering depressedKeys object
		if(e.which===186)//Keydown event number of semicolon button is 186, but semicolon character code is 59
			key = 59
		else
	    	key = e.which;
	    if(keyCodes.indexOf(key) > -1 && depressedKeys[key] === false){
	    	oscillators[key].gain.gain.value = .20;
	    	if(triggered === false) depressedKeys[key] = true;
	    }
  	});

  	$('body').on('keyup', function(e){
  		if(e.which===186)
  			key = 59
  		else
  			key = e.which
  		if(keyCodes.indexOf(key) > -1){
  			oscillators[key].gain.gain.value=0;
  			depressedKeys[key] = false;
		}
  	});
});
