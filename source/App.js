enyo.kind({
  name: "fitator.App",
  kind: enyo.VFlexBox,
  components: [
  //{name: "storage", kind: "fitator.WebOSStorage"},
  {name: "alarmService", kind: "PalmService", service: "palm://com.palm.power/timeout/"},
  {kind: enyo.ApplicationEvents,  onApplicationRelaunch: "relaunchHandler",
    onWindowDeactivated: "windowDeactivatedHandler", onWindowActivated: "windowActivatedHandler"},
  {name: "storage", kind: "fitator.WebOSStorage"},

  {name : "makeSysSound", kind : "PalmService", service : "palm://com.palm.audio/systemsounds",
  method : "playFeedback"},
  {kind: "AppMenu", components: [
    {caption: "Clear Records", onclick: "clearRecords"},
  ]},
  {kind:"Control", name:"title", content: "Fitator"},
  {name:"topGroup", kind:"Control", layoutKind: "HFlexLayout", components: [
    {name: "iconImage", kind: "Image", src: "images/icon.png"},
    {kind: "RowGroup", caption: "Preferences", flex:3, components: [
      {name: "nameField", kind: "Input", selectAllOnFocus: true,
      focusClassName: "fieldFocused",hint: "Your Username", autoCapitalize:"lowercase"},
      {name: "pwField", kind: "PasswordInput", selectAllOnFocus: true, 
      focusClassName: "fieldFocused", hint: "Your Password"}
    ]}
  ]},
  {kind: "Control", name: "statusLabel", content: "Hello :)"},
  {kind: "RowGroup", caption: "Status", components: [
    {name: "scoreLabel", content: "Score: "},
    {name: "lastCheckedLabel", content: "LastChecked: "}
  ]},
  {name: "buttonBox", kind: "Control", layoutKind: "HFlexLayout", components:[
    {name: "timerButton", kind: "IconButton", icon:"images/timer.png", onclick: "timerButtonClicked", toggling: "true"},
    {name: "onceButton", kind: "IconButton", icon:"images/once.png", onclick: "onceButtonClicked"},
    {kind: "Picker", name: "valueField" , value: "1", onChange: "setScore", items: [
      {caption: "1", value: "1"},
      {caption: "5", value: "5"},
      {caption: "10", value: "10"},
      {caption: "20", value: "20"},
      {caption: "50", value: "50"},
      {caption: "100", value: "100"}
    ]},
    // {name: "scoreField", kind: "Control", flex: 1,
    //   focusClassName: "fieldFocused",hint: "your score", autoCapitalize:"lowercase"},
    {name: "filler", kind: "Control", flex: 1},
    {name: "submitButton", kind: "IconButton", icon:"images/lift.png", onclick: "submitButtonClicked"}
  ]}
  ],

create: function() {
  this.inherited(arguments); 
  setTimeout(enyo.bind(this, this.initalizeInterface), 500);
},

initalizeInterface: function() {
  if (this.$.storage.getUsername().length > 0) {
    this.$.nameField.setValue(this.$.storage.getUsername());
  } else {
    this.$.nameField
  }
  this.setScore();
  var checked = "Never"
  if (this.$.storage.getLastChecked() != -1) {
    checked = this.$.storage.getLastChecked();
  }
  this.$.lastCheckedLabel.setContent("Last Checked: " + checked);
},

submitButtonClicked: function() {
  this.useRequest();
},

useRequest: function(async) {
  try{
    xhr = new XMLHttpRequest();

    enyo.log("Collect token");
    xhr.open("GET", "https://www.fitocracy.com/accounts/login", async);
    xhr.send();

    var anchor = "'csrfmiddlewaretoken' value='";
    var idx = xhr.responseText.indexOf(anchor);
    if (idx < 0) {
      this.requestFailed("Could not retrieve csrftoken!");
      return;
    }
    idx += anchor.length;
    var token = xhr.responseText.substring(idx,idx+32);
    var params = "csrfmiddlewaretoken="+token;

    enyo.log("Trying to login...");
    params +="&is_username=1&json=1";
    params +="&username="+this.$.nameField.getValue();
    params +="&password="+this.$.pwField.getValue();
    xhr.open("POST", "https://www.fitocracy.com/accounts/login/", async);
    xhr.setRequestHeader("Origin", "https://www.fitocracy.com");
    xhr.setRequestHeader("Referer", "https://www.fitocracy.com");
    xhr.setRequestHeader("Content-Type", "application/xml");
    xhr.setRequestHeader("Accept", "*/*");
    xhr.setRequestHeader("Accept-Charset", "ISO-8859-1,utf-8;q=0.7,*;q=0.3");
    xhr.send(params);

    if (xhr.responseText.charAt(0) == "{") {
      if (JSON.parse(xhr.responseText).success == true) {
        enyo.log("Login success");
        xhr.open("GET","https://www.fitocracy.com/profile/"
          +this.$.nameField.getValue(), async);
        xhr.send();
        var idx = xhr.responseText.indexOf("stat-points");
        if (idx < 0) {
          this.requestFailed("Cannot find your score!");
        } else {
          var sub = xhr.responseText.substring(idx,idx+200);
          var arr = sub.split('\n');
          for (var el in arr) {
            if (arr[el].indexOf(">") < 0) {
              var new_score = parseInt(arr[el].replace(/[^0-9]/g,''));
              this.conductUpdate(new_score);
              break;
            }
          }
        }
      } else {
        enyo.log("Login failed");
        this.requestFailed(JSON.parse(xhr.responseText).error);
        return;
      }
    }
    xhr.open("GET", "https://www.fitocracy.com/accounts/logout", async);
    xhr.send();
  } catch (ex) {
    enyo.warn("Exception caught: " + ex.message);
    this.requestFailed("I cannot hear the servers' whisper. Check your internet connection and try again.");
    return;
  } 
},

_gotFeed: function() {
  var score = this.$.scoreField.getValue();
  score = parseInt(score.replace(/[^0-9]/g,''));
  this.$.storage.setUsername(this.$.nameField.getValue());
  this.conductUpdate(score);
},

conductUpdate: function(score) {
  this.$.storage.setUsername(this.$.nameField.getValue());
  var old_score = this.$.storage.getScore();
  var old_time = this.$.storage.getLastChecked();
  var new_time = new Date();
  var diff = this.$.storage.updateScore(score, new_time);
  this.$.storage.saveData();
  this.setScore();
  this.$.lastCheckedLabel.setContent("Last Checked: " + this.$.storage.getLastChecked());
  if (old_time == -1) {
    comment = "We are set. You get 42 points for free. Start training now to earn more.";
    this.$.statusLabel.setContent(comment);
    return;
  }
  var days = Math.round((new_time - old_time)  / (1000*60*60*24));
  if (days == 0) days = 1;
  var each = diff/days;
  var comment = "Lame...";      
  if (each > 1000) {
    comment = "Wow! What an ace!";
  } else if (each > 800) {
    comment = "Awesome! That was some serious training.";
  } else if (each > 600) {
    comment = "Nice! You like sports, don't you?"
  } else if (each > 400) {
    comment = "Good work. Keep it up."
  } else if (each > 200) {
    comment = "Not bad. But can you do better?"
  } else if (each > 100) {
    comment = "It's something."
  }
  this.$.statusLabel.setContent("You earned " + diff + " points. That is " + each + " each day. " + comment);
},

requestFailed: function(reason) {
  enyo.log("ERROR: " + reason);
  this.$.statusLabel.setContent(reason);
},

clearRecords: function() {
  this.$.storage.clearData();
  this.$.statusLabel.setContent("Okay. All records are gone.");
},

onceButtonClicked:function(times) {
  times = (typeof times != "number") ? 1 : times;
  var invalid = /[^0-9]/i.test(this.$.valueField.getValue());
  if (invalid == false) {
    var value = parseInt(this.$.valueField.getValue());
    var old_score = this.$.storage.getScore();
    var new_score = this.$.storage.reduceScore(value * times);
    if ( new_score == 0 || (old_score * new_score < 0)) {
      this.outOfPointsHandler();
    }
    this.setScore();
  } else {
    this.$.statusLabel.setContent("OOps. Only numbers allowed in value field.");
    if (this.$.timerButton.depressed == true) {
      clearInterval(this.timer);
      this.$.valueField.setDisabled(false);
      this.$.onceButton.setDisabled(false);
      this.$.timerButton.setDepressed(false);
    }
  }
  this.$.storage.saveData();
},

timerButtonClicked:function() {
  if (this.$.timerButton.depressed == true) {
    this.$.valueField.setDisabled(true);
    this.$.onceButton.setDisabled(true);    
    this.onceButtonClicked();
    this.timer = setInterval(enyo.bind(this, this.onceButtonClicked), 60000);
  } else {
    clearInterval(this.timer);
    this.$.valueField.setDisabled(false);
    this.$.onceButton.setDisabled(false);
  }
},

outOfPointsHandler: function() {
  this.$.statusLabel.setContent("Uhoh. No points left!");
  this.$.makeSysSound.call({name: "sysmgr_alert"});
},

setScore: function(){
  var str = "Score: " + this.$.storage.getScore();
  str += " (" + Math.floor(this.$.storage.getScore() / parseInt(this.$.valueField.getValue()));
  str += " minutes)";
  this.$.scoreLabel.setContent(str);
},

startTimer: function() {
  var time_left = this.$.storage.getScore() / parseInt(this.$.valueField.getValue());
  if (time_left > 0) {
    var hours = Math.floor(time_left / 60);
    var minutes = Math.floor(time_left) % 60;
    var seconds = Math.floor((time_left % 1) * 60);
    if (hours < 10) { hours = "0" + hours.toString() }
    if (minutes < 10) { minutes = "0" + minutes.toString() }
    if (seconds < 10) { seconds = "0" + seconds.toString() }
    var str = hours + ":" + minutes + ":" + seconds;
    enyo.log("set timer to " + str);
    this.$.alarmService.call({
      "key": enyo.fetchAppId()+".timer",
      "in": str,
      "uri": "palm://com.palm.applicationManager/launch",
      "params": {"id": enyo.fetchAppId(), "params": {"action": "alarm"}}},
      {"method": "set"});
  }
},

stopTimer: function() {
  this.$.alarmService.call({"key": enyo.fetchAppId()+".timer"}, {"method": "clear"});
},

relaunchHandler: function(inSender, inEvent) {
  enyo.log("relaunchHandler called");
  if (enyo.windowParams.action == "alarm") {
      enyo.log("relaunchHandler alarm");
      this.$.storage.reduceScore(this.$.storage.getScore());
      this.setScore();
      this.outOfPointsHandler();
      this.time_passed = new Date();
  }
},

windowDeactivatedHandler: function(inSender, inEvent) {
  enyo.log("Window deactivated");
  if (this.$.timerButton.depressed == true) {
    this.unloadTime = new Date();
    clearInterval(this.timer);
    this.startTimer();
  }
},

windowActivatedHandler: function(inSender, inEvent) {
  enyo.log("activated");
  this.stopTimer();
  if (this.$.timerButton.depressed == true) {
    var time_passed = new Date() - this.unloadTime;
    time_passed = parseInt(time_passed/60000);
    enyo.log("time_passed" + time_passed);
    if (time_passed > 0) {
      this.onceButtonClicked(time_passed);
    }
    this.timer = setInterval(enyo.bind(this, this.onceButtonClicked), 60000);
  }
}

});
